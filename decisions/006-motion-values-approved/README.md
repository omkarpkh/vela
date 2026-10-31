# The motion values are approved

**Decided 31 October 2026. Omkar approved all three moments of the motion pass, part 2 (PR #27), as
recorded, with no change: the Toast stack, Popover and Tooltip growing from their trigger, and the
state and press motion of Checkbox, Radio Group and Toggle. With them, the three motion values that
had been provisional since 0.13.0, `duration-travel`, `ease-out` and `ease-spring`, are decided.
Shipped in 0.15.0.**

The clips he judged are in `media/`: `toast.mp4` (41 s), `overlays.mp4` (21 s) and `controls.mp4`
(35 s). `record.mjs` makes them again; its header says how. He watched them on a review page that
asked four questions per moment and listed the values that could be turned.

---

## What started it

The motion pass, part 1 (0.13.0), added `duration-travel`, `ease-out` and `ease-spring`. It marked
them, and every value a spec chose with them, provisional until the owner had reviewed their feel on
the playground's Motion review page (`#/motion`). Part 2 (#27) added thirty browser rules and more
provisional values. Until he had seen them, every spec that used them said "provisional", and
nothing could be called settled.

## What was considered

For each moment, the review page asked whether it felt calm, whether it came from the right place,
and whether its speed was right. It also named the alternative for each dial:

| Moment | The values shown | The alternative named |
|---|---|---|
| Toast stack | enter and leave over its own height at 180 ms, ease-out; each older toast 10 px back and 5% smaller; spread and close on the spring over 240 ms; a warning behind the front keeps the stack spread | a less bouncy spring; collapsing the stack even with a warning behind |
| Popover and Tooltip | grow from 96% as they fade in; Popover 180 ms, Tooltip 120 ms after a 600 ms rest; both leave on a fade | start at 92 to 94%, so the growth shows more |
| Checkbox, Radio Group and Toggle | press to 90% (a button presses to 97%), in 70 ms, out 180 ms; the tick and the dot grow from 50% over 120 ms, ease-out; nothing animates from the keyboard | a shallower press, such as 93% |

His answer: "All approved."

## The measurements

The thirty browser rules in #27 hold each moment to its contract:
- it moves only by transform and opacity;
- it reads correctly frozen at its end state under reduced motion;
- triggered again mid-flight, it ends in the right state;
- it doesn't animate from the keyboard.

They passed in CI and locally, 156 of 156 browser tests, at c89f767.

The approval itself is a judgement of feel. **It was made from recordings, not from the live page:**
- headless Chromium, 1280 × 720, Open Sans served locally;
- a cursor ring and a caption bar added for the recording;
- the controls clip magnified 1.6×, because the controls are 16 px.

**Not seen:** swiping a toast away, Dialog's rise, and Safari and Firefox.

## Why the alternatives lost

None was asked for. Each stays named above in case a later look disagrees.

## What shipped

- The values above, unchanged from #27.
- DESIGN.md, `foundations/motion.md`, and the Checkbox, Popover, Radio Group, Toast, Toggle and
  Tooltip specs now say the values were approved on 31 October 2026, citing this record, where they
  said "provisional".
- The Motion review page says the same.

## Still open

1. **Safari and Firefox.** The recordings and the browser rules ran in Chromium only.
2. **Swipe and Dialog** weren't in the clips. Their rules pass, but their feel wasn't shown.
3. **A change to any of these values** is a new review on `#/motion` and a new record that names
   this one.
