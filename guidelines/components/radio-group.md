# Radio Group

A short list of options where **exactly one** is chosen — an enforcement mode, a retention
period, a severity to assign — all visible at once, committed by a Save.

**Status:** Experimental — born in `@omkarux/vela/headless` (Base UI 1.9) alongside Checkbox;
there is no core implementation, and its Figma set is published in the library (built from
`scripts/figma/components/radio-group.figma.js`). Approved once the API has settled; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Radio Group (vs. Select, vs. Checkbox)

- **Two to five options, one answer**, and the user should see them all before choosing →
  **Radio Group**. Seeing every option is the point: the choice is a comparison.
- **More than five options**, or options the user already knows by name (a country, a tenant,
  a time zone) → a **Select List**, which is **not in this kit**. Flag the gap; do not stack
  twelve radios.
- Any number of answers → **Checkbox.Group** (`checkbox.md`).
- Exactly two options that are really on/off and take effect immediately → **Toggle**
  (`toggle.md`). Two options that are two named things ("Monitor" / "Block") → Radio Group.
- A choice that switches *what is shown* rather than what is saved → Tabs or a View Switcher,
  not a Radio Group.

## Composition

```tsx
<RadioGroup label="Enforcement" defaultValue="block" onValueChange={setMode}>
  <RadioGroup.Radio value="monitor" label="Monitor" description="Log the match, allow the traffic" />
  <RadioGroup.Radio value="block" label="Block" />
  <RadioGroup.Radio value="isolate" label="Isolate" disabled />
</RadioGroup>
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `RadioGroup` | `label` | `string` | — | **Required.** Rendered as the group's visible label and wired as its accessible name. |
| | `value` | `string` | — | Controlled: the selected radio's `value`. Exclusive with `defaultValue`. |
| | `defaultValue` | `string` | — | Uncontrolled initial selection. Exclusive with `value`. Omit both for no selection. |
| | `onValueChange` | `(value: string) => void` | — | Receives the **next** value. |
| | `disabled` | `boolean` | `false` | Disables every radio in the group. |
| | `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | **These two only.** Layout; arrow keys move in both axes either way, as native radios do. |
| | `error` | `string` | — | **The message.** Presence puts the group in the error state; the string is announced. |
| | `name` | `string` | — | Native, forwarded to the hidden `<input type="radio">`s for form submission. |
| | `children` | `ReactNode` | — | `RadioGroup.Radio` elements. |
| `RadioGroup.Radio` | `value` | `string` | — | **Required.** What the group reports when this radio is chosen. |
| | `label` | `string` | — | **Required.** The visible label, also the accessible name. |
| | `disabled` | `boolean` | `false` | Native `disabled`: skipped by the arrow keys, out of the tab order. |
| | `description` | `string` | — | A hint under the label, linked by `aria-describedby`. |

## Hard constraints

- **The group has a `label`.** `RadioGroup` without one does not compile: an unnamed radiogroup
  reads as a run of unrelated buttons. [[rule: radio-group-label-required | compiler]]
- **Controlled and uncontrolled are exclusive.** Pass `value` **or** `defaultValue`; both is a
  build failure, as on Tabs. [[rule: radio-group-controlled-exclusive | compiler]]
- **`error` is a message, not a flag.** `error={true}` does not compile; pass the string and the
  component renders and announces it, as Input does. [[rule: radio-group-error-is-a-message | compiler]]
- **Two orientations.** `vertical` and `horizontal`. There is no `grid`, no `inline`. [[rule: radio-group-orientation-closed | compiler]]
- **Every radio has a `value`.** A radio the group cannot name cannot be chosen, so the type
  requires it. [[rule: radio-value-required | compiler]]
- **Every radio has a `label`, and it is a `string`.** Not optional, not `ReactNode`. [[rule: radio-label-required | compiler]]
- **A `RadioGroup.Radio` renders inside a `RadioGroup`.** Outside one it throws a named error
  rather than rendering a button that belongs to no set. The types cannot say where a child is
  rendered, so this is enforced at runtime, as `Tabs.Trigger` outside `Tabs` is. [[rule: radio-requires-group | runtime]]
- **Disabled radios are skipped.** Arrow keys move past a disabled radio and it is out of the tab
  order; it is never the group's one tab stop. [[rule: radio-disabled-is-skipped | runtime]]
- **`aria-describedby` points only at rendered elements.** No `description` → no attribute on the
  radio; no `error` → no attribute on the group. [[rule: radio-group-describedby-only-rendered | runtime]]
- **Five options or fewer.** A radio group is a comparison the eye makes in one pass. Six or more
  is a Select List, which is not in this kit: flag it rather than stacking radios. [[rule: radio-group-few-options | convention]]
- **The dot scales in, by transform and opacity alone.** Selected with a pointer, the radio's dot
  scales from half size as it fades in; the radio that lost the selection fades its dot out where
  it is. Transitions only, never a keyframe. [[rule: radio-dot-scales-in | browser]]
