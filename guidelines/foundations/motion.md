# Motion

Vela animates for one of three reasons: feedback (your action registered), orientation (where
something came from or went), continuity (the same thing, changing state). If a movement's reason
cannot be named in one of those words, it does not ship.

## The frequency gate

| How often a person triggers it | What it gets |
|---|---|
| Hundreds of times a day — button press, tab switch, toggle | instant, or feedback under 200ms |
| Daily — a dialog, a panel, an alert appearing | subtle and fast: opacity, a few px of travel, a touch of blur |
| Rarely — onboarding, a first success | room for expression |
| From the keyboard | nothing animates — an instant state change, with no duration, still counts as still |

## Tokens

- `--vela-duration-instant` (70ms): a press landing. Under the ~85ms where a delay starts to
  read as lag, so contact and acknowledgement arrive together. Press-in only.
- `--vela-duration-fast` (120ms): anything else that answers a pointer.
- `--vela-duration-base` (180ms): anything that settles or appears.
- `--vela-duration-travel` (240ms): a change that crosses a distance — the Tabs underline growing
  in place under the tab that was pressed, and the Tabs hover preview fading in. The one step above
  `base`; still under 300ms, past which motion starts to feel like waiting.

Three curves, each for one kind of movement:

| Curve | Value | For |
|---|---|---|
| `--vela-ease-standard` | `cubic-bezier(0.2, 0, 0.2, 1)` | things that change or move while on screen: a hover colour, a press, a toggle knob. Never a bare `ease`. |
| `--vela-ease-out` | `cubic-bezier(0.25, 1, 0.5, 1)` | things that enter. |
| `--vela-ease-spring` | a spring: stiffness 1200, damping 56, mass 1 | the few moments a spec names — the Tabs underline growing in place after a pointer press, and the Toast stack moving back and spreading. Always with `--vela-duration-travel`. |

Why these values:

- **`ease-out`** starts at four times the average speed (its first control point is 0.25 across
  and 1 up), so on a 180ms entrance the first frame at 60Hz already covers about a third of the
  way; it is 93% there at half-time and arrives with zero velocity and no overshoot, so it needs no
  settle. The browser's own `ease-out` (`0, 0, 0.58, 1`) starts at under twice the average speed
  and reads as late. Stronger curves (an expo-like `0.16, 1, 0.3, 1`) finish visibly in half the
  stated time and spend the rest creeping by fractions of a pixel. This is the middle.
