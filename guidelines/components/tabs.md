# Tabs

Navigate between **different** content panels.

## When to use Tabs (vs. something else)

- Different content sections (Alerts / Assets / Audit) → **Tabs**.
- The **same** dataset rendered differently (Grid / Dashboard / Chart) → **View Switcher**,
  which is **not in this kit**. Flag the gap; do not substitute Tabs. If only the
  *presentation* of one dataset changes, it is not Tabs.
- Sequential steps → a Wizard, not Tabs.
- More than ~7 panels → reconsider the information architecture.

## Composition

```tsx
<Tabs defaultValue="alerts" onValueChange={setView}>
  <Tabs.List aria-label="Views">
    <Tabs.Trigger value="alerts" count={12}>Alerts</Tabs.Trigger>
    <Tabs.Trigger value="assets">Assets</Tabs.Trigger>
    <Tabs.Trigger value="audit" disabled>Audit</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="alerts">…</Tabs.Panel>
  <Tabs.Panel value="assets">…</Tabs.Panel>
</Tabs>
```

| Part | Prop | Type | Notes |
|---|---|---|---|
| `Tabs` | `defaultValue` | `string` | **Required.** |
| | `value` / `onValueChange` | `string` / `(v) => void` | Controlled mode. |
| | `size` | `"regular" \| "large"` | **These two only.** |
| `Tabs.List` | `aria-label` | `string` | **Required.** |
| `Tabs.Trigger` | `value` | `string` | Must match a Panel. |
| | `count` | `number` | Optional numeric badge. |
| | `disabled` | `boolean` | Skipped by arrow-key navigation. |
| `Tabs.Panel` | `value` | `string` | Must match a Trigger. |

## Hard constraints

- **`Tabs.List` requires `aria-label`.** An unnamed tablist is unnavigable by screen reader,
  so the type makes it impossible.
- **Parts must be used inside `<Tabs>`.** They throw a named error otherwise, rather than
  rendering something silently broken.
- **Only the active panel renders.** Do not rely on hidden panels holding DOM state.
- Controlled and uncontrolled are exclusive.

## Token bindings

Trigger rest `--vela-text-de-emphasized`; hover `--vela-text-default`; selected
`--vela-text-link` with a 2px `--vela-border-active` underline. List rule
`--vela-border-subtle`.

## Accessibility

This is the reason Tabs is more than a styled list:

- Correct roles throughout: `tablist` / `tab` / `tabpanel`, with `aria-selected`,
  `aria-controls` and `aria-labelledby` wired both ways.
- **Roving tabindex** — the whole tablist is one Tab stop; Left/Right move between tabs and
  Home/End jump to the ends. Disabled tabs are skipped, and the list wraps.
- The panel is focusable so keyboard users land in the content after activating a tab.

## Figma mapping

Library file: **Vela Design System** → page `Tabs`. The component set is a single **Tab**, not the
whole tablist: six variants, `State` (3) x `Size` (2), plus a `Count` boolean. Compose a tablist
by placing Tab instances in a row.

| Figma property | Code equivalent |
|---|---|
| `State=selected` | the active `value` on `<Tabs>` |
| `State=disabled` | `disabled` on `<Tabs.Trigger>` |
| `Size` | `size` on `<Tabs>` |
| `Count` (boolean) | `count` on `<Tabs.Trigger>` |

**The keyboard behaviour has no Figma expression.** Roving tabindex, arrow navigation, Home/End,
and skipping disabled tabs exist only in code — which is exactly why the Figma library is not the
source of truth for this component. The spec is.

## Anti-patterns

- ❌ Tabs for the same dataset in a different view → View Switcher.
- ❌ `<Tabs.List>` without `aria-label` → will not compile.
- ❌ Buttons in a `<div>` with click handlers → no roles, no keyboard, no announcement.
- ❌ Every tab tabbable → use the roving tabindex the component already implements.
- ❌ Tabs as page navigation → use real links so URLs work.
- ❌ Keeping hidden panels mounted to preserve form state → lift the state instead.
