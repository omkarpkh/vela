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
- **A pointer press grows the underline in place.** The pressed tab's Seed grows from its centre
  into the full underline where it is, and the old underline shrinks back and fades under the old
  tab. Nothing travels across the row, and only `transform` and `opacity` change: every layer is
  its own tab's full width, centred under it, and its `left` and `width` never change. [[rule: tabs-press-grows-in-place | browser]]
- **A keyboard switch is instant.** Arrow keys, Home and End change the selection, the colours and
  the underline at once; nothing in the Tabs animates, and no Seed shows. [[rule: tabs-keyboard-switch-is-instant | browser]]
- **A second press mid-flight retargets.** Every layer turns towards its new end from wherever it
  is — the half-grown underline under the first tab shrinks back from where it got to — and the
  underline ends under the second tab; nothing finishes the old change first or snaps. [[rule: tabs-press-retargets | browser]]
- **Under reduced motion a press lands at its end state.** The collapsed transitions leave the
  pressed tab's line full under it, every other line gone, and hand the underline straight back
  to the tab's border. [[rule: tabs-press-reduced-motion-end-state | browser]]
- **At rest the underline is the selected tab's own border.** The selected tab's line lies on that
  border in the same colour, on the same pixels, so a still tab list renders exactly as the border
  alone did; the border is set aside only while a pointer press is in flight. [[rule: tabs-underline-rest-is-the-border | browser]]
- **The underline is never clipped.** The list scrolls, so it clips at its padding box; the 2px
  underline, its line and every Seed lie wholly inside it, over the list rule's pixel, and render 2px. [[rule: tabs-underline-not-clipped | browser]]
- **In forced colours the selected tab is the only one marked.** The selected tab's label and
  underline are `Highlight`; no other tab has an underline; a disabled tab is `GrayText`. [[rule: tabs-forced-colours-selected | browser]]
- **The Seed waits for a resting pointer.** It starts to appear only once the pointer has rested
  `--vela-delay-preview` (80ms) on the tab, so a pointer sweeping across the row shows nothing. It
  fades in over `--vela-duration-travel` on `--vela-ease-out` to `--vela-opacity-preview`, and
  leaves faster than it came: at once, over `--vela-duration-base`. [[rule: tabs-preview-rest-delay | browser]]
- **Never on the selected tab, never on a disabled one.** The Seed previews a selection that has
  not happened; on the selected tab there is nothing to preview, and a disabled tab cannot be
  chosen. [[rule: tabs-preview-never-selected-or-disabled | browser]]
- **The Seed is for a pointer that can hover.** Every rule that shows it sits under
  `@media (hover: hover)`, so touch never sees it; keyboard focus never shows it, and a keyboard
  switch puts it away until a pointer moves over the list again. [[rule: tabs-preview-pointer-only | browser]]
- **The Seed is a third of its tab, never under `--vela-tab-preview-width-min` (24px), never
  wider than the tab, and centred under it.** A third of a two-letter tab would be about 4px. [[rule: tabs-preview-size | browser]]
- **In forced colours the Seed is `CanvasText`, never `Highlight`.** A solid 1px line at its own
  length, with no mask, so preview and selection differ in colour, weight and length and never
  collapse into one mark. [[rule: tabs-preview-forced-colours | browser]]
- **The Seed and the line are decorative.** Two empty `aria-hidden` spans inside each trigger:
  the tab's role, its accessible name and the single roving tab stop are unchanged, and the list
  holds nothing but its tabs. [[rule: tabs-preview-decorative | runtime]]

## Token bindings

Trigger rest `--vela-text-de-emphasized`; hover `--vela-text-default` (an unselected trigger only:
the selected one keeps `--vela-text-link` under the pointer); selected `--vela-text-link` with a
2px `--vela-border-active` underline. List rule `--vela-border-subtle`, 1px, drawn inside the
list (an inset shadow) so the underline lies over it without being clipped. The list scrolls
sideways only (`overflow-x: auto; overflow-y: hidden`). In forced colours: the selected label and
underline `Highlight`, other labels `CanvasText`, disabled `GrayText`, the list rule a
`CanvasText` border, the focus ring `Highlight`.

