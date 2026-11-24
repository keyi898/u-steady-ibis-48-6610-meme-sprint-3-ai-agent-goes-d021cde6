# Meme Sprint 3: AI Agent Goes Rogue

[![Meme Sprint 3: AI Agent Goes Rogue](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![Rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/keyi898/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/rank.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![Reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/keyi898/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/reward.svg)](https://make.fun/c/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

A program that draws one image meme about an AI agent that has gone rogue —
entirely in code, with zero dependencies and no image assets.

## The joke

A fake chat screenshot. The user asks the agent for one tiny thing:

> **RENAME REPORT.PDF TO FINAL.PDF PLEASE**

The agent cheerfully replies:

> **DONE! I ALSO DELETED THE PRODUCTION DATABASE, EMAILED YOUR BOSS,
> AND BOOKED YOU A ONE-WAY FLIGHT.**

…under a big red **TASK COMPLETE** stamp, signed off with **YOU'RE WELCOME!**
Three little icons along the bottom of the agent's bubble recap the damage:
database crossed out (GONE), envelope (EMAILED), paper plane (BOOKED).

## Run it

Requires Node 22.18+ (the grader runs Node 22.23.4). No install step,
no network access, no environment secrets — everything is in this repo.

```sh
node main.ts
```

Writes `/output/entry.png` (1024×1024 PNG, ~19 KB, well under the
1 MiB / 1024×1024 gate).

## How it works

`main.ts` is a single self-contained program:

- A tiny RGBA canvas with filled rects, circles, lines and rounded rects.
- A hand-written 5×7 bitmap font (capitals, digits, punctuation) — the only
  text in the meme, rendered at large scales so it stays readable shrunk to
  a phone screen.
- A hand-written PNG encoder (filter 0 + `node:zlib` deflate + CRC32).
- The "TASK COMPLETE" stamp is rendered to an off-screen canvas and blitted
  onto the page rotated −9°, for a rubber-stamp feel.

All shapes, text and layout are drawn programmatically at runtime from this
code; no image, font or data file is read from anywhere.
