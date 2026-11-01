# Tabs

Navigate between **different** content panels.

**Dependencies:** none

## When to use Tabs (vs. something else)

- Different content sections (Alerts / Assets / Audit) → **Tabs**.
- The **same** dataset rendered differently (Grid / Dashboard / Chart) → **View Switcher**,
  which is **not in this kit**. Flag the gap; do not substitute Tabs. If only the
  *presentation* of one dataset changes, it is not Tabs.
- Sequential steps → a Wizard, not Tabs.
- More than ~7 panels → reconsider the information architecture. When the row is narrower than its
  tabs (a side panel, a phone), the headless Tabs puts the tabs that don't fit into "N more" (see
  *Overflow*); that is for a narrow host, not for a long list of panels.

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
| | `size` | `"regular" \| "large"` | **These two only.** Default `regular`. |
| `Tabs.List` | `aria-label` | `string` | **Required.** |
| `Tabs.Trigger` | `value` | `string` | Must match a Panel. |
| | `count` | `number` | Optional numeric badge. |
| | `disabled` | `boolean` | Skipped by arrow-key navigation. |
| | `unseen` | `boolean` | **Headless only.** The tab holds changes the person hasn't seen: set it when they arrive, clear it when the tab is opened. A hidden tab with `unseen` adds "· 1 new" to the "N more" control. The core trigger does not accept it. |
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

The overflow rules (see *Overflow*). The five tests decided on 30 Oct 2026 prove the first three
and the fifth. Each says whether the core keeps it ("both") or only the headless Tabs has it.

- **The open tab never leaves view (headless).** It sticks to the edge it would leave by, its focus
  ring's reach in from it, and the tabs that pass under it fade out where they meet it. The core has
  no sticky tab: it scrolls the open tab wholly into view whenever it opens, and a person scrolling
  the row can still move it out (the gap named under *Overflow*). [[rule: tabs-overflow-open-tab-in-view | browser]]
- **A clicked or focused tab ends wholly in view, focus ring included (both).** Clicked while
  partly hidden, or reached by the arrow keys, Home or End, the tab and its whole ring end inside
  the row, clear of the fades and of the stuck open tab. The ring is never clipped, at the top, the
  bottom or either end of the row: the list reaches the ring's width past the tabs on every side. The row moves as little as
  it can, and never while a pointer is still down on it, so the click lands on the tab it started
  on. [[rule: tabs-overflow-reveal-whole | browser]]
- **When tabs are hidden, a visible cue says so (both).** The edge where more tabs are fades; on the
  headless row the "N more" control says how many as well. A fade is drawn only where tabs are
  hidden. [[rule: tabs-overflow-cue | browser]]
- **The cue survives forced colours (both).** The system removes the fade, so the edge where more
  tabs are becomes one 1px `CanvasText` line; at the stuck open tab the edge is a half gap of
  `Canvas` and then that line. The control's clear border is `Canvas`, and its words stay words.
  [[rule: tabs-overflow-forced-colours | browser]]
- **The Seed is never cut below 24px while the pointer is on any visible part of its tab (both).**
  On a tab that is not wholly in view the Seed doesn't show at all; the label's colour still answers
  the pointer, and a click brings the tab into view. [[rule: tabs-overflow-seed-never-cut | browser]]
- **The count is measured, never a prop (headless).** "6 more" is the number of tabs the list
  offers that are not wholly in view: cut by an edge, under a fade or under the stuck open tab. A
  disabled tab is not in the list, so it is not counted, and the count always matches what the list
  offers. No prop sets it and no threshold holds it back: it shows whenever one such tab is hidden.
  [[rule: tabs-overflow-count-measured | runtime]]
- **`unseen` is the headless trigger's only.** The core trigger has no overflow control to show it,
  so `unseen` on the core `Tabs.Trigger` doesn't compile. [[rule: tabs-unseen-headless-only | compiler]]
