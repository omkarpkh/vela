# Dropdown List

A short list that opens from a button. One option is current, and choosing another acts at once:
it opens that tab or that view, and the list closes. Its first use is the Tabs overflow control
("6 more"), which lists every tab in the row.

**Status:** Experimental — built, and its Figma set is published (31 Oct 2026). It is born in
`@omkarux/vela/headless` (Base UI 1.9 `Menu`) with no core implementation. It is Approved once the
API has settled and the manual screen-reader check in Accessibility is done; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Dropdown List (vs. Select List, vs. Actions Dropdown, vs. Popover)

- Choose **one of a set where one is current**, and the choice **acts at once**: go to a hidden
  tab, switch to another saved view. → **Dropdown List**.
- A **form value** chosen now and submitted later, with a label, validation and an empty state →
  a Select List, **not in this kit**. Flag the gap. A Dropdown List has no "nothing chosen" and is
  never inside a form.
- A list of **commands** (Edit / Duplicate / Delete) → an Actions Dropdown, **not in this kit**.
  Nothing in a Dropdown List is "current", so it would be the wrong role.
- **Several** choices at once, or filters → a **Popover** with a **Checkbox.Group**.
- Two to five options that fit on screen → **Tabs** (sections) or **Radio Group** (a setting).
  Don't hide what fits.
- More than about 50 options, or options that need searching → a combobox, **not in this kit**.
  Flag it.
- A list of **different sections of the same page**, all visible → **Tabs**. A Dropdown List is
  what Tabs uses for the tabs that don't fit, not a replacement for Tabs.
- A list of **pages to go to** (site or app navigation) → links, with `aria-current="page"` on the
  one you are on. That is navigation, **not this component**: a Dropdown List's items are radio
  items, not links.

The items are one radio group inside the menu. The group needs no name of its own: the menu's
`label` names the only choice there is.

## Props

