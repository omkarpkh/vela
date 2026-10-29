# Tabs

Navigate between **different** content panels.

**Dependencies:** none

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
| `Tabs` | `defaultValue` | `string` | Uncontrolled mode. **Required unless `value` is passed.** |
| | `value` / `onValueChange` | `string` / `(v) => void` | Controlled mode. `value` and `defaultValue` are exclusive. |
| | `size` | `"regular" \| "large"` | **These two only.** |
| `Tabs.List` | `aria-label` | `string` | **Required.** |
| `Tabs.Trigger` | `value` | `string` | Must match a Panel. |
| | `count` | `number` | Optional numeric badge. |
| | `disabled` | `boolean` | Skipped by arrow-key navigation. |
| `Tabs.Panel` | `value` | `string` | Must match a Trigger. |

## Hard constraints

- **`Tabs.List` requires `aria-label`.** An unnamed tablist is unnavigable by screen reader,
  so the type makes it impossible. [[rule: tabs-list-requires-aria-label | compiler]]
- **Parts must be used inside `<Tabs>`.** They throw a named error otherwise, rather than
  rendering something silently broken. [[rule: tabs-parts-require-provider | runtime]]
- **Only the active panel renders.** Do not rely on hidden panels holding DOM state. [[rule: tabs-only-active-panel-renders | runtime]]
- Controlled and uncontrolled are exclusive. [[rule: tabs-controlled-exclusive | compiler]]

## Token bindings

Trigger rest `--vela-text-de-emphasized`; hover `--vela-text-default`; selected
`--vela-text-link` with a 2px `--vela-border-active` underline. List rule
`--vela-border-subtle`.

## Implementations

Tabs ships from both entry points (`decisions/002-agent-ready-direction`). Same spec, same
`Tabs.css`, same unit tests — `src/components/Tabs/Tabs.test.tsx` runs every case against both —
and the same compiler fixtures in `scripts/verify-pack.mjs`. The playground's Tabs page has an
*Implementation* control that renders the same props through either.

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela` | **core** — hand-rolled (`src/components/Tabs`) | **none** | Approved |
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `Tabs` (`src/headless/Tabs`) | **`@base-ui/react` (optional peer, via `/headless`)** | Experimental |

Where Base UI's defaults differ from this spec, the headless implementation maps to the spec and
the difference is recorded here rather than hidden:

- **Activation.** Base UI activates on Enter/Space by default (`activateOnFocus: false`); this
  spec says the arrow key selects, so the headless `Tabs.List` sets `activateOnFocus`. Loop
  (`loopFocus`) and Home/End are Base UI defaults and match the spec.
- **Disabled tabs.** Base UI's own `disabled` prop follows the "focusable when disabled" pattern:
  `aria-disabled="true"`, no native attribute, and the arrow keys *land on* the tab so a
  screen-reader user can discover it. This spec says a disabled tab is **skipped**, and `Tabs.css`
  keys on `:disabled`, so the headless `Tabs.Trigger` renders the native `disabled` attribute
  through Base UI's `render` prop instead. Base UI's roving focus skips a natively disabled
  element, the browser keeps it out of the tab order and swallows its clicks, and the stylesheet
  needs no change. Consequence: Base UI's automatic fallback when the *selected* tab later becomes
  disabled (uncontrolled mode) does not run — the core does not do that either.
- **`aria-controls` on inactive tabs.** The core sets `aria-controls` on every trigger, pointing at
  a panel id whether or not that panel is rendered. Base UI wires it only while the panel is in
  the DOM, so on the headless implementation an inactive tab has no `aria-controls`. Base UI's is
  the stricter reading of ARIA (no reference to an element that does not exist); the shared test
  asserts the active pair only.
- **Extra attributes.** Base UI adds `data-orientation`, `data-activation-direction`,
  `data-active` and `data-index`; ids are Base UI's (`base-ui-…`) rather than
  `<prefix>-tab-<value>`. None of them is styled or part of the contract.
- **Orientation.** Base UI supports `orientation="vertical"`; this spec does not expose it. The
  prop set stays closed on both implementations.

## Responsive behaviour

The tab list is a single row that **scrolls horizontally** when the triggers no longer fit
(`overflow-x: auto`); triggers never wrap or shrink (`white-space: nowrap`), because a tab
label broken over two lines reads as two tabs. Keyboard users reach every tab regardless of
scroll position (arrow keys move the roving tab stop and the browser scrolls the focused
trigger into view). What is **not** yet done: there is no visual cue that more tabs exist off
the edge, and no collapse into a menu on narrow hosts; both are spec gaps tracked for the
headless migration in Phase 1 — name them rather than inventing a pattern. The panel fills its
container and reflows its own content. Density tokens do not exist yet (see `DESIGN.md`,
*Responsive and density*); until they do, the two sizes are the only density control.

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