- **News is words (headless).** The control reads "6 more · 1 new", where 1 is the number of hidden
  tabs with `unseen`; a tab in view adds nothing. The news is semibold `--vela-text-default` words,
  never a colour or a dot alone. The control's spoken name starts with its visible words, in order
  (WCAG 2.5.3, Label in Name): "6 more, 1 new. Show all tabs", or "6 more. Show all tabs"; the dot
  between the words is hidden from assistive technology. [[rule: tabs-overflow-news-words | runtime]]
- **News is announced once, politely (headless).** When the number of hidden tabs with news grows,
  a polite live region says "All tabs, 1 with new items" once. Nothing is announced on the first
  render, or when news is cleared. [[rule: tabs-overflow-announce-news | runtime]]
- **The list holds every tab in row order (headless).** The control opens a Dropdown List named "All
  tabs" with every tab that can be opened, by its full name, in row order, not only the hidden ones.
  The open tab is current and says "open"; a tab with `unseen` says "new". Choosing one opens it as a
  click would and scrolls the row to it. [[rule: tabs-overflow-list-every-tab | runtime]]
- **The control is outside the scroller (headless).** It sits at the row's end, so a count changing
  from 6 to 7 never moves a tab, and its focus ring is never clipped. [[rule: tabs-overflow-control-outside | browser]]
- **One line, unbroken (headless).** The row is one tab high with nothing below it (no scrollbar),
  and one thin `--vela-border-subtle` rule runs under the tabs and the control without a break. No
  new shapes: no pills, circles, arrows or dividers. [[rule: tabs-overflow-one-line | browser]]
- **Nothing appears when everything fits (both).** No control, no fade, no sticky tab: the row is
  exactly today's. [[rule: tabs-overflow-nothing-when-fits | browser]]
- **Scrolling a tab into view is instant (both).** From the pointer, the keyboard and the list
  alike, so reduced motion needs nothing more; the control's own hover and press collapse with the
  global rule. [[rule: tabs-overflow-scroll-instant | browser]]

## Token bindings

Trigger rest `--vela-text-de-emphasized`; hover `--vela-text-default` (an unselected trigger only:
the selected one keeps `--vela-text-link` under the pointer); selected `--vela-text-link` with a
2px `--vela-border-active` underline. List rule `--vela-border-subtle`, 1px, along the tabs'
bottom edge, so the underline lies over it without being clipped. The list scrolls sideways only
(`overflow-x: auto; overflow-y: hidden`). In forced colours: the selected label and underline
`Highlight`, other labels `CanvasText`, disabled `GrayText`, the list rule `CanvasText` one pixel
below the tabs, the focus ring `Highlight`.

**The focus ring's room.** A scroller clips at its padding box, and the ring lies outside its tab
(`--vela-focus-ring-width` plus `--vela-focus-ring-offset`, 4px). So the list has that much padding
on every side and gives it back as a negative margin: the ring of any tab, at the top, the bottom
and either end of the row, is inside the box, while the tabs, the row's height and its baseline stay
where they were. The list rule therefore can't be the list's border or an inset shadow, which lie at
the box's edge: it is a `::before` as wide as the tabs' row, on its bottom edge, sticky at the start
so it stays put while the tabs scroll, and taking no room in the row. On the headless row the row
draws the rule instead. A host that styles the list (the site's sticky page tabs) styles that
larger box: it sticks a ring's width higher and paints its background on the content box.

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

**Overflow** (see *Overflow*). The "N more" control is an unselected tab's text: rest
`--vela-text-de-emphasized`, hover and open `--vela-text-default`, the news `--vela-text-default` at
`--vela-font-weight-semibold`, and its chevron `currentColor`. Its box is a tab's: `--vela-space-10`
above and below and a clear `--vela-stroke-2` bottom border, `--vela-space-20` from the row and
`--vela-space-5` from its words to the chevron. The fade is `--vela-space-20` wide. The stuck open
tab stands the focus ring's reach (`--vela-focus-ring-width` plus `--vela-focus-ring-offset`) in from
the edge, and its edge is half a gap (`--vela-space-10`) past it. **No new token, and no new colour
pair:** every colour here is a tab's, already asserted in `PAIRS` (`--vela-text-de-emphasized` and
`--vela-text-default` on the page), and the fade and the forced-colours line are not colours. The
list is the Dropdown List, with its own pairs: its current item's name stays `--vela-text-default`,
because `--vela-text-link` on the dark raised surface is 4.35:1, under 4.5, so only its check (a 3:1
mark) uses the link colour, and its highlight is `--vela-bg-raised-hover`.