- **The spring** has a damping ratio of 0.81: it is 95% of the way in about 100ms, overshoots by
  1.3% of the change (under 1px on a 100px tab's underline) at about 155ms, and is within 0.2% of
  rest by 240ms. That one small settle is the "life" — the underline reaches full width, leans, and
  stops — without a wobble a console would not tolerate. The three physical values are the source in the token file;
  `scripts/spring.mjs` solves the spring and writes it as a CSS `linear()` easing, sampled every
  millisecond and reduced to the points the shape needs. Where `linear()` is not supported the
  token is `--vela-ease-out`, declared first, with the spring under
  `@supports (transition-timing-function: linear(0, 1))` in the token stylesheet — a component
  binds `var(--vela-ease-spring)` and needs no fallback of its own. Flutter receives the three
  values for its own `SpringDescription`; Figma receives the fallback curve and the values in the
  variable's description.

**These three — `duration-travel`, `ease-out`, `ease-spring` — are provisional until the owner has
reviewed their feel** on the playground's Motion review page (`#/motion`), which plays the Tabs
hover preview and press in both implementations, the Toast stack, Popover and Tooltip, and the
Checkbox, Radio Group and Toggle, each in both themes, with a Replay and a ×5 slow-motion switch that
reaches all of them. Tune by feel, then look again the next day.

- `--vela-delay-tooltip` (600ms): not an animation — how long the pointer rests on a control before
  its Tooltip opens, so a pointer crossing a toolbar does not flash every label. Keyboard focus does
  not wait. Equal to Base UI's own default, which applies when the stylesheet is not loaded.
- `--vela-delay-preview` (80ms): not an animation — how long the pointer rests on an unselected tab
  before its hover preview (the Seed) starts to appear, so a pointer sweeping across the row shows
  nothing. On the way in only: leaving starts at once. Like the Tooltip's delay it survives the
  reduced-motion collapse, which shortens durations, not delays.
- `--vela-duration-toast` (6000ms): not an animation either — how long a Toast that times out stays
  on screen (a `success` or `info` with no action; a warning, or a toast with an action, never times
  out). The timer pauses while the region is hovered or holds focus. The reduced-motion collapse
  never shortens it: it is a dwell, not a transition.

No component defines its own duration or curve. A new one is a token change, reviewed like a colour.

Overlays (Popover, Tooltip, Dialog, Toast) enter on `--vela-ease-out`. Popover and Tooltip grow from
their trigger: scale from 0.96 plus opacity, pivoting on the point Base UI computes nearest the
trigger (`--transform-origin`) — the Popover at `--vela-duration-base`, the Tooltip at
`--vela-duration-fast`, because it has already waited `--vela-delay-tooltip` for the pointer to rest.
A Dialog rises a `--vela-space-5` step as it fades in, at `base`. Popover, Tooltip and Dialog leave on
opacity alone — softer than they arrived. A toast travels its own height in from the edge it sits on
and leaves the same way, fading; the older toasts behind it step back and spread on the spring; a
swiped one carries on out from where the pointer left it. One opened or closed from the keyboard does
not animate at all.

The Dropdown List, built after this pass was written, still appears on `--vela-ease-standard` at
`--vela-duration-base`, with a `--vela-space-5` step of travel from its trigger, and leaves on
opacity alone (`dropdown-list.md`, Motion). Bringing it in line with Popover is still to do.

The small controls follow the same rules. A Checkbox mark and a Radio dot scale in from half size on
a change of state, at `fast` on `ease-out`, moved by the component that owns the state (an Icon never
animates by itself); the box, the circle and the Toggle track press to 0.9 the way a Button presses,
in at `instant`, out at `base`, with a guard that holds the hit target. From the keyboard none of it
moves.

In Figma they live in the **Motion** collection as Figma's own motion variable types: `duration/instant`,
`duration/fast` and `duration/base` are **timing** variables (Figma keeps timing in seconds, so 120ms is stored as
0.12) and `easing/standard` is an **easing** variable holding the same cubic-bezier, each carrying its
`var(--vela-*)` code syntax. A Figma Motion timeline animation can bind them, so a token change reaches
it on the next sync. A prototype transition still cannot: its duration is a typed number and its curve
a menu choice, so an interaction built in Figma copies these values by hand. The component description
the sync writes lists each moment from the spec's Motion table with its token and value, so the number
to type sits on the component itself.

## Rules

1. Only `transform`, `opacity` and `filter` animate. Never width, height, margin, padding or position.
   A colour may settle (a hover), which is a state, not movement. **One exception: an icon glyph's
   own strokes may draw on and off with `stroke-dashoffset`,** inside a `.vela-icon`, by transition
   only, on the one glyph a person just acted on. `stroke-dasharray` and `pathLength` are set, never
   animated, with the gap at least the path's length. A stroke that retracts fully also fades to
   `opacity: 0`, because a zero-length dash with round caps still paints a dot.
   `scripts/check-css.mjs` fails a component stylesheet whose transition or keyframes move anything
   else, and a bare duration (which transitions `all`).
   A `transform` that changes an element's size must not change where it can be clicked: scale the
   visual and hold the hit target, or the control moves out from under the pointer that is pressing it.
2. Pointer states enter faster than they leave (hover in at `fast`, out at `base`; press in at `instant`,
   out at `base`). Things that leave the screen exit more softly than they entered. The asymmetry is the
   point: arrival is information and wants to be immediate, release is resolution and can settle.
3. Transitions, not keyframes, for anything a person can re-trigger: transitions retarget mid-flight.
   No JavaScript animation loop either: a `requestAnimationFrame` animation runs on the main
   thread and drops frames when it is busy, and a CSS transition does not. The spring is a CSS
   easing for that reason.
4. Hover only where hover exists. Wrap hover rules in `@media (hover: hover)`; touch gets press feedback.
5. `prefers-reduced-motion` is handled once, globally, in `src/styles/base.css`: durations collapse, loops
   run once. Every animation must read correctly frozen at its end state. That is the test.
   A dwell — a wait before something appears, such as the tooltip's delay or the Tabs Seed's rest — is
   not motion and survives reduced motion. A delay that staggers the parts of one movement is
   choreography: it collapses with its durations, in the component's own reduced-motion rules.
   `base.css` is unchanged.
   Under reduced motion, a hover pose that is only decorative (such as a glyph's lean) is removed, not
   snapped. The hover is then shown by colour alone.
6. No looping attention-seekers: no pulsing dots, breathing buttons, glowing rings. The loading spinner is
   the one loop, and it stops meaning anything if something else pulses.

## The icon-stroke exception

Rule 1's exception exists so a glyph's own strokes can morph — the copy button's mark, the
disclosure chevron — without the glyph being rebuilt from dozens of parts that move only by
`transform` and `opacity`. Each guard keeps it that small. The reasoning and the measurements are
in `decisions/004-icon-strokes-draw`.

| Guard | Why |
|---|---|
| Inside `.vela-icon` only | Keeps the exception to 12–20px glyphs; lines, borders and charts can't use it |
| Transitions only, never `@keyframes` | Rule 3; the morph retargets mid-flight |
| `stroke-dashoffset` only | dasharray and `pathLength` stay static |
| The dash gap is at least the path's length | `1 1` wraps and draws a dot at the far end |
| Fully retracted means `opacity: 0` too | A zero-length round-cap dash renders a dot (Chromium) |
| One glyph at a time | Cost grows with the number of glyphs drawing |

`scripts/check-css.mjs` checks the first three, as far as a stylesheet shows them (`pathLength` is
an SVG attribute, not CSS): it accepts `stroke-dashoffset` in a transition only
under a selector in which every element matched sits inside `.vela-icon`, fails it everywhere else
and in any `@keyframes`, and still fails `stroke-dasharray`. Inside `.vela-icon` it also accepts a
bare length in `transform-origin` and inside `translate()`, because there a length is a unit of the
glyph's 24-unit grid, not a screen pixel; every other property is checked as usual.

**Two guards CSS can't check:** the dash gap, and fully retracted meaning `opacity: 0`. They are
proved by browser-level (Playwright) rules in the owning component's spec, for example
`copy-button-strokes-retract-clean`, not by the linter. "One glyph at a time" is a convention,
held in review.

## What this buys

Motion that goes unnoticed. The compliment to design for is "this feels quick", never "nice animation".
The reference implementation is [Button](../components/button.md#motion).