```tsx
<DropdownList
  label="All tabs"
  trigger={<button className="vela-tabs__more">6 more · 1 new</button>}
  items={[
    { value: 'alerts', label: 'Alerts' },
    { value: 'firewall', label: 'Firewall', meta: '1 new' },
    { value: 'archive', label: 'Archive', locked: { reason: 'Needs retention on' } },
  ]}
  value={tab}
  onValueChange={setTab}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** Names the list for assistive technology ("All tabs"). Not shown. |
| `trigger` | `ReactElement` | — | **Required.** One element that renders a `<button>`. It gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. |
| `items` | `readonly [DropdownListItem, ...DropdownListItem[]]` | — | **Required, at least one.** In display order. |
| `value` | `string` | — | The current option (controlled). Must be one of the items' `value`s. Pass `value` or `defaultValue`: there is always a current option. |
| `defaultValue` | `string` | — | The current option (uncontrolled). **Exclusive with `value`.** |
| `onValueChange` | `(value: string) => void` | — | Called when an option is chosen. Not called for the current one. |
| `open` | `boolean` | — | Controlled, as Popover. **Exclusive with `defaultOpen`.** |
| `defaultOpen` | `boolean` | `false` | Uncontrolled initial state. **Exclusive with `open`.** |
| `onOpenChange` | `(open: boolean) => void` | — | |
| `align` | `"start" \| "end"` | `"start"` | **These two only.** Which edge of the trigger the list lines up with. Tabs uses `end`. |

`DropdownListItem` is `{ value: string; label: string; meta?: string; locked?: { reason: string } }`,
**these four only**, and `meta` and `locked` are exclusive: they share the slot at the end of the
row, which can't hold a count and a reason at once. There is no icon, no description line, no
group, no divider and no submenu.

**Changed in Unreleased:** `locked: { reason }` replaces 0.14.0's `disabled?: boolean`, so a
locked item can't be written without its reason, and the field has Segmented Control's name and
shape. `{ disabled: true, meta: 'Why' }` becomes `{ locked: { reason: 'Why' } }`.

## Hard constraints

- **`label` is required and is a `string`.** An unnamed menu is announced as "menu" and nothing
  else. [[rule: dropdown-list-label-required | compiler]]
- **`trigger` and at least one item are required.** The items type is a non-empty tuple, so `[]`
  doesn't compile. [[rule: dropdown-list-items-required | compiler]]
- **Controlled and uncontrolled are exclusive**, for the value and for open: `value` or
  `defaultValue`, `open` or `defaultOpen`. Both is a build failure, as on Tabs and Popover.
  [[rule: dropdown-list-controlled-exclusive | compiler]]
- **Two alignments.** `start` and `end`; there is no `center`, `left` or `right`. The list always
  opens below and flips above on its own when there is no room. [[rule: dropdown-list-align-closed | compiler]]
- **An item has four fields.** `value`, `label`, `meta`, `locked`. An `icon`, `description`,
  `children` or `onClick` doesn't compile: choosing calls `onValueChange`, nothing else. A
  `locked` item has a `reason` string, and `meta` and `locked` together don't compile; nor does
  0.14.0's `disabled`. [[rule: dropdown-list-item-closed | compiler]]
- **The current value must exist.** A `value` or `defaultValue` that matches no item throws a
  named error, rather than opening a list with nothing marked. [[rule: dropdown-list-value-exists | runtime]]
- **It is a menu of radio items, opened from a button.** The popup is `role="menu"` named by
  `label`. Each item is `role="menuitemradio"`, and exactly the current one has
  `aria-checked="true"`. The trigger renders a `<button>`; in development, anything else throws a
  named error. [[rule: dropdown-list-menu-radio | runtime]]
- **The item's whole text is its name.** The accessible name includes `meta` ("Firewall, 1 new"),
  so what is seen is what is heard. [[rule: dropdown-list-meta-in-name | runtime]]
- **Choosing closes it and returns focus.** A click, Enter or Space on an item calls
  `onValueChange`, closes the list and puts focus back on the trigger. Choosing the current item
  closes the list and returns focus too, **without** calling `onValueChange`: nothing changed.
  [[rule: dropdown-list-choose-closes | runtime]]
- **Opening lands on the current item, however it opens.** A click, Enter, Space, Arrow Down and
  Arrow Up all put focus on the current item, not the first or the last, so a keyboard user starts
  where they are. The next arrow key moves on from the current item, and the loop wraps from it
  when it is the last. A locked current item still takes focus.
  [[rule: dropdown-list-focus-current | runtime]]
- **Escape, Tab and a press outside close it.** Escape returns focus to the trigger; Tab closes it
  and moves on through the page. [[rule: dropdown-list-dismiss | runtime]]
- **It is non-modal.** The page keeps its scroll and its accessibility tree, and focus is not
  trapped: Tab leaves the list. A press outside closes it and still reaches what it landed on, as
  on Popover. [[rule: dropdown-list-non-modal | runtime]]
- **A keyboard open is instant.** When the list opens or closes from the keyboard, the trigger
  carries `data-vela-instant` for that change, and loses it on the next pointer interaction.
  [[rule: dropdown-list-trigger-instant-from-keyboard | runtime]]
- **A locked item can be reached but not chosen** (DESIGN.md, *States*, Locked). It stays in the
  arrow-key order, so it can be read, and its reason shows where `meta` would and is heard with its
  name ("Archive, Needs retention on"). It has `aria-disabled="true"`, and choosing it does nothing.
  Icon's `lock` comes before its name, hidden from assistive technology, because the reason is
  already in the row (`icon.md`, *Glyphs*). [[rule: dropdown-list-locked-not-chosen | runtime]]
- **A locked item names a setting or a policy that rules it out; a value the person's role may
  never have is not listed.** A permission is about who the person is; a setting or a policy is
  about the state of things, applies to everyone and can change. A plan limit or a fault isn't
  listed either. "Needs retention on." for a setting; "Set by the Data Retention policy." for a
  policy. The reason never says "Locked". The twin of Segmented Control's
  `segmented-locked-has-a-cause`. [[rule: dropdown-list-locked-has-a-cause | convention]]
- **Names wrap in full, never truncated.** The list is where a long name is read in full, on touch
  too, even a name with no spaces (`customer-ingest-pipeline-eu-west-2`). When the name and its
  meta don't fit side by side, the meta drops under the name. [[rule: dropdown-list-names-wrap | browser]]
- **It holds up in forced colours.** The highlighted item is the system's `Highlight` /
  `HighlightText` pair, and the check is drawn in `currentColor`, so it follows the row's text.
  [[rule: dropdown-list-forced-colours | browser]]
- **`meta` is words, never a colour.** "1 new", "2 new", "3 open". Never a dot alone, never a
  coloured word. [[rule: dropdown-list-meta-is-words | convention]]
- **`meta` is never a taxonomy label.** Never "Critical", "High", "Degraded" or "Malicious". In
  development, a `meta` equal (ignoring case) to a Severity, Risk, Status or Verdict value or label
  logs a warning that names the item and the taxonomy.
  [[rule: dropdown-list-meta-not-a-taxonomy-label | runtime]]

## Token bindings

| Part | Background | Border | Text |
|---|---|---|---|
| popup | `--vela-bg-raised` | `--vela-border-default` | `--vela-text-default` |
| item, highlighted | **`--vela-bg-raised-hover`** (new) | — | `--vela-text-default` |
| item, current: the check | — | — | `--vela-text-link` (a 3:1 mark) |
| item, current: the name | — | — | `--vela-text-default` |
| item `meta` | — | — | `--vela-text-default`, `--vela-font-weight-semibold` |
| item, locked: the name | — | — | `--vela-text-inactive` |
| item, locked: the lock | — | — | `--vela-icon-strong` (Icon's `default` tone, `regular` size) |
| item, locked: the reason | — | — | `--vela-text-default`, so the reason stays readable |
| item, locked, keyboard focus | `--vela-bg-raised-hover` | — | the name stays `--vela-text-inactive` |

**The surface is Popover's:** radius `--vela-radius-4`, a 1px `--vela-border-default` edge and
no shadow (there is no elevation token). Popup padding `--vela-space-5` on every side: the inline
padding keeps the focus ring (2px plus a 2px offset) inside the scrolling popup, which would
otherwise clip it.

**Items:**
- padding is `--vela-space-5` above and below, `--vela-space-10` at the start and `--vela-space-15` at the end;
- under `(pointer: coarse)`, the padding is `--vela-space-10` above and below;
- the check sits in a `--vela-icon-size` (16px) slot that every item keeps, so the names line up;
- the gap between columns is `--vela-space-10`, and between the name and the meta;
- type is Body 14/21.

**The gap to the trigger** is `--vela-space-5`, as on Popover (padding on the positioner's side
facing the trigger).

**New semantic token, `--vela-bg-raised-hover`:**
- light: `grey-100`;
- dark: `grey-800`.

`--vela-bg-hover` can't be used. In dark mode it **is** the raised surface (grey-850), so a highlight
would show nothing (measured 1.00:1). Dialog's close button met the same problem and borrowed the
button's hover fill; a list row isn't a button, so it gets its own semantic.

**New pairs for `PAIRS`** (measured 30 Oct 2026 with `scripts/contrast-core.mjs`):

| Pair | Light | Dark | Threshold |
|---|---|---|---|
| `--vela-text-default` on `--vela-bg-raised-hover` | 6.82 | 7.11 | text 4.5 |
| `--vela-text-link` on `--vela-bg-raised` (the check) | 6.08 | 4.35 | ui 3.0 |
| `--vela-text-link` on `--vela-bg-raised-hover` (the check, highlighted) | 5.39 | 3.50 | ui 3.0 |

**The current item's name is not in the link colour.** `--vela-text-link` on the dark raised
surface is 4.35:1, under the 4.5:1 that text needs. So only the check, which is a 3:1 mark, uses it.

## Sizes

One size. The popup is as wide as its longest row (`max-content`), within these bounds:
- **Minimum width: 200px** (`--vela-dropdown-list-width-min`), or the trigger's width
  (`--anchor-width`) when that is wider.
- **Maximum width:** `--vela-popover-width` (280px).
- **The available width wins over both.** In a narrow host the list is as wide as the room beside
  the trigger, and names wrap inside it.

**New sizing token, `--vela-dropdown-list-width-min`** (200px; Figma `dropdown-list/width-min`).
No existing token is 200px for a reason, and the stylesheets carry no waivers (a new literal is a
new token), so the minimum is a token like `--vela-popover-width`.

**Height:** the lesser of the available height and about ten and a half rows, past which the list
scrolls. The half row says there is more. It is derived from tokens, with no new token:
`calc(10.5 * (var(--vela-text-body-line-height) + 2 * var(--vela-space-5)) + 2 * var(--vela-space-5))`,
with `--vela-space-10` in place of the row padding under `(pointer: coarse)`.

## States

**Trigger:**
- **Closed / open:** `aria-expanded`. Whoever owns the trigger styles it; Tabs keeps its control
  at `--vela-text-default` while the list is open.

**Item:**
- **Default:** as in Token bindings.
- **Highlighted:** under the pointer or keyboard focus (`data-highlighted`). `--vela-bg-raised-hover`,
  with no transition.
- **Current:** the check is shown (`aria-checked="true"`). Every item keeps the check's slot, so
  nothing shifts.
- **Locked:** Icon's `lock`, then the name in `--vela-text-inactive`; the reason, in the meta slot,
  stays `--vela-text-default`, because it says why. The faded name helps the eye skip a row it
  can't choose in a column; a locked segment's label stays `--vela-text-default`, because a row of
  segments is read whole. DESIGN.md requires only that the reason is never faded, so both comply. It can't be chosen. Keyboard focus on it still shows the `--vela-bg-raised-hover`
  surface, so a keyboard user can see where they are (WCAG 2.4.7); the name stays inactive. Pointer
  hover on it changes nothing.
- **With meta:** the meta text at the end of the row, or under the name when the two don't fit
  side by side.

**Focus:** the global ring (`.vela-root :focus-visible`), which reaches the popup because the
portal carries `vela-root`, as on Popover.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Appears | opacity, and `--vela-space-5` of travel from the trigger, on either side (keyed on `data-side`: down when it opens below, up when it flips above) | `--vela-duration-base`, `--vela-ease-standard` | orientation: it came from the button |
| Leaves | opacity only | `--vela-duration-base` | softer than it arrived |
| Highlight moves | nothing; the background changes at once | instant | it follows the pointer and the keys; a fade would lag behind them |
| From the keyboard | nothing; the popup and the trigger carry `data-vela-instant` until the next pointer interaction | instant | from the keyboard nothing animates |

**The trigger's chevron does not turn.** Turning it 180° points it sideways halfway, which means
something else. The planned "bird" chevron (two wings beating once, `icons/01`) belongs to the Icon
work. Until it lands, the chevron is still and the list appearing is the feedback.

Under `prefers-reduced-motion` the global collapse applies.

## Responsive behaviour

- **Width:** as in Sizes: the longest row, at least 200px and the trigger, at most
  `--vela-popover-width`, never wider than the room beside the trigger. In a narrow host it is as
  wide as the space allows and names wrap. Nothing clips and nothing truncates.
- **Height:** about ten and a half rows, or the available height when that is less; past it the
  list scrolls. The current item is scrolled into view on open.
- **Placement:** it flips above the trigger when there is no room below, and shifts along the edge
  to stay in the viewport.
- **Touch:** the same list; items are at least 31px tall (21px line plus 10px of padding), over
  WCAG 2.5.8's 24px, and 41px under `(pointer: coarse)` (21px plus 20px).

## Accessibility

- **Trigger:** `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. It opens on click, Enter,
  Space and Arrow Down; Arrow Up also opens it.
