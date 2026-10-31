# Tabs hover preview: the Seed

**Decided 30 October 2026. A pointer resting on an unselected tab shows the Seed: a short,
soft-ended bar under it, a third of the tab at 55% strength. A press grows that bar into the
underline where it is (option A), and the Seed fades between tabs rather than gliding. Shipped in
0.14.0, which Omkar approved for release. Round 3 scored A · Fade and B · Fade as a tie, 0.5
points in 85 apart, so A is a judgement of feel, not a score.**

The prototype is not in `main`. It is on the branch `proto/tabs-hover-seed` (PR #28, closed and not
merged): `demo/pages/motion/TabsPreviewProto.tsx`, `demo/pages/motion/tabs-preview-proto.css` and
`tests/e2e/tabs-preview-proto.spec.ts`. Run it with `npm run demo` on that branch and open
`#/motion`. The ideation, sweep and scoring are in the claude.ai Project, not reproduced here:
`motion/tabs-hover-evaluation-round2.md`, `motion/tabs-hover-semiotics.md`,
`motion/tabs-hover-state-sweep.md`, `motion/tabs-hover-evaluation-round3.md` and
`motion/tabs-hover-hybrid-ideation.md`. No recordings were made.

---

## What started it

Tabs had no hover state beyond the label darkening. A person about to switch tabs couldn't see,
before pressing, where the underline would land, and the shipped press slid one list-wide bar
across the row, which at a distance or with the selected tab scrolled away arrived from
somewhere the person wasn't looking.

## What was considered

Round 1 compared a dashed preview (M) with the underline leaning towards the hovered tab (L);
they finished 0.5 points apart. Omkar then ruled out L, because the lean starts at the active tab
and fails at a distance, and asked for M to be subtle rather than dashed. An ideation round added
three more. Round 2 scored five, on a rubric fixed before scoring, with anchored levels, two
independent passes and the mean (maximum 85):

| Candidate | What it is | Mean | % |
|---|---|:-:|:-:|
| **Seed** | A short centred line, a third of the tab, soft ends, after a rest | **77.0** | **90.6** |
| M1 feathered hairline | A full-width 1px line at about 40%, faded ends | 65.5 | 77.1 |
| K2 crop marks | Two ticks at the ends of the tab's baseline | 63.0 | 74.1 |
| M dashed | A dashed line under the tab | 60.0 | 70.6 |
| L lean | The active underline leans towards the hovered tab | 46.0 | 54.1 |

The criteria: target certainty at any distance (3×), hover and selection told apart without hue
(3×), a quiet sweep (2×), the promise kept by the press (2×), noticeable without effort (2×), calm
confidence (2×), build fit (1×) and inclusive parity (2×).

The prototype then built the Seed in four ways, with the hairline as the control. The press was
either **A, grow in place** or **B, land on the marker** (the shipped travel), and between tabs the
Seed either **faded** or **glided**. Round 3 rescored them after the state sweep and its fixes:

| Concept | Pass 1 | Pass 2 | Mean | % |
|---|:-:|:-:|:-:|:-:|
| **A · Fade (shipped)** | 81 | 79 | **80.0** | **94.1** |
| B · Fade | 80 | 79 | 79.5 | 93.5 |
| A · Glide | 75 | 75 | 75.0 | 88.2 |
| B · Glide | 74 | 73 | 73.5 | 86.5 |
| Hairline | 71 | 71 | 71.0 | 83.5 |

The leader changed between passes, and the gap is under the 10% gate, so A against B was treated
as a tie and left to Omkar's judgement of feel on screen. Fade led Glide by 5 to 6.5 points in
both, in both passes.

## The measurements

All in Chromium on 30 October 2026, with Playwright scripts against the running prototype. Each
figure is a single run unless it says otherwise.

- **Visibility:** pixels changed in the strip under the tab before and after a rest. At 55%, the
  Seed lit 23 × 2px at 2.5:1 against the page; the hairline lit 58 × 1px at 1.9:1. At 40% the
  Seed was 1.9:1. Contrast is calculated, and the measured value was within 0.05.