- **Changed again mid-flight, it turns round.** A press on another radio, and back, while the dots
  are still moving ends with one dot, on the selected radio, at rest. [[rule: radio-dot-retargets | browser]]
- **From the keyboard it does not animate.** Arrow keys and Space move the selection at once: no
  press, no fill fade, no dot motion — on the radio that was left as well as the one reached. [[rule: radio-keyboard-is-instant | browser]]
- **Under reduced motion it is at its end state.** Pressed while held, released after, the dot in
  full. [[rule: radio-motion-reduced-end-state | browser]]
- **A press never moves the hit target.** The circle presses to 0.9; a guard holds its original box
  for as long as the press lasts, so a release at its edge still lands on it. [[rule: radio-press-keeps-hit-target | browser]]

## Token bindings

| State | Circle background | Circle border | Dot |
|---|---|---|---|
| unselected | `--vela-control-bg` | `--vela-control-border` | — |
| unselected, hovered | `--vela-control-bg` | `--vela-control-border-hover` | — |
| selected | `--vela-control-check-bg-checked` | `--vela-control-check-bg-checked` | `--vela-control-check-mark` |
| error (any) | as the row above | `--vela-control-border-error` | as the row above |
| disabled (any) | `--vela-control-bg-disabled` | `--vela-border-inactive` | `--vela-icon-disabled` |

Label `--vela-text-default`; `description` `--vela-text-de-emphasized`; `error`
`--vela-text-error`; disabled label `--vela-text-inactive`. The circle is
`--vela-control-radio-size` in diameter and the dot `--vela-control-radio-dot`, an inline SVG at
`currentColor`. The circle is drawn with `border-radius: 50%` — a circle's own geometry, not a
step of the radius scale — so `--vela-radius-full` keeps the scope `foundations/radius.md` gives
it: the status dot and the toggle track only.

The fill and the dot share `--vela-control-check-bg-checked` and `--vela-control-check-mark` with
Checkbox so the two controls read as one family; the pairs are asserted in `PAIRS` (see
`checkbox.md`, Token bindings, for the numbers).

## Sizes

One size. The circle is `--vela-control-radio-size` (16) with the dot at
`--vela-control-radio-dot` (6); the label is Body 14/21 and the description Meta 12/18. A radio
group is read as a list, never set in a dense table cell, so there is no `tiny` — the row is
where a Checkbox `tiny` belongs. Gap circle-to-label `--vela-space-10`; gap between radios
`--vela-space-10` vertical, `--vela-space-20` horizontal; gap label-to-items `--vela-space-5`.

## States

- **Hover** — border to `--vela-control-border-hover`, under `@media (hover: hover)` only.
- **Focus** — the global ring (`.vela-root :focus-visible`) on the focused radio; the group is one
  tab stop, so the ring lands on the selected radio, or the first enabled one when none is.
- **Selected** — CSS keys on `[aria-checked='true']` on the circle.
- **Error** — CSS keys on `[aria-invalid='true']` on the group, set when `error` is a non-empty
  string, and every circle in the group takes the error border.
- **Disabled** — the native attribute; CSS keys on `:disabled`. Nothing animates.
- **Pressed** — pointer only, the circle at `scale(0.9)`; see *Motion*.
- **Motion** — see below.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Press in (pointer, on the circle or its label) | the circle, `transform: scale(0.9)`, from its centre; a guard holds the hit target | `--vela-duration-instant` (70ms), `--vela-ease-standard` | feedback: the press landed |
| Press out | the scale releases | `--vela-duration-base` (180ms) | a release settles |
| Selected (pointer) | the dot: opacity, and scale from 0.5 | `--vela-duration-fast` (120ms), `--vela-ease-out` | continuity: the choice arrives in the circle |
| Deselected | the old dot fades out where it is | `--vela-duration-fast` (120ms) | softer than it arrived |
| Fill and border | colour | `--vela-duration-fast`, `--vela-ease-standard` | unchanged |
| From the keyboard | nothing | instant | arrow keys and Space: from the keyboard nothing animates |

The press is Button's CSS mechanism at the small controls' depth, as on Checkbox (`checkbox.md`,
Motion, says why 0.9). The dot is moved by the component that owns the selection: Base UI's
`Radio.Indicator` carries `data-starting-style` and `data-ending-style` and stays mounted until its
fade has finished. **The keyboard mark is on the group, not the radio**: an arrow key pressed on
one radio selects another, and that radio's dot must not animate either. A pointer anywhere on the
group clears it. Under `prefers-reduced-motion` the global collapse in `base.css` applies. No prop
turns any of this on or off. The values were approved on 31 October 2026, from the Motion review page (`#/motion`); decision 006.

## Responsive behaviour