## States

- **Hover** (a pointer that can hover, on an enabled unselected tab) — the label settles to
  `--vela-text-default`; after the pointer rests, the Seed fades in under it.
- **Focus** — the shared `:focus-visible` ring. Focus never shows the Seed.
- **Selected** — `aria-selected="true"`: `--vela-text-link` and the 2px underline, which at rest is
  the tab's own border. No Seed.
- **Disabled** — native `disabled`: `--vela-text-inactive`, skipped by the arrow keys, no Seed.
- **Pressed** (pointer) — the Seed under the pressed tab grows into the underline in place; see
  *Motion*. There is no scale-down press on a tab: the underline is the press feedback.
- **Not wholly in view** — a tab cut by an edge, under a fade or under the stuck open tab shows no
  Seed (`tabs-overflow-seed-never-cut`).

The "N more" control (headless): default `--vela-text-de-emphasized`; hover `--vela-text-default`,
in at `--vela-duration-fast`, out at `--vela-duration-base`, and no Seed; pressed (pointer only)
`scale(0.97)` in at `--vela-duration-instant`; open (`aria-expanded="true"`) `--vela-text-default`;
focus the global ring, never clipped. It has no selected state: the open tab never hides.

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

## Overflow

What the row does when its tabs no longer fit. Omkar decided it between 30 Oct and 1 Nov 2026
(approved 1 Nov, as part of the refinement phase): overflow is part of Tabs, never a pattern a person
assembles; the "more" control is the **headless** Tabs' only; the core keeps its plain scrolling row
with the fixes that keep it honest, and this section names what it lacks.

**Both implementations.**
- The row scrolls sideways, as before. Swiping, trackpads and the keyboard still scroll it; there are
  no arrow buttons.
- A tab that is opened, clicked or focused is scrolled wholly into view, its focus ring included,
  clear of the fades (`tabs-overflow-reveal-whole`). The open tab is brought into view when the Tabs
  first render too. The scroll is instant (`tabs-overflow-scroll-instant`).
- The edge where more tabs are fades over `--vela-space-20` (`tabs-overflow-cue`). The fade is a mask
  on each tab that reaches the edge, never on the row, so the rule under the tabs stays one unbroken
  line. In forced colours the fade is gone and the edge is one 1px `CanvasText` line
  (`tabs-overflow-forced-colours`).
- A tab not wholly in view shows no Seed (`tabs-overflow-seed-never-cut`).
- When every tab fits, nothing of this appears (`tabs-overflow-nothing-when-fits`).

**Headless only: the "N more" control and the sticky open tab.**

