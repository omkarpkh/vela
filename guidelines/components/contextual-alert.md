# Contextual Alert

An inline banner carrying a severity. Lives in the page flow, next to the thing it is about
— it is not a toast and not a modal.

## When to use Contextual Alert

- An event or condition the user must read, inline → **Contextual Alert**.
- An object's ongoing health, usually in a table → **Status Indicator**.
- Transient confirmation that floats and auto-dismisses → a Toast, **not in this kit**.
- A blocking decision → a Modal, **not in this kit**. Flag the gap.

## Props

```tsx
<ContextualAlert severity="major" title="Scan failed" onDismiss={close}>
  Three assets could not be reached.
</ContextualAlert>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `severity` | `"success" \| "info" \| "warning" \| "minor" \| "major" \| "critical"` | — | **Required. These six only.** |
| `title` | `string` | — | Optional bold lead-in. |
| `children` | `ReactNode` | — | **Required.** The body. |
| `onDismiss` | `() => void` | — | Omit for alerts the user must not clear. |
| `dismissLabel` | `string` | `"Dismiss"` | Accessible name for the close control. |

## Hard constraints

- **Six severities, no more.** There is no `"high"`, no `"error"`, no `"danger"`. Those
  belong to the Risk taxonomy or to nothing. The compiler rejects them. [[rule: alert-severity-closed-set | compiler]]
- **`major` and `critical` announce assertively** (`role="alert"`, `aria-live="assertive"`);
  everything else is polite (`role="status"`). This is derived from `severity` and is not
  configurable — an info banner that interrupts a screen reader is a defect. [[rule: alert-live-region-by-severity | runtime]]
- **No dismiss control unless `onDismiss` is passed.** A critical alert the user can clear
  without acting is usually wrong. [[rule: alert-dismiss-requires-handler | runtime]]
- Icon is chosen by severity and is `aria-hidden` — the text carries the meaning. [[rule: alert-icon-is-decorative | runtime]]

## Token bindings

Every level binds its own complete row: `--vela-bg-severity-*`,
`--vela-border-severity-*`, `--vela-icon-severity-*`, `--vela-text-severity-*`.
Never mix a severity background with a risk text colour.

## Accessibility

- Colour is never the only signal: each severity has a distinct icon **and** its label text.
- Live-region politeness is derived from severity, as above.
- The dismiss control is a real button with an accessible name.

## Figma mapping

Library file: **Vela Design System** → page `Contextual Alert`. Six variants, one per severity,
plus a `Dismissible` boolean.

| Figma property | Code prop |
|---|---|
| `Severity` | `severity` |
| `Dismissible` | `onDismiss` — presence of the handler, not a flag |

Each variant is one row, `space/10` apart, padded `space/10` top and bottom and `space/15` left
and right: `Status mark / <severity>`, a centred auto-layout box `icon/20` wide and
`line-height/body` tall so the mark sits on the first line of text, holding `Shape / <severity>`
at `icon/16`; `Content`, which stacks `Title` (Heading/H5) and `Message` (Body/Default) `space/5`
apart; and `Dismiss / Close`, an `icon/20` × `line-height/body` text box in Body/Default that
`Dismissible` shows or hides. On the critical variant the dismiss is hidden outright. The code
draws the same boxes: `.vela-alert__mark`, `.vela-alert__body` and `.vela-alert__dismiss`.

**The status mark is a simple shape: a circle for success and info, a triangle for warning, minor
and major, an octagon for critical. It stays until Vela has an icon set. Severity is also carried
by the title text, never by colour alone.** Production swaps in the real icons from
`src/lib/icons.tsx`. The live-region politeness (`role="alert"` for major and critical,
`role="status"` otherwise) is derived from severity in code and has no Figma expression.

## Anti-patterns

- ❌ `severity="high"` or `"error"` → not in the taxonomy (will not compile).
- ❌ Using a risk token for the background → severity and risk are separate.
- ❌ An info alert with `role="alert"` → interrupts for no reason.
- ❌ Dismissible critical alerts with no other resolution path.
- ❌ Conveying severity by colour alone.
- ❌ Using this as a toast → it is inline and does not float.
