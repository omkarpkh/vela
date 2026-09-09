# Input

Single-line text entry with a label, optional hint, and an error state.

## When to use Input

- Single-line text or numeric-as-text → **Input**.
- Multi-line → Text Area, **not in this kit**. Flag the gap.
- Numeric with a spinner → Number Stepper, **not in this kit**. Flag the gap.
- Choosing from a set → Radio or Dropdown, **not in this kit**.

## Props

```tsx
<Input label="Tenant name" hint="Lowercase letters only" error={err} size="regular" />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** |
| `hint` | `string` | — | Helper text. Wired via `aria-describedby`. |
| `error` | `string` | — | Presence sets the error state; the string is the message. |
| `size` | `"tiny" \| "regular" \| "large"` | `"regular"` | **These three only.** |
| `required` | `boolean` | `false` | Renders a `*` and sets the native attribute. |

Every other native `<input>` attribute is forwarded; the ref lands on the `<input>`.

## Hard constraints

- **`label` is required.** An input with only a placeholder is not labelled.
- **`error` is a message, not a boolean.** An error state with no explanation is not an
  error state.
- `aria-describedby` only ever references elements that are actually rendered — a dangling
  reference is worse than none, and a test asserts this.

## Token bindings

Background `--vela-control-bg`; border `--vela-control-border`; hover
`--vela-control-border-hover`; focus `--vela-control-border-active`; error
`--vela-control-border-error`; placeholder `--vela-control-placeholder`. Radius
`--vela-radius-4`.

## Sizes

| size | Height | Padding |
|---|---|---|
| tiny | `--vela-control-height-25` | `--vela-space-5` |
| regular | `--vela-control-height-26` | `--vela-space-10` |
| large | `--vela-control-height-35` | `--vela-space-10` |

These are the **input family** heights and do not match Button's ramp. See
`foundations/sizing.md`.

## Accessibility

- Label is a real `<label htmlFor>`.
- Error state sets `aria-invalid` and the message is announced via `role="alert"`.
- The `*` is `aria-hidden`; `required` carries the semantics.

## Anti-patterns

- ❌ Placeholder as the label.
- ❌ `error={true}` with the message elsewhere → pass the message.
- ❌ Turning the border red without `aria-invalid`.
- ❌ Input `regular` (26px) next to Button `regular` (35px) without deliberate alignment.
