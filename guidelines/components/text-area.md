# Text Area

Multi-line text entry with a label, optional hint, an error state and an optional live
character count. Input's sibling: the same field anatomy, the same tokens, more lines.

**Status:** Experimental — specced, built and tested, but its Figma set is not in the library
yet (the builder is `scripts/figma/components/text-area.figma.js`). Approved once the set is
published and the API has been reviewed; see `GOVERNANCE.md`.

**Dependencies:** none — a core component in `@omkarux/vela`.

## When to use Text Area

- Free text that runs past one line — a justification, an incident note, a rule description,
  a comment on an approval → **Text Area**.
- Single-line text or numeric-as-text → **Input**.
- Code, a query or a policy document that needs syntax highlighting → a code editor, **not in
  this kit**. Flag the gap; a Text Area is not an editor.
- Choosing from a set → Radio or Dropdown, **not in this kit**.

## Props

```tsx
<TextArea label="Justification" hint="Shown to the approver" maxLength={280} rows={4} />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** |
| `value` | `string` | — | Controlled. Exclusive with `defaultValue`. |
| `defaultValue` | `string` | — | Uncontrolled initial text. Exclusive with `value`. |
| `onChange` | `(event: ChangeEvent<HTMLTextAreaElement>) => void` | — | The native change event, as on Input. With `maxLength`, `event.target.value` is already within the limit. |
| `hint` | `string` | — | Helper text. Wired via `aria-describedby`. |
| `error` | `string` | — | Presence sets the error state; the string is the message. |
| `size` | `"tiny" \| "regular" \| "large"` | `"regular"` | **These three only** — Input's set. |
| `rows` | `number` | `3` | The minimum height, in lines. The field starts at this height and is never dragged shorter. |
| `maxLength` | `number` | — | The limit, in characters. Shows a live `n / max` count below the field. |
| `resize` | `"vertical" \| "none"` | `"vertical"` | **These two only.** There is no horizontal and no both. |
| `disabled` | `boolean` | `false` | |
| `readOnly` | `boolean` | `false` | Focusable and selectable, not editable. |
| `required` | `boolean` | `false` | Renders a `*` and sets the native attribute. |

`name`, `id`, `placeholder`, `autoComplete`, `spellCheck` and the other native `<textarea>`
attributes are forwarded; the ref lands on the `<textarea>`. `cols` is not: the container
decides the width.

## Hard constraints

- **`label` is required.** A text area with only a placeholder is not labelled. [[rule: text-area-label-required | compiler]]
- **Controlled and uncontrolled are exclusive:** pass `value` **or** `defaultValue`, never
  both. [[rule: text-area-controlled-exclusive | compiler]]
- **`error` is a message, not a boolean.** An error state with no explanation is not an
  error state. [[rule: text-area-error-is-a-message | compiler]]
- **`resize` is `vertical` or `none`.** A field dragged wider breaks the form column it sits
  in, so `"horizontal"` and `"both"` do not compile. [[rule: text-area-resize-closed | compiler]]
- **Three sizes, Input's three.** `tiny`, `regular`, `large`; there is no `"medium"`. [[rule: text-area-size-closed | compiler]]
- **The field never resizes horizontally**, whatever the host stylesheet's browser default:
  the computed `resize` is only ever `vertical` or `none`, and `rows` is a floor the drag
  handle cannot cross. A Playwright spec measures both. [[rule: text-area-never-resizes-horizontally | browser]]
- `aria-describedby` only ever references elements that are actually rendered — hint, error
  and count each join it only when present. [[rule: text-area-describedby-only-rendered | runtime]]
- **The count and the limit agree.** Both are measured in characters as a person counts
  them (code points, `[...value].length`), not UTF-16 units, so an emoji is one character in
  the count and one against the limit. Typing or pasting past `maxLength` keeps the first
  `maxLength` characters. [[rule: text-area-count-in-code-points | runtime]]
- **The count is announced politely, and only near the limit.** The visible `n / max` is
  silent while typing; a polite live region speaks "n characters left" once 10% or less of
  the limit remains, and "Character limit reached" at the limit. Never `role="alert"`, never
  on every keystroke from the first. [[rule: text-area-count-announced-near-limit | runtime]]

## Token bindings

The field binds Input's tokens; Text Area adds none. Background `--vela-control-bg`; border
`--vela-control-border`; hover `--vela-control-border-hover`; focus
`--vela-control-border-active`; error `--vela-control-border-error`; placeholder
`--vela-control-placeholder`; disabled `--vela-control-bg-disabled` with
`--vela-border-inactive` and `--vela-text-inactive`. Radius `--vela-radius-4`. Text
`--vela-text-default`; hint and count `--vela-text-de-emphasized`; error message
`--vela-text-error`; the required mark `--vela-text-error` at `--vela-field-mark-gap`.

Every colour pair here is one Input already ships, so it is already in `PAIRS`: input border on
control background (3.29:1, the tightest pair in the kit), placeholder on control background,
de-emphasized and error text on the page.

## Sizes

| size | Padding (block / inline) | Text | Line height |
|---|---|---|---|
| tiny | `--vela-space-5` / `--vela-space-5` | Meta 12 | `--vela-text-meta-line-height` |
| regular | `--vela-space-5` / `--vela-space-10` | Body 14 | `--vela-text-body-line-height` |
| large | `--vela-space-10` / `--vela-space-10` | Body 14 | `--vela-text-body-line-height` |

Height is `rows` lines of the size's line height plus the padding — never a fixed height, and
never a `control-height-*` token: those are the single-line ramp.

## States

- **Default, hover, focus, error, disabled** — Input's, keyed the same way: hover under
  `@media (hover: hover)` and never on a disabled or invalid field, focus on `:focus`,
  error on `[aria-invalid="true"]`, disabled on `:disabled`. The focus ring is the kit's
  global one.
- **Read-only** — looks like the default field and stays in the tab order; the text can be
  selected and copied. No hover change, because nothing about it can be edited.
- **At the limit** — the count reads `max / max` and the live region says so. No colour
  change: reaching the limit is not an error.

## Responsive behaviour

A Text Area **fills its container's width** — the container decides the width, never the
component, and there is no `cols`. Height is `rows` lines and grows only when the person drags
the vertical handle; it never shrinks below `rows`. Label, hint, error and count sit above and
below in a column and wrap at the container width; the count stays on the hint's line, right
aligned, and drops below the hint when the line is too short for both. The error message is
never clipped. In a host narrower than about 20 characters the field is still correct, only
narrow. Density tokens do not exist yet (see `DESIGN.md`, *Responsive and density*); until they
do, sizes and `rows` are the only density controls.

## Accessibility

- Label is a real `<label htmlFor>`.
- Error state sets `aria-invalid` and the message is announced via `role="alert"`, as on Input.
- The `*` is `aria-hidden`; `required` carries the semantics.
- The visible count is part of the description (`aria-describedby`), so focusing the field
  reads the limit once. Announcements while typing come from a separate polite live region,
  and only near the limit.
- The limit is enforced in code points rather than with the native `maxlength`, which counts
  UTF-16 units and would stop an emoji-bearing note before the visible count said so.

## Figma mapping

Library file: **Vela Design System** → page `Text Area`. Twelve variants: `Size` (3) x
`State` (4), as Input.

| Figma property | Code prop |
|---|---|
| `Size` | `size` |
| `State=default` | — |
| `State=focus` | `:focus-visible`, not a prop |
| `State=error` | `error` — a **message string**, not a boolean |
| `State=disabled` | `disabled` |

**The variants show the label, the field, and the hint row with the count together, because the code component renders them together.** `rows`, `maxLength`, `resize` and `readOnly`
have no Figma property: the field is drawn at three lines with a count, and the drag handle is
the browser's own.

## Anti-patterns

- ❌ Placeholder as the label.
- ❌ `error={true}` with the message elsewhere → pass the message.
- ❌ `resize="both"` or a host style that lets the field grow sideways → it breaks the column.
- ❌ A Text Area for a single-line value → Input.
- ❌ A fixed `height` on the field → use `rows`; the height is lines, not pixels.
- ❌ Announcing the count on every keystroke, or with `role="alert"` → polite, and only near the limit.
- ❌ Turning the border red without `aria-invalid`.