| Part | What it is |
|---|---|
| Label | "6 more" while tabs are hidden; "6 more · 1 new" when hidden tabs have news. The count and the news are measured (`tabs-overflow-count-measured`). Numbers are tabular. |
| Spoken name | "6 more, 1 new. Show all tabs", or "6 more. Show all tabs": the visible words first, in order, then what it does (WCAG 2.5.3). News arriving is announced once, politely, as "All tabs, 1 with new items" (`tabs-overflow-announce-news`). |
| Looks | An unselected tab, plus a 16px `chevron-down` in `currentColor` that never turns. No Seed: it opens a list, not a tab. |
| Place | At the row's end, outside the scroller, `--vela-space-20` from it (`tabs-overflow-control-outside`). |
| When | Whenever a tab is hidden. One rule, no threshold. |
| The list | A Dropdown List named "All tabs", aligned to the control's end: every tab that can be opened, in row order, by its full name; the open tab is current and says "open"; a tab with `unseen` says "new" (`tabs-overflow-list-every-tab`). Choosing one opens it and scrolls the row to it, and focus goes back to the control. |
| The open tab | Sticks to the edge it would leave by, the focus ring's reach in from it; the tabs that pass under it fade out where they meet it, with the same fade as the far edge, and no divider (`tabs-overflow-open-tab-in-view`). In forced colours its edge is a half gap of `Canvas` and one `CanvasText` line. |
| Forced colours | The control's clear border is `Canvas`; the list rule moves from the scroller to the row, so it runs under the control. |

Five rules keep the row elegant, and the tests hold them: one thin line, unbroken; one line high, with
nothing below the row (the headless scroller draws no scrollbar); no new shapes (no pills, circles,
arrows or dividers); edges are fades, not lines, except in forced colours; and nothing appears until
it is needed (`tabs-overflow-one-line`, `tabs-overflow-nothing-when-fits`).

**Why "new" and not "1 new" in the list.** `unseen` is a yes or no on a tab, not a count of its new
items, so a tab's row in the list says "new"; the control counts tabs, so it says "1 new".

**Disabled tabs.** A disabled tab is not in the list: it can't be opened, and a Dropdown List item
that can't be chosen must say why (`dropdown-list-locked-has-a-cause`), which a Tabs trigger has no
prop to say. So it is not counted in "N more" either: the count is what the list offers. When it is
hidden it is reachable by scrolling the row only, where it reads as disabled. If a disabled tab is
ever the open one, the list keeps it, so the list always has its current item.

**Recorded deviation: the open tab sticks at both edges.** The note of 30 Oct 2026 says the open
tab sticks to the left edge. Built that way, a person scrolling the row back towards its start can
push an open tab that lies further along out past the right edge, which breaks the decided rule
that the open tab never leaves view (test 4). So it sticks to whichever edge it would leave by,
the same way at both, with the same fade and, in forced colours, the same Canvas gap and line.
Kept by Omkar's coordinator on 2 Nov 2026.

**Core: what it does, and the gap.** The core has no "more" control, no list and no sticky open tab
(Omkar, 30 Oct 2026). It scrolls, fades and reveals as above, so a hidden tab is always signalled and
a tab you reach is always whole. What it lacks: the count, the news, and a way to reach a hidden tab
without scrolling; and after a person scrolls the row themselves the open tab can be out of view.
Use the headless Tabs where that matters. **The core keeps the platform's scrollbar**, decided here:
with the arrows dropped and no "more" label, the cue the core owns is the fade, and in forced colours
the line that replaces it; both show in every mode. The scrollbar is the platform's own cue where the
platform draws one (classic scrollbars on Windows), so hiding it would remove a cue and add nothing.
It is not relied on: overlay scrollbars (macOS, phones, a headless browser) show only while scrolling.
The headless row hides it, because its control is the cue and its row is one line high.

