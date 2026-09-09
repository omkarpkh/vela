# Button

Triggers an action — save, submit, delete, apply, cancel. Carries a text label and an
optional **left** icon. `variant` encodes the action's consequence; `appearance` encodes
visual weight.

## When to use Button (vs. something else)

- Action that stays in the page flow → **Button**.
- Navigates to another page → a router `<Link>`, not a Button.
- Flips a binary setting that takes effect immediately → **Toggle**.
- Icon-only, no label → an Icon Button, which is **not in this kit**. Flag the gap.

## Props

```tsx
<Button variant="primary" appearance="filled" size="regular" icon={<PlusIcon />}>
  Save Changes
</Button>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"primary" \| "standard" \| "destructive"` | `"standard"` | Consequence. **These three only.** |
| `appearance` | `"filled" \| "hollow" \| "text-link"` | `"filled"` | Weight. **These three only.** `text-link` is primary-only. |
| `size` | `"tiny" \| "regular" \| "large" \| "huge"` | `"regular"` | **These four only.** |
| `disabled` | `boolean` | `false` | A state, not a variant. Leaves the tab order. |
| `loading` | `boolean` | `false` | Shows an indicator, sets `aria-busy`, ignores clicks. |
| `icon` | `ReactNode` | — | Always **left** of the label. There is no trailing slot. |
| `type` | `"button" \| "submit"` | `"button"` | `"submit"` only for a form's commit button. |
| `children` | `ReactNode` | — | Label. Verb-first, Title Case. |

Every other native `<button>` attribute is forwarded, and the ref lands on the `<button>`.

## Hard constraints (enforced by the type system)

These are not review conventions — the compiler rejects them. `ButtonProps` is a
discriminated union, so a violation is a build failure, not a bug report.

- **`appearance="text-link"` requires `variant="primary"`.** No standard or destructive
  text-link exists.
- **`text-link` is `tiny` or `regular` only**, and **never carries an icon** (`icon?: never`).
- **`text-link` is never underlined.** Colour carries the affordance; hover shifts colour.
- **One `variant="primary" appearance="filled"` per page.** Pair it with hollow / text-link
  for everything else. This one is a convention — the compiler cannot count buttons.
- **Icons sit left only.**
- **Width hugs content.** Never fix a button width.
- **`destructive` encodes consequence, not emphasis.** Delete/revoke/remove only. Never
  for "Cancel", never just to stand out.

## Token bindings

Container: `border-radius: var(--vela-radius-4)` — not a pill. Focus ring comes from
`.vela-root :focus-visible`; do not add a per-button outline.

| variant · appearance | Background | Text | Border |
|---|---|---|---|
| primary · filled | `--vela-btn-primary-bg` | `--vela-btn-primary-text` | same as bg |
| primary · hollow | transparent | `--vela-btn-hollow-primary-text` | `--vela-btn-hollow-primary-border` |
| primary · text-link | transparent | `--vela-text-link` | none |
| standard · filled | `--vela-btn-standard-bg` | `--vela-btn-standard-text` | `--vela-btn-standard-border` |
| standard · hollow | transparent | `--vela-btn-standard-text` | `--vela-btn-standard-border` |
| destructive · filled | `--vela-btn-destructive-bg` | `--vela-btn-destructive-text` | same as bg |
| destructive · hollow | transparent | `--vela-btn-destructive-hollow-text` | same as text |
| disabled (any) | `--vela-btn-disabled-bg` | `--vela-btn-disabled-text` | `--vela-border-inactive` |

`--vela-btn-destructive-bg` resolves to `red-700`, **not** `red-500`. See
`foundations/color.md` — red-500 fails AA behind a white label.

## Sizes

| size | Height | H-padding | Icon | Font |
|---|---|---|---|---|
| tiny | `--vela-control-height-24` | `--vela-space-10` | `--vela-icon-12` | 12/18 |
| regular | `--vela-control-height-35` | `--vela-space-15` | `--vela-icon-16` | 14/21 |
| large | `--vela-control-height-40` | `--vela-space-20` | `--vela-icon-16` | 15/22 |
| huge | `--vela-control-height-60` | `--vela-space-30` | `--vela-icon-16` | 16/24 |

Label weight is **Regular 400 at every size**.

## States

- **Hover** — filled variants darken (lighten in dark mode) via their `-hover-bg` token.
  `text-link` shifts colour and stays un-underlined.
- **Focus** — the shared `:focus-visible` ring. Never `outline: none`.
- **Disabled** — native `disabled`. Not focusable. Explain why in adjacent helper text.
- **Loading** — the label **stays**, a spinner appears, `aria-busy="true"` is set, and the
  button remains focusable while ignoring clicks. Swapping the label for a spinner would
  strip the control's accessible name mid-request; disabling it would drop focus.

## Figma mapping

Library file: **Vela Design System** → page `Button`. The component set is 24 variants:
`Variant` (3) x `Appearance` (2) x `Size` (4), plus an `Icon` boolean property.

| Figma property | Code prop | Notes |
|---|---|---|
| `Variant` | `variant` | primary / standard / destructive |
| `Appearance` | `appearance` | filled / hollow |
| `Size` | `size` | tiny / regular / large / huge |
| `Icon` (boolean) | `icon` | Toggles the left icon layer. Boolean, not a variant axis — it changes visibility, not colour. |

**`disabled` has no Figma axis, on purpose.** It is a *state*, not a variant — the Props table
above says so, and adding it would push the matrix past 30 combinations for no gain.

**`appearance="text-link"` is a separate component set**, not a third value of `Appearance`.
That mirrors the type: `ButtonProps` is a discriminated union, and text-link is its own member
with a narrower `size` and `icon?: never`. One union member, one component set.

## Anti-patterns

- ❌ Two primary filled buttons on one page.
- ❌ Pill-shaped buttons → `--vela-radius-4`.
- ❌ `--vela-control-height-48` for huge → huge is 60px.
- ❌ A 20px or 24px icon in a Button → 12 at tiny, 16 elsewhere.
- ❌ Fixed button widths.
- ❌ A trailing icon.
- ❌ A destructive or standard text-link → primary only (will not compile).
- ❌ Underlining a text-link.
- ❌ `destructive` for emphasis on a harmless action.
- ❌ Hardcoded colours → always `var(--vela-*)`.
- ❌ SemiBold or Bold labels → Regular 400.
- ❌ Non-verb labels ("Information", "Status") → if it is not an action, it is not a button.