- **Popup:** `role="menu"`, `aria-label` from `label`.
- **Items:** `role="menuitemradio"`, with `aria-checked` on the current one and `aria-disabled` on
  locked ones. The name includes `meta`, or a locked item's reason.
- **Keys:**
  - Arrow Up and Arrow Down move the highlight.
  - Home and End go to the first and last item.
  - Typing a letter jumps to the next name starting with it.
  - Enter or Space chooses.
  - Escape closes and returns focus to the trigger.
  - Tab closes and moves on through the page.
- **Announcing news is the owner's job:** a Dropdown List is closed most of the time. The Tabs
  overflow control announces "1 with new items" once, politely, itself.
- **Forced colours:** the highlighted row is `Highlight` / `HighlightText`, with
  `forced-color-adjust: none` on that row only; the check is `currentColor`; a locked name and its
  lock are `GrayText`. The focus ring is an outline, so it survives.
- **Before Approved, a manual screen-reader check** that `aria-checked` is announced on the current
  item and that the meta is read with the name: NVDA with Firefox, JAWS with Chrome, VoiceOver on
  macOS and on iOS. No automated test hears a screen reader.

## Implementations

Dropdown List ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is
planned.

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless:** Base UI 1.9 `Menu` (`src/headless/DropdownList`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

**Mapped from Base UI:**
- `Menu.Root`, `Menu.Trigger` (through `render`, as Popover does), `Menu.Portal`,
  `Menu.Positioner`, `Menu.Popup`, `Menu.RadioGroup`, `Menu.RadioItem` and
  `Menu.RadioItemIndicator`.
- `menuitemradio` was confirmed in Base UI 1.9's `MenuRadioItem` source on 30 Oct 2026.

**Not exposed:**
- submenus;
- checkbox items;
- group labels;
- `Menu.Arrow`;
- `openOnHover`, which here would compete with the Tabs Seed's pause;
- link items;
- `modal` (see below), `loopFocus`, `highlightItemOnHover` and Base UI's handles and payloads.

**Differences from Base UI:**
- **Focus on open:** checked against `dropdown-list-focus-current` on 30 Oct 2026. Base UI 1.9's
  `MenuRoot` passes no `selectedIndex` to its list navigation, so it highlights the **first** item
  on a keyboard open (the **last** on Arrow Up), and the popup's initial focus goes to the list
  itself on a pointer open; neither meets the rule. Until the person first presses a key or moves
  the pointer in the list, every focus Base UI sends anywhere but the current item is stopped
  before Base UI records it, and the current item is focused instead. Focusing it runs Base UI's
  own item focus handler, so Base UI's `activeIndex` moves to the current item as well as DOM
  focus: the next arrow key continues from it, and a deferred focus to the first item a frame
  later is caught the same way.
- **Choosing the current item:** Base UI's radio group reports it as a change. Here it closes the
  list and does not call `onValueChange`.
- **Closing on a choice:** Base UI's radio items stay open when chosen (`closeOnClick` is `false`
  by default). Here a choice closes the list, and Base UI returns focus to the trigger.
