# Tabs hover preview: evidence (not decided yet)

**Not a decision record yet.** Records are written when the decision is taken (see `../README.md`).
This folder collects the evidence for the one that will be: the Tabs hover preview (the Seed) and
how a press behaves (A, B or the Hybrid). Once the owner decides, the record is written here and the
folder is numbered.

The working notes are in the claude.ai Project, under `motion/`:
- `tabs-hover-evaluation.md` and `tabs-hover-evaluation-round2.md`
- `tabs-hover-semiotics.md`
- `tabs-hover-state-sweep.md`
- `tabs-hover-evaluation-round3.md`
- `tabs-hover-hybrid-ideation.md`

The prototype is `demo/pages/motion/TabsPreviewProto.tsx` (the Motion page, "Tabs hover preview").

## Media (30 Oct 2026)

| File | What it shows |
|---|---|
| `01-origin.png` | Where it started: hovering a tab only darkened its label |
| `02-underline-1px-2px.png` | The shipped 2px underline rendered 1px (clipped by the scrolling list), and the fix (#29) |
| `03-high-contrast.png` | Forced colours: every tab looked selected; after #29 only the selected tab is marked |
| `04-seed-visibility.png` | The Seed before and after the clip fix: two pixel rows instead of one |
| `05-short-label.png` | The 24px floor: a 13px "IP" tab gets a real mark |
| `06-glide-linger.png` | Glide's out-delay: the Seed no longer stays under a tab the pointer has left |
| `07-scores.png` | Round 2 and round 3 scores (the same rubric, mean of two passes) |
| `08-hybrid-explain.png` | The Hybrid's near zone and caption (the prototype's Explain layer) |
| `09-first-seed-prototype.mp4` | The first Seed prototype (29 Oct) |
| `10-compare-slow.mp4` | A, B and Hybrid running the same pointer moves, stacked, ×5 slow: near press, far press, moving along the row, pausing between tabs |
| `11-compare-real.mp4` | The same at real speed, each played twice |
| `12-compare-narrow.mp4` | Phone width, the selected tab scrolled out of view, slow then real speed |

The before images come from the prototype at `7aff3b0` (on the Tabs before #29). The after images
come from the prototype head.
