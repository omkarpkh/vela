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
- **The indicator moves by `transform` only.** The bar is the tab list's full width, scaled and
  translated from its left edge; its `left` and `width` never change and never transition. [[rule: tabs-indicator-moves-by-transform | browser]]
- **A keyboard switch is instant.** Arrow keys, Home and End change the selection, the colours and
  the underline at once; nothing in the Tabs animates. [[rule: tabs-keyboard-switch-is-instant | browser]]
- **A second press mid-flight retargets.** The bar turns towards the new tab from wherever it is
  and ends under it; it never finishes the old trip first or snaps. [[rule: tabs-indicator-retargets | browser]]
- **Under reduced motion the switch lands at its end state.** The collapsed transition leaves the
  bar under the selected tab and hands the underline straight back to the tab. [[rule: tabs-indicator-reduced-motion-end-state | browser]]
- **At rest the underline is the selected tab's own border.** The bar is shown only while a pointer
  switch is in flight, so a still tab list renders exactly as it did before the bar existed. [[rule: tabs-indicator-rest-is-the-border | browser]]

## Token bindings

Trigger rest `--vela-text-de-emphasized`; hover `--vela-text-default` (an unselected trigger only:
the selected one keeps `--vela-text-link` under the pointer); selected `--vela-text-link` with a
2px `--vela-border-active` underline. List rule `--vela-border-subtle`. The list scrolls
sideways only (`overflow-x: auto; overflow-y: hidden`). The sliding indicator is the same 2px `--vela-border-active` bar, moved
over `--vela-duration-travel` on `--vela-ease-spring`.

## Motion

A tab switch happens hundreds of times a day, so the selection itself is never animated: the new
tab's colour, its `aria-selected` and its panel arrive at once. What moves is the underline, and
only when a pointer pressed the tab — orientation: it shows where the selection went from.

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Pointer press on another tab | the indicator slides under it: `translateX` and `scaleX` | `--vela-duration-travel` (240ms), `--vela-ease-spring` | orientation; 95% of the way in about 100ms, then a 1.3% settle |
| A second press mid-flight | the same transition retargets from where the bar is | as above | continuity: CSS transitions are interruptible |
| Arrow keys, Home, End, Enter, Space | nothing — colour and underline change at once | none | from the keyboard, nothing animates |
| Hover | the label colour | `--vela-duration-fast`, `--vela-ease-standard` | unchanged |

How it is built, the same on both implementations and in the one `Tabs.css`:

- **At rest the underline is the selected trigger's own border**, as before. The indicator is a
  bar inside the tab list that always sits under the selected tab with `opacity: 0`.
- **A pointer press** (recorded in the capture phase, so it is known before either implementation
  activates the tab) marks the list `data-vela-moving` in the same commit as the new selection.
  In that one style change the bar becomes visible, the selected trigger's border is hidden, and
  the bar's transform gets its new value — so the transition starts from where the bar was. When
  every animation on the bar has finished, the mark is removed and the border takes over again,
  in the same place, at once. The end is read from the animations, not a timer, so a slowed
  review playback still ends correctly.
- **A keyboard change** marks the root `data-vela-instant` instead (the repository's convention
  for "this change came from the keyboard"): no transition on the bar or on the triggers' colours.
  The mark clears when a pointer moves over the list again.
- **Where the bar goes**: the core measures the selected tab itself (no dependency); the headless
  implementation renders Base UI's `Tabs.Indicator` and takes the position from its
  `--active-tab-left` variable and the width from its state. Both feed the same two custom
  properties, which only `Tabs.css` reads; they are not part of the API.
- **Reduced motion**: the global collapse in `base.css` shortens the transition to almost nothing,
  so a pointer switch reads exactly like a keyboard one.

No prop turns this on or off; the prop set stays closed. See [Motion](../foundations/motion.md).

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
