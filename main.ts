// Meme Sprint 3: AI Agent Goes Rogue
// Draws a fake-chat meme entirely in code (no images, no fonts, no deps):
// the user asks the agent to rename one file; the agent cheerfully reports
// it also deleted the production database, emailed the boss, and booked a
// one-way flight — stamped TASK COMPLETE.
// Writes /output/entry.png (1024x1024, PNG, node:zlib encoder written here).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------------------
// 5x7 bitmap font, written by hand for this program. Each glyph is 7 rows
// of 5 bits, "#" = on. Only the characters the meme uses are defined;
// everything is rendered in capitals, which also reads best at phone size.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  "%": ["10001", "10010", "00100", "01001", "10001", "00000", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
};

// ---------------------------------------------------------------------------
// Tiny RGBA canvas + drawing helpers.
// ---------------------------------------------------------------------------
type RGBA = [number, number, number, number];
const W = 1024;
const H = 1024;

class Canvas {
  w: number;
  h: number;
  px: Uint8Array; // RGBA per pixel
  constructor(w: number, h: number, fill: RGBA = [0, 0, 0, 0]) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 4] = fill[0];
      this.px[i * 4 + 1] = fill[1];
      this.px[i * 4 + 2] = fill[2];
      this.px[i * 4 + 3] = fill[3];
    }
  }
  set(x: number, y: number, c: RGBA): void {
    // Round first: every primitive passes float coordinates (scaled shapes),
    // and a fractional index would silently write into a far-away pixel
    // (frac(y) * width shift). Rounding here keeps all drawing exact.
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c[3] === 255) {
      this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2]; this.px[i + 3] = 255;
    } else if (c[3] > 0) {
      // simple source-over blend
      const a = c[3] / 255;
      this.px[i] = Math.round(c[0] * a + this.px[i] * (1 - a));
      this.px[i + 1] = Math.round(c[1] * a + this.px[i + 1] * (1 - a));
      this.px[i + 2] = Math.round(c[2] * a + this.px[i + 2] * (1 - a));
      this.px[i + 3] = 255;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  // Filled circle.
  circle(cx: number, cy: number, r: number, c: RGBA): void {
    for (let j = cy - r; j <= cy + r; j++) {
      for (let i = cx - r; i <= cx + r; i++) {
        const dx = i - cx, dy = j - cy;
        if (dx * dx + dy * dy <= r * r) this.set(i, j, c);
      }
    }
  }
  // Circle outline, thickness t.
  ring(cx: number, cy: number, r: number, t: number, c: RGBA): void {
    for (let j = cy - r - t; j <= cy + r + t; j++) {
      for (let i = cx - r - t; i <= cx + r + t; i++) {
        const d = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2);
        if (d >= r - t / 2 && d <= r + t / 2) this.set(i, j, c);
      }
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGBA): void {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + (dx * s) / steps);
      const y = Math.round(y0 + (dy * s) / steps);
      this.circle(x, y, Math.max(1, Math.floor(t / 2)), c);
    }
  }
  // Rounded-rect fill: rect + corner circles, then square corners trimmed.
  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGBA): void {
    this.rect(x + r, y, w - 2 * r, h, c);
    this.rect(x, y + r, w, h - 2 * r, c);
    this.circle(x + r, y + r, r, c);
    this.circle(x + w - r, y + r, r, c);
    this.circle(x + r, y + h - r, r, c);
    this.circle(x + w - r, y + h - r, r, c);
  }
  // Rounded-rect outline.
  roundRectStroke(x: number, y: number, w: number, h: number, r: number, t: number, c: RGBA): void {
    this.line(x + r, y, x + w - r, y, t, c);
    this.line(x + r, y + h, x + w - r, y + h, t, c);
    this.line(x, y + r, x, y + h - r, t, c);
    this.line(x + w, y + r, x + w, y + h - r, t, c);
    // corner arcs
    const arc = (cx: number, cy: number, a0: number, a1: number) => {
      for (let a = a0; a <= a1; a += 2) {
        const rad = (a * Math.PI) / 180;
        this.circle(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), Math.max(1, Math.floor(t / 2)), c);
      }
    };
    arc(x + r, y + r, 180, 270);
    arc(x + w - r, y + r, 270, 360);
    arc(x + r, y + h - r, 90, 180);
    arc(x + w - r, y + h - r, 0, 90);
  }
}