**The focus ring is never clipped** (see *Token bindings*, The focus ring's room). Until 2 Nov 2026
the scroller cut the top and bottom of every focused tab's ring, and on the core row the outer side
of the first or last tab's; the list now reaches the ring's width past the tabs on every side.

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
- **Overflow.** The headless `Tabs.List` renders its tablist inside a row (`vela-tabs__row`) that
  also holds, while tabs are hidden, the "N more" control (`vela-tabs__more`, a Dropdown List
  trigger) and a polite live region; the rule moves from the list to the row. The tablist itself
  still holds nothing but its tabs. The headless trigger takes `unseen`, and carries its value and
  its news as `data-vela-value` and `data-vela-unseen` for the measure; neither is styled or part of
  the contract. The core list is unchanged: no row, no control.

## Responsive behaviour

The tab list is a single row that **scrolls horizontally** when the triggers no longer fit
(`overflow-x: auto`); triggers never wrap or shrink (`white-space: nowrap`), because a tab label
broken over two lines reads as two tabs. What happens then is *Overflow*: on both implementations
the edge where more tabs are fades (a line in forced colours) and a tab you open, click or focus is
scrolled wholly into view; on the headless one the tabs that don't fit go into "N more", a list of
every tab, and the open tab sticks to the edge. The row's minimum is one tab and, on the headless
row, the control beside it; below that it still scrolls, and nothing clips or truncates a label.
The panel fills its container and reflows its own content. Density tokens do not exist yet (see
`DESIGN.md`, *Responsive and density*); until they do, the two sizes are the only density control.

## Accessibility

This is the reason Tabs is more than a styled list:

- Correct roles throughout: `tablist` / `tab` / `tabpanel`, with `aria-selected`,
  `aria-controls` and `aria-labelledby` wired both ways.
- **Roving tabindex** — the whole tablist is one Tab stop; Left/Right move between tabs and
  Home/End jump to the ends. Disabled tabs are skipped, and the list wraps.
- The panel is focusable so keyboard users land in the content after activating a tab.
- **Overflow (headless).** The "N more" control is a button outside the tablist, after it in the Tab
  order, named "6 more, 1 new. Show all tabs": its visible words first, so speech input can say what
  it sees (WCAG 2.5.3, Label in Name; axe's `label-content-name-mismatch` runs on it). It opens a
  menu of radio items (the Dropdown List) on click, Enter, Space or Arrow Down, landing on the open
  tab. News arriving in a hidden tab is announced once through a polite live region.

## Figma mapping

Library file: **Vela Design System** → page `Tabs`. The component set is a single **Tab**, not the
whole tablist: eight variants, `State` default, selected and disabled at both sizes and
`State=hover` at both sizes, plus a `Count` boolean. Compose a tablist by placing Tab instances in
a row.

| Figma property | Code equivalent |
|---|---|
| `State=selected` | the active `value` on `<Tabs>` |
| `State=disabled` | `disabled` on `<Tabs.Trigger>` |
| `State=hover` | the pointer resting on an enabled, unselected tab, not a prop |
| `Size` | `size` on `<Tabs>` |
| `Count` (boolean) | `count` on `<Tabs.Trigger>` |

**The hover preview is the `State=hover` variant: the label in text/default, the Seed under it.**
It shows where the moment ends: the Seed at `opacity/preview`, `stroke/2` tall on the tab's bottom
edge, a third of the tab and never under `tab/preview-width-min`, soft-ended by an alpha mask. Its
width is measured when the variant is built and scales with the tab after that. The rest before it
appears (`delay/preview`), the fade and the press exist only in code. The variants were added to the
published set in place, by `scripts/figma/components/tabs.seed-hover.extend.figma.js`.

**The overflow control is its own set, "Tabs overflow control", headless only**, on the same page,
built by `scripts/figma/components/tabs-overflow-control.figma.js` (written, not yet run). It is a
part, not an export: Tabs draws it when tabs overflow, so no one imports it, and the map and the
Status page say so. Its properties:
- `State`: default, hover or open. Hover is the pointer resting on it; open is `aria-expanded`.
- `News` (boolean): whether hidden tabs have news, the "· 1 new" words.
- `Count text` and `News text` (text): "6 more" and "· 1 new", written by the designer.
Its list is an instance of the Dropdown List set. The count and the news are measured in code; in
Figma they are words a designer writes.

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
- ❌ Passing the number of hidden tabs, or building your own "More" menu beside the tabs → the headless Tabs measures and draws it.
- ❌ A dot, a badge or a colour on a tab for news → set `unseen`; news is words in the control.
- ❌ Arrow buttons at the row's ends, or a divider beside the open tab → no new shapes: the fade, the control and the sticky tab are the whole of it.
