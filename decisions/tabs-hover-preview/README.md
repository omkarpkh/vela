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
| `02-ideas-from-other-fields.png` | Six ideas from two rounds, each sketched on the same three tabs, with its source, its score and the checklist line it lost on |
| `03-meet-the-seed.png` | The Seed: how it differs from the underline, and in the real component |
| `04-how-the-seed-was-chosen.png` | The final checklist and its weights; first-round and final-round scores |
| `05-testing-every-situation.png` | Every situation tested, first result and now; a new group for too many tabs, which the first test missed |
| `05b-too-many-tabs.png` | What the first test missed: hidden tabs with no sign, the Seed on a tab cut off at the edge, the open tab scrolled away |
| `05c-how-others-handle-too-many-tabs.png` | Fourteen design systems: five strategies for too many tabs, the shared rule (the open tab is never hidden), and eight questions for how the Seed behaves in overflow |
| `05d-ideas-for-too-many-tabs.png` | The ideas round for too many tabs: three strategies (whole tabs with a More that becomes the tab; honest scrolling; a form ladder), each sketched, and six answers that hold in all of them |
| `05e-two-ways-to-keep-the-row-steady.png` | The two leading directions for too many tabs (M4, M5), what they share, where they differ, and the trade-off |
| `05f-keeping-the-row-elegant.png` | M5 refined: the count and news move into the control's label; the row keeps today's two marks |
| `05g-the-more-control-up-close.png` | The "6 more" control and its list, rendered from Vela's own CSS: spacing, every state, the still chevron, two contrast findings |
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
