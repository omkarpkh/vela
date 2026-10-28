# Status Indicator

A coloured dot representing one of exactly five health states, usually in a table cell or
next to an object name.

## When to use Status Indicator

- An object's ongoing health → **Status Indicator**.
- An event the user must read → **Contextual Alert**.
- A risk score → **Risk Pill** (the Risk taxonomy, three levels).

## Props

```tsx
<StatusIndicator status="unhealthy" label="api-gateway-01" />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `status` | `"unknown" \| "healthy" \| "warning" \| "medium" \| "unhealthy"` | — | **Required. These five only.** |
| `label` | `string` | — | Visible text. **Strongly preferred.** |
| `size` | `"small" \| "regular"` | `"regular"` | **These two only.** |

## Hard constraints

- **Five states.** Not severity's six, not risk's three. There is no `"critical"` status and
  no `"high"` status — the compiler rejects both. [[rule: status-closed-set | compiler]]
- **`medium` means degraded**, sitting between `warning` and `unhealthy`. It is not the
  middle of a risk scale. [[rule: status-medium-is-degraded | convention]]
- **Colour is never the only signal.** With no `label`, the component sets an `aria-label`
  from the status ("Unhealthy", "Degraded", …) so the dot is never silent. With a `label`,
  it does not duplicate it — the visible text is the accessible name. [[rule: status-never-colour-only | runtime]]

## Token bindings

Fill is `--vela-signal-status-*` only. The dot uses `--vela-radius-full` — one of only two
components allowed to.

In light mode `warning` binds `yellow-700` and `medium` binds `orange-600` rather than the
500s, so both clear 3:1 against the page. See `foundations/color.md`.

## Responsive behaviour

A Status Indicator is inline (`inline-flex`): the dot is fixed geometry (`flex: none`) and
only the label flexes. In a narrow table cell the label **wraps after the dot**, never before
it, and never truncates — the dot without its word is colour alone, which the kit forbids.
Where only the dot fits (a dense grid cell), omit `label` and the component supplies the
accessible name itself (`role="img"`), so meaning survives the squeeze for assistive
technology; a visible legend is then the host's responsibility. Density tokens do not exist
yet (see `DESIGN.md`, *Responsive and density*); until they do, the two sizes are the only
density control.

## Figma mapping

Library file: **Vela Design System** → page `Status Indicator`. Ten variants: `Status` (5) x
`Size` (2), plus a `Label` boolean.

| Figma property | Code prop |
|---|---|
| `Status` | `status` |
| `Size` | `size` |
| `Label` (boolean) | `label` — hiding it in Figma means the code must supply the `aria-label` fallback |

Dot diameters (10px / 8px) are **literal in both Figma and CSS**, not tokenised. Known gap.

## Anti-patterns

- ❌ `status="critical"` → that is severity (will not compile).
- ❌ Binding `--vela-signal-severity-*` to the dot → wrong taxonomy.
- ❌ A bare dot in a table with no label and no header context.
- ❌ Six or seven states → the set is closed at five.
- ❌ `--vela-radius-full` borrowed for other components.