The circle is fixed geometry and only the **label flexes**. In a narrow container a label wraps
beside its circle, which stays on the first line; `description` wraps below the label in the
same column; the group's `error` wraps under the list. Labels never truncate. Minimum width: a
circle plus the gap plus one word. A horizontal group **wraps** (`flex-wrap`) rather than
scrolling — in a host narrower than two radios it reads as a vertical one — and the arrow keys
keep working in both axes regardless of where the wrap fell. Density tokens do not exist yet
(see `DESIGN.md`, *Responsive and density*); until they do, nothing here changes between
densities.

## Accessibility

- The group is `role="radiogroup"`, named by its label through `aria-labelledby`; `error` is
  linked by `aria-describedby` and is a live region (`role="alert"`).
- Each radio is a native `<button type="button" role="radio">` with `aria-checked`, plus Base UI's
  visually hidden `<input type="radio">` so a plain `<form>` submits `name`/`value`.
- **Roving tabindex** — the group is one Tab stop. Arrow keys move focus **and** selection, as
  native radios do; disabled radios are skipped; Space selects the focused radio; Enter does not
  (it submits the form).
- The visible label is a `<label htmlFor>` **and** wired by `aria-labelledby`: clicking the text
  selects the radio natively.
- Colour is never the only signal: the dot is a glyph and the error is a message.

## Implementations

Radio Group ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is
planned (`decisions/002-agent-ready-direction`).

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `RadioGroup` + `Radio` (`src/headless/RadioGroup`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

Where Base UI's defaults differ from this spec, the implementation maps to the spec and the
difference is recorded here:

- **Element.** Base UI renders each radio as a `<span role="radio">`. This spec wants the native
  disabled state and the kit's `:disabled` and `:focus-visible` CSS, so the radio renders a
  `<button type="button">` through Base UI's `render` prop with `nativeButton`; Base UI then puts
  the native `disabled` attribute on it, and its roving focus skips a natively disabled element
  without being told.
- **Labelling.** Base UI's labelling expects a `Field.Label` or a `Fieldset.Legend`; this spec's
  `label` is a plain element wired by an explicit `aria-labelledby` on the group, which Base UI
  honours over its fallback. The same for each radio's `label`.
- **Provider guard.** Base UI's `Radio.Root` outside a `RadioGroup` renders a standalone radio
  that is checked when its value is `""`. This spec throws instead (`radio-requires-group`), with
  Vela's own message, so a radio can never belong to no set.
- **Orientation.** Base UI's `RadioGroup` has no orientation prop; its arrow keys move in both
  axes, which is also what native radios do. This spec's `orientation` is layout only, and says so.
- **Generics.** Base UI's `value` is generic (`any`); this spec closes it to `string`, the same way
  Tabs closes its values, so `onValueChange` always receives a string.
- **Extra attributes.** Base UI adds `data-checked` / `data-unchecked`, `data-disabled` and the
  composite's `data-highlighted`, and a disabled group carries `aria-disabled="true"` on the
  `radiogroup` as well as the native attribute on every radio; the stylesheet keys on `:disabled`
  and the ARIA state attributes, and none of the extras is part of the contract. Ids are Base UI's
  (`base-ui-…`).
- **Home and End.** Base UI's radio group turns them off (`enableHomeAndEndKeys: false`); this spec
  does not promise them either, as native radios do not have them.

## Figma mapping

Library file: **Vela Design System** → page `Radio Group`. The component set is a single
**Radio**, not the whole group — as the Tabs set is a single Tab: two variants, `State`
(unselected / selected), plus a `Label text` text property and a `Description` boolean. The set
is created by `scripts/figma/components/radio-group.figma.js`; it is published in
the library. Compose a group by stacking Radio instances under a text
label.

| Figma property | Code prop |
|---|---|
| `State` | `value` / `defaultValue` on `<RadioGroup>` |
| `Label text` | `label` on `<RadioGroup.Radio>` |
| `Description` (boolean) | `description` on `<RadioGroup.Radio>` |

**Disabled and error have no Figma axis on purpose, as Button's `disabled` has none: they are
states the markup carries. The circle binds `control/radio/size`, its fill and stroke bind
`control/bg` and `control/border` unselected and `control/check/bg-checked` selected, and the dot
binds `control/radio/dot` and `control/check/mark`. The roving tabindex, the arrow keys and the
skipping of disabled radios exist only in code.** Nothing in this component is literal.

## Anti-patterns

- ❌ Six or more radios → a Select List, not in this kit; flag the gap.
- ❌ `<RadioGroup>` with no label → will not compile.
- ❌ `<RadioGroup.Radio>` with no `value` or no `label` → will not compile.
- ❌ A `RadioGroup.Radio` outside a `RadioGroup` → throws.
- ❌ Radios where several answers are valid → Checkbox.Group.
- ❌ Two radios for on/off that take effect immediately → Toggle.
- ❌ Every radio tabbable → the group is one tab stop; use the roving tabindex it implements.
- ❌ `error={true}` with the message elsewhere → pass the message; the boolean will not compile.
- ❌ `--vela-radius-full` on the circle → reserved for the status dot and the toggle track; the circle is `50%`.
