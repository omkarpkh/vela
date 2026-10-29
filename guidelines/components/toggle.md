# Toggle

A binary setting that takes effect **immediately**. No Save step.

## When to use Toggle

- Notifications on/off, dark mode, "enable this rule" → **Toggle**.
- Records intent until a Save click (accept terms, pick scope in a form) → **Checkbox**
  (`checkbox.md`, from `@omkarux/vela/headless`). Never substitute a Toggle.
- More than two states → not a Toggle.

## Props

```tsx
<Toggle label="Email alerts" checked={on} onChange={setOn} />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** A switch with no name is unusable by screen reader. |
| `checked` | `boolean` | — | Controlled. Omit for uncontrolled. Exclusive with `defaultChecked`. |
| `defaultChecked` | `boolean` | `false` | Uncontrolled initial state. Exclusive with `checked`. |
| `onChange` | `(checked: boolean) => void` | — | Receives the **next** value. |
| `disabled` | `boolean` | `false` | |
| `labelPosition` | `"right" \| "left"` | `"right"` | |
| `size` | `"tiny" \| "regular"` | `"regular"` | **These two only.** |

## Hard constraints

- **`label` is required and is a `string`.** Not optional, not `ReactNode`. The type system
  makes an unlabelled switch impossible. [[rule: toggle-label-required | compiler]]
- Controlled and uncontrolled are exclusive: pass `checked` **or** `defaultChecked`. [[rule: toggle-controlled-exclusive | compiler]]
- The change is immediate. Never pair a Toggle with a Save button that gates it. [[rule: toggle-change-is-immediate | convention]]

## Token bindings

Track off `--vela-toggle-off-bg`; on `--vela-toggle-on-bg`; knob `--vela-toggle-knob`;
disabled track `--vela-border-inactive`. Track radius is `--vela-radius-full` — one of only
two components allowed to use it.

## Responsive behaviour

The track and knob are fixed geometry (`regular` and `tiny`) and never scale with the viewport;
only the **label flexes**. In a narrow container the label wraps beside the track, which stays
on the first line (`flex: none`) so the control is always findable at the start of the row;
with `labelPosition="left"` the same holds mirrored. The label never truncates. The minimum
hit area is the track plus the gap to the label, so on touch viewports prefer `regular`. Density
tokens do not exist yet (see `DESIGN.md`, *Responsive and density*); until they do, the two
sizes are the only density control.

## Accessibility

- Renders a native `<button role="switch">` with `aria-checked`.
- Enter and Space activate it; it is in the tab order.
- The visible label is wired via `aria-labelledby` and is itself clickable.
- Motion respects `prefers-reduced-motion`.

## Figma mapping

Library file: **Vela Design System** → page `Toggle`. Four variants: `State` (off/on) x `Size`
(regular/tiny), plus a `Label text` text property.

| Figma property | Code prop |
|---|---|
| `State` | `checked` / `defaultChecked` |
| `Size` | `size` |
| `Label text` | `label` |

Track and knob geometry is tokenised in CSS since 0.13: `--vela-toggle-track-width` /
`-height` (34 / 20), `-tiny` (26 / 15), `--vela-toggle-knob-size` (16) / `-tiny` (11) and
`--vela-toggle-knob-inset` (2). Knob travel is derived from those four, so they cannot drift
apart. The Figma component still draws the geometry as literal sizes — binding Figma
number variables to frame dimensions is the remaining half of this gap.

## Anti-patterns

- ❌ A Toggle behind a Save button → that is a Checkbox.
- ❌ `<Toggle />` with no label → will not compile.
- ❌ Toggles for more than two states.
- ❌ A custom `<div>` with a click handler → loses role, keyboard and announcement.