- **Modality:** Base UI's menu is modal by default: it locks the page's scroll and swallows a press
  outside. A Dropdown List passes `modal={false}` (`dropdown-list-non-modal`). The page keeps its
  scroll and its accessibility tree, Tab leaves the list, and a press outside closes the list and
  still reaches what it landed on.
- **The trigger:** Base UI accepts any element through `render`. Here, in development, a trigger
  that does not render a `<button>` throws a named error.
- **The name:** each item carries `aria-label` (`label`, then `, ` and `meta` when there is one),
  so the name does not depend on how the browser joins the two spans. Typeahead matches `label`
  alone.
- **No current option:** Base UI allows a radio group with nothing checked. Here neither `value`
  nor `defaultValue` throws the same named error as a value that matches no item.
- **Placement:** as on Popover, the offset is `--vela-space-5` padding keyed on `data-side`, not
  `sideOffset`.
- **Portal and theme:** as on Popover. The portal element carries `vela-root` and copies the
  `data-theme` of the trigger's nearest themed ancestor.
- **Keyboard and motion:** a list opened or closed from the keyboard carries `data-vela-instant`,
  and the stylesheet skips the transition, as on Popover. The trigger carries it too, for its
  owner's own styles, until the next pointer interaction with the trigger or the list.
- **The pointer and a locked item:** a locked item is Base UI's `disabled`, and Base UI highlights
  it under the pointer all the same. The popup carries `data-vela-pointer` while the pointer was
  the last input in it, and the stylesheet shows a locked item's highlight only without it, so hover on a locked item
  changes nothing and keyboard focus on it still shows.