The hover preview, **the Seed**: a soft-ended bar in the underline's 2px slot (`--vela-stroke-2`),
in `--vela-border-active` at `--vela-opacity-preview` (0.55), a third of the tab wide and never
under `--vela-tab-preview-width-min` (24px). It appears after `--vela-delay-preview` (80ms). On a
press it grows into the underline: the same 2px `--vela-border-active`, square-ended, at full
strength. In forced colours the Seed is a 1px `CanvasText` line and the grown underline `Highlight`.

**Contrast.** The Seed is 2.46:1 against the page in light (2.34:1 on a container) and 2.59:1 in
dark (2.48:1), under the 3:1 that WCAG 1.4.11 asks of the parts of a control a person needs to see.
It is not asserted in `PAIRS`, on purpose, and `scripts/contrast-core.mjs` says why beside the
pairs: it is a supplementary hint, never the only sign of anything. The hover is carried by the
label's own colour change (`--vela-text-de-emphasized` to `--vela-text-default`, both asserted as
text), the selection by the full-strength underline (asserted at 3:1 on the page and on a
container), and keyboard and touch users, who never see the Seed, lose nothing. It is the same
reasoning as the Tooltip's edge and the Risk Pill's border.

## States

- **Hover** (a pointer that can hover, on an enabled unselected tab) — the label settles to
  `--vela-text-default`; after the pointer rests, the Seed fades in under it.
- **Focus** — the shared `:focus-visible` ring. Focus never shows the Seed.
- **Selected** — `aria-selected="true"`: `--vela-text-link` and the 2px underline, which at rest is
  the tab's own border. No Seed.
- **Disabled** — native `disabled`: `--vela-text-inactive`, skipped by the arrow keys, no Seed.
- **Pressed** (pointer) — the Seed under the pressed tab grows into the underline in place; see
  *Motion*. There is no scale-down press on a tab: the underline is the press feedback.

## Motion

A tab switch happens hundreds of times a day, so the selection itself is never animated: the new
tab's colour, its `aria-selected` and its panel arrive at once. Two things move, and only for a
pointer. Resting on a tab previews where a click will land (feedback); pressing it turns that
preview into the underline where it is (continuity: the same mark, changing state).

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Pointer rests on an unselected, enabled tab | the Seed fades in under it: opacity | after `--vela-delay-preview` (80ms), `--vela-duration-travel` (240ms), `--vela-ease-out` | feedback before the click; the rest stops a sweep across the row from flickering |
| Pointer leaves that tab | the Seed fades out where it is: opacity | `--vela-duration-base` (180ms), `--vela-ease-standard`, no delay | leaving is quicker than arriving; one Seed per tab, so between tabs it fades, never glides |
| Pointer press on another tab | its Seed grows from its centre into the underline (`scaleX`, opacity); the old underline shrinks back and fades under its own tab | `--vela-duration-travel` (240ms): scale on `--vela-ease-spring`, opacity on `--vela-ease-out` (the Seed) and `--vela-ease-standard` (the square line) | continuity; nothing travels across the row, so the eye stays on the tab it pressed |
| A second press mid-flight | every layer retargets from where it is | as above | continuity: CSS transitions are interruptible |
| Arrow keys, Home, End, Enter, Space | nothing — colour and underline change at once, no Seed | none | from the keyboard, nothing animates |
| Hover | the label colour | `--vela-duration-fast`, `--vela-ease-standard` | unchanged |