- **The shipped underline rendered 1px, not 2px,** because the scroll container clipped its
  lower pixel. Fixed in #29; the fix doubled the Seed's lit pixels at the same strength (46
  against 19).
- **The sweep:** 21 conditions per concept, from a fast sweep across nine tabs to a 320px row
  scrolling in both directions, 200% zoom, reduced motion and forced colours. Before the fixes the
  concepts had 0 to 4 gaps each; after them, none had a gap of its own.
- **Forced colours:** Chromium's emulation only, with the default palettes. The Seed is a 1px
  `CanvasText` line at 21:1, so it can't be mistaken for the selection's `Highlight`.

## Why the alternatives lost

**L, the lean,** fails at a distance and off screen, because the cue starts at the active tab,
and magnifier users don't see it.

**M, dashed,** is busy, both while sweeping and at rest.

**K2, crop marks,** was the most elegant at rest and the easiest to miss.

**M1, the hairline,** passed every sweep cell, short labels included. It lost on character: a 1px
line under the rule reads as a thicker rule, and against the selection it differs only in weight.

**Glide** follows the pointer, which is livelier than a console used all day needs. Before its fix
it also left the Seed under a tab the pointer had left, and it needs a controller with three
timers and a scroll listener.

**B, land on the marker,** tied with A. It keeps the shipped travel, and with it the case A was
built for: when the selected tab is far away or scrolled out of view, the underline crosses the
whole row or arrives from off screen. A grows the preview itself into the underline, so the
result is the preview. The cost is that A draws the selected underline itself, so it had to prove
the travelling bar's four browser rules again (they became `tabs-press-*` and
`tabs-underline-rest-is-the-border`).

**Dawn bloom,** a faint glow rising from the Seed, had no failures and was left out as a matter
of taste: more cues would trade calm for spectacle on one of the most-used controls.

## What shipped

In 0.14.0, as the changelog states it:
- **The Seed:** after `--vela-delay-preview` (80ms) at rest on an unselected, enabled tab, a
  soft-ended bar fades in under it in the underline's 2px slot, in `--vela-border-active` at
  `--vela-opacity-preview` (0.55). It is a third of the tab, never under
  `--vela-tab-preview-width-min` (24px), never wider than the tab.
  - It fades in over `--vela-duration-travel` on `--vela-ease-out`, and leaves at
    `--vela-duration-base` with no delay, so a sweep shows nothing.
  - Never on the selected or a disabled tab, never from the keyboard, never on touch.
  - In forced colours it is a 1px `CanvasText` line.
- **The press grows in place:** the pressed tab's Seed grows into the full underline on
  `--vela-ease-spring`, and the old underline shrinks back and fades. Keyboard switches stay
  instant, and reduced motion lands at the end state.
- **Rules:** `tabs-preview-rest-delay`, `tabs-preview-never-selected-or-disabled`,
  `tabs-preview-pointer-only`, `tabs-preview-size` and `tabs-preview-forced-colours` (browser),
  and `tabs-preview-decorative` (runtime).
- **No contrast pair:** the Seed is 2.46:1 on the page in light, under 3:1 on purpose. It is a
  supplementary hover hint, and the label also darkens. The spec and `scripts/contrast-core.mjs`
  say why.

## Found on the way past, and fixed

- **The selected underline rendered 1px:** #29.
- **In forced colours, every tab drew an underline,** so the selection was lost: #29.
- **The Seed was 4px on a 13px tab,** which led to the 24px floor.

## Still open

1. **Omkar's hybrid:** B when the pressed tab is near and both tabs are in view, A when it is far
   away (`motion/tabs-hover-hybrid-ideation.md`). The idea round is done; it is not prototyped or
   scored.
2. **A real Windows contrast theme, and Firefox.** Forced colours were checked in Chromium's
   emulation only.
3. **The 80ms rest, the 180ms out-delay and the 24px floor** come from research and other systems
   (Material's 24dp indicator minimum, NN/g on hover timing), not from watching people use them.
4. **The Seed's tokens in Figma:** the library held them back for a later update. The 0.14.0
   publish description says so.