- **Extra attributes:** Base UI adds `data-highlighted`, `data-checked`, `data-side`, `data-align`,
  `role="group"` around the items, focus guards and `data-base-ui-*` markers; ids are Base UI's.
  None is part of the contract.

## Figma mapping

Library file: **Vela Design System** → page `Dropdown List`.
- **Published** with the library on 31 Oct 2026: the item set is node `164:85`, the popup `164:86`.
  Built from `scripts/figma/components/dropdown-list.figma.js`.
- **The set the builder draws:** "Dropdown List item", one row of the list. Its variant axes mirror
  the markup, one per state the item carries:
  - `Highlighted` (false / true): `data-highlighted`;
  - `Current` (false / true): `aria-checked="true"`;
  - `Locked` (false / true): `aria-disabled="true"`. A locked variant puts an instance of Icon's
    `Glyph=lock` (`icon/size`, `icon/strong`) in a slot one body line tall, `space/5` before the
    name, inside a `Name` row;
  - plus the boolean `Meta` and the text properties `Label` and `Meta text`. A locked item's reason
    is `Meta text`.
  - `Current=true` with `Locked=true` can't happen in code (`dropdown-list-locked-not-chosen`). The
    two variants stay, because the 0.14.0 set published them and removing a variant breaks the
    instances that use it.
  - The `Meta` text uses the `Body/Strong` text style (SemiBold 14/21, from the body size and line
    height and the semibold weight).
