# Toggle

A binary setting that takes effect **immediately**. No Save step.

## When to use Toggle

- Notifications on/off, dark mode, "enable this rule" → **Toggle**.
- Records intent until a Save click (accept terms, pick scope in a form) → **Checkbox**,
  which is not in this kit. Flag the gap rather than substituting a Toggle.
- More than two states → not a Toggle.

## Props

```tsx
<Toggle label="Email alerts" checked={on} onChange={setOn} />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** A switch with no name is unusable by screen reader. |
| `checked` | `boolean` | — | Controlled. Omit for uncontrolled. |
| `defaultChecked` | `boolean` | `false` | Uncontrolled initial state. |
| `onChange` | `(checked: boolean) => void` | — | Receives the **next** value. |
| `disabled` | `boolean` | `false` | |
| `labelPosition` | `"right" \| "left"` | `"right"` | |
| `size` | `"tiny" \| "regular"` | `"regular"` | **These two only.** |

## Hard constraints

- **`label` is required and is a `string`.** Not optional, not `ReactNode`. The type system
  makes an unlabelled switch impossible.
- Controlled and uncontrolled are exclusive: pass `checked` **or** `defaultChecked`.
- The change is immediate. Never pair a Toggle with a Save button that gates it.

## Token bindings

Track off `--vela-toggle-off-bg`; on `--vela-toggle-on-bg`; knob `--vela-toggle-knob`;
disabled track `--vela-border-inactive`. Track radius is `--vela-radius-full` — one of only
two components allowed to use it.

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

Track and knob geometry (34x20 / 26x15, knob 16 / 11) is **literal in both Figma and CSS** —
it is not tokenised. That is a known gap, recorded rather than hidden.

## Anti-patterns

- ❌ A Toggle behind a Save button → that is a Checkbox.
- ❌ `<Toggle />` with no label → will not compile.
- ❌ Toggles for more than two states.
- ❌ A custom `<div>` with a click handler → loses role, keyboard and announcement.