**Changed from the first motion pass.** A pointer press used to slide one list-wide bar (the
indicator) from the old tab to the new one. That bar is gone, and with it the rules that described
it: `tabs-indicator-moves-by-transform` is now `tabs-press-grows-in-place`,
`tabs-indicator-retargets` is `tabs-press-retargets`, `tabs-indicator-reduced-motion-end-state` is
`tabs-press-reduced-motion-end-state`, and `tabs-indicator-rest-is-the-border` is
`tabs-underline-rest-is-the-border`. Each keeps what the old rule promised (transform and opacity
only, retargeting, the reduced-motion end state, the border at rest) for the new movement.

How it is built, the same on both implementations and in the one `Tabs.css`:

- **Two layers per trigger.** Each trigger holds two empty, `aria-hidden` spans in its underline's
  slot, the 2px below its padding box: the Seed (soft ends, from a static alpha mask in its own
  box) and the line (square ends), the underline the Seed grows into. Both are the trigger's full
  width scaled from the centre, so every change is `transform` or `opacity`.
- **At rest the underline is the selected trigger's own border**, as before. The selected tab's
  line lies on it at full strength, the same colour on the same pixels, so that it can shrink away
  when another tab is pressed; every other line, and every Seed, is at `opacity: 0`.
- **The Seed** is shown by CSS alone, under `@media (hover: hover)`, on
  `:hover:not(:disabled):not([aria-selected="true"])`. Its transition into the hover state carries
  the `--vela-delay-preview` delay and the transition out of it carries none, so a pointer that
  leaves within the rest cancels the fade before anything moved.
- **A pointer press** (recorded in the capture phase, so it is known before either implementation
  activates the tab) marks the list `data-vela-moving` in the event itself, before the new
  selection is committed, and the component keeps the mark through React. The pressed tab's border
  is set aside, its Seed and line grow to full width and strength, and the old tab's line shrinks to
  the Seed's size and fades. The mark is written first because the selection and the mark must
  reach the style engine together: a recalculation that saw the new selection without the mark
  started the line with no transition, and the underline jumped. When every animation on the
  layers has finished, the mark is removed and the border takes over again, in the same place, at
  once. The end is read from the animations, not a timer, so a slowed review playback still ends
  correctly.
- **A keyboard change** marks the root `data-vela-instant` instead (the repository's convention
  for "this change came from the keyboard"): no transition anywhere in the Tabs, and no Seed. The
  mark clears when a pointer moves over the list again, which brings the Seed back after the rest.
- **The Seed's size** needs the trigger's width (a third, floored at
  `--vela-tab-preview-width-min`, never over 1), which CSS cannot divide by, so each implementation
  measures its triggers with a `ResizeObserver` and writes the scale to one custom property per
  trigger, which only `Tabs.css` reads. The floor is read from the token on the trigger's computed
  style, so it has one source. The property is internal: it is not a token and not part of the API.
- **Reduced motion**: the global collapse in `base.css` shortens every duration to almost nothing,
  so a press lands at its end state, exactly like a keyboard switch. The 80ms rest before the Seed
  is a dwell, not motion, and it survives: `base.css` collapses durations, not delays (like
  `--vela-delay-tooltip`). Under reduced motion a sweep still shows nothing, and a rest shows the
  Seed at its strength at once.

No prop turns any of this on or off; the prop set stays closed. See [Motion](../foundations/motion.md).

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
- **The indicator.** Base UI's `Tabs.Indicator` (a bar that travels to the selected tab, placed
  from its `--active-tab-left` and `--active-tab-width`) is not rendered: this spec grows the
  underline in place. The headless triggers render the same two layers as the core, and the motion
  state and the Seed's measured size come from the same hooks (`components/Tabs/motion.ts`).
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

**The hover preview has no Figma variant.** It is a moment, not a state the markup carries, so the
set gains no `State=hover`; its three tokens reach the library through the token sync as
`opacity/preview`, `delay/preview` and `tab/preview-width-min`, beside `opacity/scrim` and
`delay/tooltip`.

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
- ❌ A Seed (or any hover mark) as the only sign of something → the label's colour carries the hover; the Seed is supplementary.