- **The popup:** a one-size "Dropdown List" component (a component, not a frame) on Popover's
  surface, holding four item instances.

| Figma property | Code prop |
|---|---|
| `Current` | `value` equals the item's `value` |
| `Locked` | item `locked`; its reason is `Meta text` |
| `Meta` / `Meta text` | item `meta` |
| `Label` | item `label` |

`Highlighted` has no prop: it is the pointer or the keys resting on the item.

**Locked: always show Meta with the reason; the lock never appears without it. The code requires
`locked: { reason }`.** A Figma property has one default for the whole set, so the set can't turn
Meta on for locked variants alone (the Figma thread tested it on a copy, 31 Oct 2026). The page's
"Usage / Locked" frame, drawn by the builder beside the popup, shows a locked item with its reason.

**Placement and flipping, focus, typeahead and the highlight following the keys have no Figma
expression: they exist only in code.**

## Anti-patterns

- ❌ A list of commands (Edit / Delete) in a Dropdown List → an Actions Dropdown, not in this kit; flag the gap.
- ❌ A Dropdown List as a form field → a Select List, not in this kit; flag the gap.
- ❌ Hiding two or three options behind a Dropdown List when they fit → Tabs or Radio Group.
- ❌ A locked item for a permission ("No access", "Your role can't") → don't list the value; locked is for a setting or a policy.
- ❌ `meta="Critical"` or a coloured dot in `meta` → meta is words, never a severity, risk, status or verdict.
- ❌ Truncating long names with an ellipsis → names wrap in full; the list is where they are read.
- ❌ Turning the trigger's chevron 180° on open → the chevron stays still until the Icon work's chevron lands.
- ❌ A shadow added in your own CSS → there is no elevation token; the border is the edge.
