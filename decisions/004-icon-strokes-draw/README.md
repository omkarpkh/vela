# Icon strokes may draw

**Decided 30 October 2026. Motion rule 1 gains one exception: an icon glyph's own strokes may draw
on and off with `stroke-dashoffset`, inside a `.vela-icon`, by transition only, on the one glyph a
person just acted on. `scripts/check-css.mjs` enforces the parts CSS can show; the rest are
browser-level rules in the owning component's spec. The option that scored highest, S5, is the one
decided, by one point in 85. The rule and the checks are in Unreleased; no component uses the
exception yet.**

The prototypes, the scoring and the timing harness are not in this repository. They are in the
icon, repo and spec threads' documents in the claude.ai Project:
`requests/icon-thread-to-repo-rule1-icon-strokes.md`, `requests/repo-thread-answers-I1-rule1.md`,
`requests/icon-thread-answers-repo-I1-rule1.md`, `specs/copy-button.md` and
`specs/disclosure-chevron.md`.

---

## What started it

Two glyphs being specced, the copy button's mark and the disclosure chevron, morph when a person
acts on them: one shape becomes another, as the same mark changing state (motion's "continuity").
Drawn with strokes, that is a stroke shortening while another lengthens, which is
`stroke-dashoffset`.

Rule 1 said only `transform`, `opacity` and `filter` animate, and `css:check` failed anything else.
The reason the rule gives is that those properties composite without repainting. Inside an SVG
that reason does not hold anyway (see the measurements), so the question became what an exception
would cost and how to keep it from spreading to lines, borders and charts.

## What was considered

| Option | What it is | Score (of 85) |
|---|---|---|
| S4 | Keep rule 1 as written. Rebuild the morph from about 42 parts that move only by `transform` and `opacity`, which leaves faint beads where the pieces overlap | 76.5 (90.0%) |
| **S5 (decided)** | Draw the strokes with `stroke-dashoffset`, under a guarded exception to rule 1 | **77.5 (91.2%)** |

The rubric and its criteria are in the Project documents named above, not reproduced here. The
record holds no score for not animating the glyph at all; the threads compared S4 and S5.

## The measurements

Frame timing of the two techniques side by side: Chromium 1243, headless, software rendering; 16px
icons; twelve runs per row, the first two discarded; the figures are medians of the other ten.
"4× slower" is CPU throttling.

| Glyphs at once | CPU | transform/opacity: worst frame · frames >20ms | dashoffset: worst frame · frames >20ms |
|---|---|---|---|
| 1 | 1× | 16.8ms · 0 | 16.8ms · 0 |
| 1 | 4× slower | 16.8ms · 0 | 16.8ms · 0 |
| 20 | 1× | 16.7ms · 0 | 16.8ms · 0 |
| 20 | 4× slower | 16.8ms · 0 | 33.4ms · 1.5 |
| 100 | 1× | 33.4ms · 2 | 58.3ms · 6 |
| 100 | 4× slower | 66.7ms · 4 | 125ms · 3 |

For one glyph the two are the same at both CPU speeds. The difference appears at twenty glyphs on
a slow CPU and grows at a hundred, which is why the exception is limited to the one glyph a person
just acted on.

**Also found:** in Chromium, transform-only SVG children repaint too, at about 2ms per frame. So
rule 1's "composite without repainting" reason doesn't hold inside an SVG anyway.

**Not measured:** frame cost in WebKit and Firefox, and on real hardware. Omkar's Safari checks of
the copy morph and the chevron were visual only: they show the morph looks right in Safari, not
what it costs there.

## Why the alternatives lost

**S4** keeps the rule intact, at the price of about 42 parts for one morph and faint beads where
the pieces overlap. It scored one point lower than S5 (76.5 against 77.5 of 85). The measurements
also took away the case that it is cheaper to render: inside an SVG, transform-only children
repaint as well, and for a single glyph the two techniques time the same.

## What was decided

As the changelog states it:

- **Motion rule 1 gains the icon-stroke exception** (`guidelines/foundations/motion.md`). Its
  guards:

  | Guard | Why |
  |---|---|
  | Inside `.vela-icon` only | Keeps the exception to 12–20px glyphs; lines, borders and charts can't use it |
  | Transitions only, never `@keyframes` | Rule 3; the morph retargets mid-flight |
  | `stroke-dashoffset` only | dasharray and `pathLength` stay static |
  | The dash gap is at least the path's length | `1 1` wraps and draws a dot at the far end |
  | Fully retracted means `opacity: 0` too | A zero-length round-cap dash renders a dot (Chromium) |
  | One glyph at a time | Cost grows with the number of glyphs drawing |

- **`css:check` enforces the first three.** It accepts `stroke-dashoffset` in a transition only
  under a selector in which every element matched sits inside `.vela-icon`; anywhere else it fails
  with "transitions stroke-dashoffset — only an icon glyph's strokes may draw (inside .vela-icon)",
  and inside `@keyframes` it fails as before. `stroke-dasharray` still fails. Inside `.vela-icon`
  a bare length is accepted in `transform-origin` and inside `translate()`, where it is a unit of
  the 24-unit grid; every other property is checked as before.
- **The two guards CSS can't check** — the dash gap, and fully retracted meaning `opacity: 0` —
  are proved by browser-level (Playwright) rules in the owning component's spec, for example
  `copy-button-strokes-retract-clean`. "One glyph at a time" is a convention, held in review.

Agreed at the same time, and shipped with it:

- **The dwell line** in motion.md: a dwell (a wait before something appears) is not motion and
  survives reduced motion; a delay that staggers the parts of one movement collapses with its
  durations, in the component's own reduced-motion rules. Under reduced motion a decorative hover
  pose is removed, not snapped. `base.css` is unchanged.
- **The tap highlight.** A control with its own press response sets
  `-webkit-tap-highlight-color: transparent` in its own stylesheet, after any `all: unset`, and
  never on `.vela-root`. `css:check` fails a stylesheet that styles `[data-vela-pressed]` without
  it. Today that is Button.

## Still open

- **Frame cost outside Chromium.** WebKit and Firefox were not timed, and nothing was timed on real
  hardware. Checkable by running the same harness in both engines and on a real device.
- **The two browser-level guards have no proof yet.** No component in the repository uses the
  exception, so `copy-button-strokes-retract-clean` and its kind arrive with the copy button and the
  chevron. Until then the guards are words.
- **"One glyph at a time" is not checked by a tool.** It holds while each drawing glyph answers one
  person's one action. The 20- and 100-glyph rows above say what breaking it costs in Chromium.