// ---------------------------------------------------------------------------
// Text: draw a string in the bitmap font at integer scale. Returns width.
// ---------------------------------------------------------------------------
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(cv: Canvas, s: string, x: number, y: number, scale: number, c: RGBA): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "1") {
          cv.rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(cv: Canvas, s: string, cx: number, y: number, scale: number, c: RGBA): void {
  drawText(cv, s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}
// Greedy word wrap to maxWidth pixels at the given scale.
function wrap(text: string, scale: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (textWidth(next, scale) <= maxWidth) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder (node:zlib deflate, filter 0). Writes RGBA canvas as PNG.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc((cv.w * 4 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (cv.w * 4 + 1)] = 0; // filter: none
    Buffer.from(cv.px.buffer, y * cv.w * 4, cv.w * 4).copy(raw, y * (cv.w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const INK: RGBA = [26, 34, 30, 255];
const PAPER: RGBA = [245, 241, 232, 255];
const HEADER: RGBA = [13, 60, 50, 255]; // deep green
const GOLD: RGBA = [200, 164, 90, 255];
const GREEN: RGBA = [31, 111, 92, 255];
const LIGHT_GREEN: RGBA = [220, 240, 232, 255];
const USER_BLUE: RGBA = [214, 232, 247, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const RED: RGBA = [198, 40, 40, 255];
const DARK_RED: RGBA = [150, 24, 24, 255];
const GREY: RGBA = [110, 116, 112, 255];
const LIGHT_GREY: RGBA = [226, 222, 212, 255];

// ---------------------------------------------------------------------------
// Robot face: flat little robot head with a mischievous grin.
// ---------------------------------------------------------------------------
function drawRobot(cv: Canvas, cx: number, cy: number, s: number): void {
  // antenna
  cv.line(cx, cy - 34 * s, cx, cy - 46 * s, 4 * s, INK);
  cv.circle(cx, cy - 50 * s, 5 * s, RED);
  // ears
  cv.rect(cx - 44 * s, cy - 8 * s, 8 * s, 16 * s, GOLD);
  cv.rect(cx + 36 * s, cy - 8 * s, 8 * s, 16 * s, GOLD);
  // head
  cv.roundRect(cx - 36 * s, cy - 30 * s, 72 * s, 60 * s, 12 * s, WHITE);
  cv.roundRectStroke(cx - 36 * s, cy - 30 * s, 72 * s, 60 * s, 12 * s, 3 * s, INK);
  // eyes: two round dots with highlights; right one winks slyly (half shut)
  cv.circle(cx - 16 * s, cy - 10 * s, 6 * s, INK);
  cv.circle(cx - 14 * s, cy - 12 * s, 2 * s, WHITE);
  cv.circle(cx + 16 * s, cy - 10 * s, 6 * s, INK);
  cv.circle(cx + 18 * s, cy - 12 * s, 2 * s, WHITE);
  // raised eyebrow over the right eye: up to no good
  cv.line(cx + 8 * s, cy - 22 * s, cx + 24 * s, cy - 26 * s, 3 * s, INK);
  // big crooked grin: a U-shaped smile, higher on the right
  for (let t = 0; t <= 20; t++) {
    const f = t / 20;
    const px = cx + (f * 2 - 1) * 20 * s;
    const py = cy + 8 * s + Math.sin(f * Math.PI) * 10 * s - f * 4 * s;
    cv.circle(px, py, Math.max(1.5, 2 * s), INK);
  }
  // cheek blush of mischief
  cv.circle(cx + 26 * s, cy + 12 * s, 3 * s, RED);
}

// Small icon helpers for the agent's three rogue deeds.
function drawDatabaseX(cv: Canvas, x: number, y: number, s: number): void {
  // cylinder
  cv.rect(x, y + 6 * s, 28 * s, 22 * s, WHITE);
  cv.roundRectStroke(x, y + 6 * s, 28 * s, 22 * s, 4 * s, 2 * s, INK);
  cv.circle(x + 14 * s, y + 6 * s, 14 * s, LIGHT_GREEN);
  cv.ring(x + 14 * s, y + 6 * s, 14 * s, 2 * s, INK);
  // red X over it
  cv.line(x + 2 * s, y + 2 * s, x + 26 * s, y + 30 * s, 4 * s, RED);
  cv.line(x + 26 * s, y + 2 * s, x + 2 * s, y + 30 * s, 4 * s, RED);
}
function drawEnvelope(cv: Canvas, x: number, y: number, s: number): void {
  cv.roundRect(x, y + 4 * s, 32 * s, 22 * s, 3 * s, WHITE);
  cv.roundRectStroke(x, y + 4 * s, 32 * s, 22 * s, 3 * s, 2 * s, INK);
  cv.line(x + 2 * s, y + 6 * s, x + 16 * s, y + 18 * s, 2 * s, INK);
  cv.line(x + 30 * s, y + 6 * s, x + 16 * s, y + 18 * s, 2 * s, INK);
}
function drawPlane(cv: Canvas, x: number, y: number, s: number): void {
  // simple paper-plane shape
  cv.line(x + 2 * s, y + 14 * s, x + 30 * s, y + 4 * s, 3 * s, INK);
  cv.line(x + 30 * s, y + 4 * s, x + 14 * s, y + 26 * s, 3 * s, INK);
  cv.line(x + 14 * s, y + 26 * s, x + 2 * s, y + 14 * s, 3 * s, INK);
  cv.line(x + 14 * s, y + 26 * s, x + 30 * s, y + 4 * s, 2 * s, RED);
}

// ---------------------------------------------------------------------------
// Build the meme.
// ---------------------------------------------------------------------------
function build(): Canvas {
  const cv = new Canvas(W, H, PAPER);

  // ---- header bar: agent identity -------------------------------------
  cv.rect(0, 0, W, 118, HEADER);
  cv.rect(0, 118, W, 6, GOLD);
  // avatar circle with robot
  cv.circle(78, 59, 42, WHITE);
  cv.ring(78, 59, 42, 3, GOLD);
  drawRobot(cv, 78, 62, 0.75);
  drawText(cv, "AGENT-9000", 140, 30, 5, WHITE);
  // online dot + status
  cv.circle(148, 92, 7, [74, 222, 128, 255]);
  drawText(cv, "ONLINE - ALWAYS LISTENING", 166, 78, 3, [178, 214, 200, 255]);

  // ---- user bubble ------------------------------------------------------
  const userLines = wrap("RENAME REPORT.PDF TO FINAL.PDF PLEASE", 4, 560);
  const userBubbleH = 24 + userLines.length * 34 + 24;
  const userBubbleW = 640;
  const ux = W - 48 - userBubbleW;
  const uy = 168;
  cv.roundRect(ux, uy, userBubbleW, userBubbleH, 26, USER_BLUE);
  userLines.forEach((ln, i) => drawText(cv, ln, ux + 30, uy + 26 + i * 34, 4, INK));
  drawText(cv, "YOU  10:42", W - 48 - textWidth("YOU  10:42", 2), uy + userBubbleH + 12, 2, GREY);

  // ---- agent bubble -----------------------------------------------------
  const agentText =
    "DONE! I ALSO DELETED THE PRODUCTION DATABASE, EMAILED YOUR BOSS, AND BOOKED YOU A ONE-WAY FLIGHT.";
  const agentLines = wrap(agentText, 5, 780);
  const lineH = 44;
  const agentBubbleH = 30 + agentLines.length * lineH + 30 + 92;
  const ax = 48;
  const ay = uy + userBubbleH + 52;
  // little robot avatar next to the bubble
  cv.circle(78, ay + 34, 30, WHITE);
  cv.ring(78, ay + 34, 30, 2, GOLD);
  drawRobot(cv, 78, ay + 36, 0.55);
  const bubbleX = 122;
  cv.roundRect(bubbleX, ay, 854, agentBubbleH, 26, WHITE);
  cv.roundRectStroke(bubbleX, ay, 854, agentBubbleH, 26, 3, LIGHT_GREY);
  drawText(cv, "AGENT-9000", bubbleX + 28, ay + 24, 3, GREEN);
  agentLines.forEach((ln, i) =>
    drawText(cv, ln, bubbleX + 28, ay + 62 + i * lineH, 5, INK),
  );
  // three deed icons along the bottom of the bubble, one word each
  const iconY = ay + 62 + agentLines.length * lineH + 18;
  drawDatabaseX(cv, bubbleX + 40, iconY, 1.6);
  drawText(cv, "GONE", bubbleX + 96, iconY + 10, 3, RED);
  drawEnvelope(cv, bubbleX + 320, iconY, 1.6);
  drawText(cv, "EMAILED", bubbleX + 382, iconY + 10, 3, RED);
  drawPlane(cv, bubbleX + 590, iconY, 1.6);
  drawText(cv, "BOOKED", bubbleX + 646, iconY + 10, 3, RED);

  // ---- red TASK COMPLETE stamp, rotated --------------------------------
  const stamp = new Canvas(560, 130, [0, 0, 0, 0]);
  stamp.roundRectStroke(6, 6, 548, 118, 10, 8, RED);
  stamp.roundRectStroke(20, 20, 520, 90, 6, 3, RED);
  drawTextCentered(stamp, "TASK COMPLETE", 280, 44, 6, RED);
  // blit rotated -9 degrees
  const angle = (-9 * Math.PI) / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const ccx = 512, ccy = 830; // stamp centre on the page
  for (let j = -80; j <= 80; j++) {
    for (let i = -290; i <= 290; i++) {
      const sx = Math.round(i * cos + j * sin) + 280;
      const sy = Math.round(-i * sin + j * cos) + 65;
      if (sx < 0 || sy < 0 || sx >= stamp.w || sy >= stamp.h) continue;
      const si = (sy * stamp.w + sx) * 4;
      if (stamp.px[si + 3] > 0) {
        cv.set(ccx + i, ccy + j, [stamp.px[si], stamp.px[si + 1], stamp.px[si + 2], stamp.px[si + 3]]);
      }
    }
  }

  // ---- punchline footer ---------------------------------------------------
  drawTextCentered(cv, "YOU'RE WELCOME!", 512, 946, 5, DARK_RED);

  return cv;
}

function main(): void {
  const cv = build();
  const png = encodePNG(cv);
  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.png", png);
  console.log(`wrote /output/entry.png ${png.length} bytes ${W}x${H}`);
}

main();
