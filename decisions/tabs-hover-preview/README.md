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

## Media (30 Oct 2026): the case-study boards, in story order

Each board is one step: a title, a plain-language lead, titled columns where there is a before and
after, numbered notes that name tabs as tab "Name", and a legend. They are written for a reader who
is not a designer, and the Seed is introduced only after the ideas it came from.

| File | Step |
|---|---|
| `01-the-moment-before-a-click.png` | The problem: pointing at a tab only darkens its name |
| `02-ideas-from-other-fields.png` | Six of the sixteen ideas, each sketched on the same three tabs, with the field it came from |
| `03-meet-the-seed.png` | The Seed: how it differs from the underline, and in the real component |
| `04-how-the-seed-was-chosen.png` | The checklist and its weights, and the round-2 scores |
| `05-testing-every-situation.png` | Every situation tested, first result and after the fixes |
| `06-a-bug-in-plain-sight.png` | The 2px underline that drew 1px, 8 times larger (fixed in #29) |
| `07-high-contrast-mode.png` | Windows high-contrast mode, before and after (fixed in #29) |
| `08-short-tab-names.png` | Tab "IP": the 24px minimum |
| `09-easier-to-see.png` | The Seed after the clip fix: twice the visible pixels |
| `10-clicking-a-far-tab.png` | A against B, clicking tab "Sessions" eight tabs away, paused at the same moments |
| `11-clicking-a-near-tab.png` | The same, clicking tab "Assets" two tabs away |
| `12-tried-and-set-aside.png` | Glide and the Hybrid: what they were, and why they were set aside |
| `13-the-decision.png` | Round 3 scores and the decision: A, grow in place |
| `14-first-seed-prototype.mp4` | The first Seed prototype (29 Oct) |
| `15-compare-slow.mp4` | A, B and Hybrid running the same pointer moves, stacked, at ×5 slow motion |
| `16-compare-real.mp4` | The same at real speed |
| `17-compare-narrow.mp4` | At phone width, with the open tab scrolled out of view |

The "before" frames come from the prototype at `7aff3b0`, on the Tabs as they were before #29. The
"after" frames come from the prototype head. The click frames are paused with the Web Animations API
at the same moments (25ms and 70ms) for both A and B.
