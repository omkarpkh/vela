# Press feedback

**Decided 23 September 2026. Shipped: a counter-scaled hit guard, an asymmetric press, and a
keyboard acknowledgement. Not shipped: the two options that scored highest.**

Run `prototype.html` in a browser. Ten buttons, one per candidate, each counting its own
presses: how many went down, how many landed, how many were lost. The danger-zone bar marks
the strip near each edge where a press is at risk. Widen the buttons and the losses climb.

---

## What started it

Vela's button shrinks 3% when pressed. That rule shipped in 0.9.0 and nobody questioned it —
it is what most design systems do, and it looks right.

It is not right. The scale is centre-origin, so both edges travel inward *while the pointer is
down*. Press near an edge and the button moves out from under the cursor before the pointer
comes back up. The click then retargets to the nearest common ancestor of the down and up
targets — the parent — and is lost. Silently. The button looks like it was pressed.

Displacement is proportional to width: 1.5px a side at 102px, 4.8px at 320px. So it is wide
buttons that break, which is why it survives casual testing; a button that hugs its content is
usually too narrow to fail.

The test suite could not see it either. `.click()` dispatches pointerdown and pointerup in the
same tick, so the press never advances, and a screenshot is identical whether the click fired
or not. Written as a real press with a wait between down and up: **0 of 2 edge presses on a
320px button fired.**

## What was considered

Ten candidates, built and instrumented rather than argued about. Scored against criteria
written before the options were looked at, weighted through a rubric, /120:

| | | |
|---|---|---|
| I | 85 | synthesis: anchored origin + asymmetric timing + 2% darkening |
| A | 81 | origin-anchored scale — the press pivots on the contact point |
| F | 77 | |
| **E** | **74** | **counter-scaled hit guard — shipped** |
| G | 70 | Linear's pairing |
| H | 68 | subtraction — remove the scale, darken only |
| Base | 67 | what shipped in 0.9.0 |
| B, D | 66 | |
| C | 59 | |

The gap between first and second was 3.3%, which the method treats as too close to call. That
turned out to be the useful signal, not a nuisance: a pressure test disqualified **both**
finalists on grounds the scoring never asked about.

## Why the winners did not ship

**I violates the foundation it was built for.** It hardcodes `70ms`, `210ms` and a bespoke
curve. `guidelines/foundations/motion.md` says: *"No component defines its own duration or
curve. A new one is a token change, reviewed like a colour."* Worse, the Dart and MUI
generators both `throw` on a duration that is not `<n>ms`, so those literals reach exactly one
of the five targets. The *idea* was right — motion rule 2 already requires asymmetry of hover —
so it shipped, as a token.

**A cannot be delivered in CSS.** Anchoring the scale to the contact point requires reading
the pointer position, which means a handler. Flutter ships tokens and no button. The MUI
bridge is JSON, so it can never carry one. Figma has no expression for it. And
`guidelines/llms.txt` promises a port "translates only the syntax" — so a JS-dependent fix
leaves every generated Angular, Vue and Svelte implementation silently broken while the docs
claim the bug is fixed. A design system that reaches five targets cannot fix a bug in one and
call it fixed. A is a good idea held back, not a rejected one.

**E was the only candidate that fixed the actual defect everywhere.** A counter-scaled
`::after`, 0.97 × 1.0309278 = 1, holding the original border box for the length of the press.
Pure CSS, no handler, no new concept. It placed fourth.

## What the rubric missed

None of its five weighting dimensions asks *how many targets does this reach*. In a
multi-target design system that is not a criterion to be weighted against others — it is a gate
that runs before scoring. Two criteria scored 1 across all ten candidates, flagged as gaps
rather than differences: keyboard parity, and a regression assertion. Both shipped. That pass
earned its place.

## What the measurement overturned

Every system surveyed pairs the press with a colour change, and the prototype carried a 2%
darkening on that basis. Pressed in a real browser, it was invisible — and the reason is not
that 2% is too subtle. `filter: brightness()` multiplies everything the element paints, label
included. Figure and ground dim together, so the contrast a person actually reads barely
moves: **6.08:1 → 6.00:1 at 2%, and 5.69:1 at 10%, which is worse.** Turning it up cannot
work. Colour was dropped. A press that reads through colour needs its own token per variant
per theme, each asserted for contrast — a real option, and a much larger one than it looks.

## What shipped

- **The hit guard.** The press no longer moves the button's hit target.
- **An asymmetric press** — in at the new `--vela-duration-instant` (70ms, under the ~85ms
  where delay starts to read as lag), out at `--vela-duration-base` (180ms). Arrival is
  information and wants to be immediate; release is resolution and can settle.
- **A keyboard acknowledgement.** `:focus-visible` excluded keyboard activation from the
  scale, which left Space and Enter as the one input with no feedback at all. The focus ring
  now collapses onto the edge: a state change with no duration, so *"from the keyboard,
  nothing animates"* still holds.
- **A `browser` level in the rule-coverage gate.** That gate previously recognised three kinds
  of proof and said in its own header that there was no fourth. This rule needed one: it is
  genuinely enforced, and provable by neither jsdom (no hit-testing) nor a screenshot
  (identical pixels). Filing it as a convention would have been the safe direction and also
  untrue.

## Still open

- **A, as a pointer-only enhancement.** Three holes to close first: a stale origin outliving
  its press, a mid-flight re-press snapping the origin against a running transform, and a
  rotated ancestor making the bounding box the wrong shape.
- **Two contrast failures found on the way past.** In dark mode the primary button's hover is
  3.18:1 against its white label and the destructive button's is 4.08:1; AA needs 4.5:1.
  Neither pair is in `PAIRS`, so CI has never looked at either. Every mouse press happens from
  hover. Separate decision — it changes colours people can see.
