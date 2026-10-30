# Dropdown List

A short list that opens from a button. One option is current, and choosing another acts at once:
it opens that tab or that view, and the list closes. Its first use is the Tabs overflow control
("6 more"), which lists every tab in the row.

**Status:** Experimental — built, not in Figma. It is born in `@omkarux/vela/headless` (Base UI
1.9 `Menu`) with no core implementation, and its Figma set is not built yet (its builder,
`scripts/figma/components/dropdown-list.figma.js`, is ready). It is Approved once the API has
settled and the set is published; see `GOVERNANCE.md`.
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

## Props

```tsx
<DropdownList
  label="All tabs"
  trigger={<button className="vela-tabs__more">6 more · 1 new</button>}
  items={[
    { value: 'alerts', label: 'Alerts' },
    { value: 'firewall', label: 'Firewall', meta: '1 new' },
    { value: 'archive', label: 'Archive', disabled: true, meta: 'No access' },
  ]}
  value={tab}
  onValueChange={setTab}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** Names the list for assistive technology ("All tabs"). Not shown. |
| `trigger` | `ReactElement` | — | **Required.** One button element. It gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. |
| `items` | `readonly [DropdownListItem, ...DropdownListItem[]]` | — | **Required, at least one.** In display order. |
| `value` | `string` | — | The current option (controlled). Must be one of the items' `value`s. Pass `value` or `defaultValue`: there is always a current option. |
| `defaultValue` | `string` | — | The current option (uncontrolled). **Exclusive with `value`.** |
| `onValueChange` | `(value: string) => void` | — | Called when an option is chosen. Not called for the current one. |
| `open` | `boolean` | — | Controlled, as Popover. **Exclusive with `defaultOpen`.** |
| `defaultOpen` | `boolean` | `false` | Uncontrolled initial state. **Exclusive with `open`.** |
| `onOpenChange` | `(open: boolean) => void` | — | |
| `align` | `"start" \| "end"` | `"start"` | **These two only.** Which edge of the trigger the list lines up with. Tabs uses `end`. |

`DropdownListItem` is `{ value: string; label: string; meta?: string; disabled?: boolean }`, **these
four only.** There is no icon, no description line, no group, no divider and no submenu.

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
- **An item has four fields.** `value`, `label`, `meta`, `disabled`. An `icon`, `description`,
  `children` or `onClick` doesn't compile: choosing calls `onValueChange`, nothing else.
  [[rule: dropdown-list-item-closed | compiler]]
- **The current value must exist.** A `value` or `defaultValue` that matches no item throws a
  named error, rather than opening a list with nothing marked. [[rule: dropdown-list-value-exists | runtime]]
- **It is a menu of radio items.** The popup is `role="menu"` named by `label`. Each item is
  `role="menuitemradio"`, and exactly the current one has `aria-checked="true"`.
  [[rule: dropdown-list-menu-radio | runtime]]
- **The item's whole text is its name.** The accessible name includes `meta` ("Firewall, 1 new"),
  so what is seen is what is heard. [[rule: dropdown-list-meta-in-name | runtime]]
- **Choosing closes it and returns focus.** A click, Enter or Space on an item calls
  `onValueChange`, closes the list and puts focus back on the trigger.
  [[rule: dropdown-list-choose-closes | runtime]]
- **Opening lands on the current item.** Focus goes to the current item, not the first one, so a
  keyboard user starts where they are. [[rule: dropdown-list-focus-current | runtime]]
- **Escape, Tab and a press outside close it.** Escape returns focus to the trigger; Tab closes it
  and moves on through the page. [[rule: dropdown-list-dismiss | runtime]]
- **A disabled item can be reached but not chosen.** It stays in the arrow-key order, so it can be
  read and its `meta` can say why. It has `aria-disabled="true"`, and choosing it does nothing.
  [[rule: dropdown-list-disabled-not-chosen | runtime]]
- **Names wrap in full, never truncated.** The list is where a long name is read in full, on touch
  too. [[rule: dropdown-list-names-wrap | browser]]
- **`meta` is words, never a colour, and never a taxonomy.** "1 new", "No access", "3 open".
  Never "Critical", never a risk or status label, never a dot alone.
  [[rule: dropdown-list-meta-is-words | convention]]

## Token bindings

| Part | Background | Border | Text |
|---|---|---|---|
| popup | `--vela-bg-raised` | `--vela-border-default` | `--vela-text-default` |
| item, highlighted | **`--vela-bg-raised-hover`** (new) | — | `--vela-text-default` |
| item, current: the check | — | — | `--vela-text-link` (a 3:1 mark) |
| item, current: the name | — | — | `--vela-text-default` |
| item `meta` | — | — | `--vela-text-default`, `--vela-font-weight-semibold` |
| item, disabled | — | — | `--vela-text-inactive` |

**The surface is Popover's:** radius `--vela-radius-4`, a 1px `--vela-border-default` edge and
no shadow (there is no elevation token). Popup padding `--vela-space-5` above and below.

**Items:**
- padding is `--vela-space-5` above and below, `--vela-space-10` at the start and `--vela-space-15` at the end;
- the check sits in a `--vela-icon-size` (16px) slot that every item keeps, so the names line up;
- the gap between columns is `--vela-space-10`;
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

One size. The popup is `--vela-popover-width` (280px) wide, capped at the available width. Names
wrap inside it.

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
- **Disabled:** `--vela-text-inactive`. No highlight colour change on hover, and it can't be chosen.
- **With meta:** the meta text at the end of the row.

**Focus:** the global ring (`.vela-root :focus-visible`), which reaches the popup because the
portal carries `vela-root`, as on Popover.

## Motion

| Moment | What moves | Timing | Why |
|---|---|---|---|
| Appears | opacity, and `--vela-space-5` of travel from the trigger | `--vela-duration-base`, `--vela-ease-standard` | orientation: it came from the button |
| Leaves | opacity only | `--vela-duration-base` | softer than it arrived |
| Highlight moves | nothing; the background changes at once | instant | it follows the pointer and the keys; a fade would lag behind them |
| From the keyboard | nothing | instant | from the keyboard nothing animates |

**The trigger's chevron does not turn.** Turning it 180° points it sideways halfway, which means
something else. The planned "bird" chevron (two wings beating once, `icons/01`) belongs to the Icon
work. Until it lands, the chevron is still and the list appearing is the feedback.

Under `prefers-reduced-motion` the global collapse applies.

## Responsive behaviour

- **Width:** `--vela-popover-width`, never wider than the room beside the trigger. In a narrow host,
  it is as wide as the space allows and names wrap. Nothing clips and nothing truncates.
- **Height:** capped at the available height, past which the list scrolls. The current item is
  scrolled into view on open.
- **Placement:** it flips above the trigger when there is no room below, and shifts along the edge
  to stay in the viewport.
- **Touch:** the same list; items are at least 31px tall (21px line plus 10px of padding), over
  WCAG 2.5.8's 24px.

## Accessibility

- **Trigger:** `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. It opens on click, Enter,
  Space and Arrow Down; Arrow Up also opens it.
- **Popup:** `role="menu"`, `aria-label` from `label`.
- **Items:** `role="menuitemradio"`, with `aria-checked` on the current one and `aria-disabled` on
  disabled ones. The name includes `meta`.
- **Keys:**
  - Arrow Up and Arrow Down move the highlight.
  - Home and End go to the first and last item.
  - Typing a letter jumps to the next name starting with it.
  - Enter or Space chooses.
  - Escape closes and returns focus to the trigger.
  - Tab closes and moves on through the page.
- **Announcing news is the owner's job:** a Dropdown List is closed most of the time. The Tabs
  overflow control announces "1 with new items" once, politely, itself.

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
- **Focus on open:** checked against `dropdown-list-focus-current` on 30 Oct 2026. Base UI 1.9
  highlights the **first** item on a keyboard open (the **last** on Arrow Up) and focuses the popup
  itself on a pointer open, so neither meets the rule. The implementation redirects the first focus
  that arrives inside the popup after it opens to the current item, whatever Base UI chose; the
  arrow keys then move on from there.
- **Choosing the current item:** Base UI's radio group reports it as a change. Here it closes the
  list and does not call `onValueChange`.
- **Closing on a choice:** Base UI's radio items stay open when chosen (`closeOnClick` is `false`
  by default). Here a choice closes the list, and Base UI returns focus to the trigger.
- **Modality:** Base UI's menu is modal by default: it locks the page's scroll and swallows a press
  outside. A Dropdown List is not modal. The page keeps its scroll, and a press outside closes the
  list and still reaches what it landed on.
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
  and the stylesheet skips the transition, as on Popover.
- **Extra attributes:** Base UI adds `data-highlighted`, `data-checked`, `data-side`, `data-align`,
  `role="group"` around the items, focus guards and `data-base-ui-*` markers; ids are Base UI's.
  None is part of the contract.

## Figma mapping

Library file: **Vela Design System** → page `Dropdown List`.
- **Not built yet.** The builder, `scripts/figma/components/dropdown-list.figma.js`, is ready and
  passes `components:figma:lint`. Building and publishing it in Figma is the Figma thread's job,
  with the maintainer's approval.
- **The set the builder draws:** "Dropdown List item", one row of the list.
  - Variant `State`: default / highlighted / current / disabled.
  - Boolean `Meta`.
  - Text properties `Label` and `Meta text`.
  - The `Meta` text uses the `Body/Link` style, the one semibold body style the library has.
- **The popup:** a "Dropdown List" frame of item instances on Popover's surface. A builder cannot
  draw instances, so the frame is composed on the page when the set is built.

| Figma property | Code prop |
|---|---|
| `State` = current | `value` equals the item's `value` |
| `State` = disabled | item `disabled` |
| `Meta` / `Meta text` | item `meta` |
| `Label` | item `label` |

**Placement and flipping, focus, typeahead and the highlight following the keys have no Figma
expression: they exist only in code.**

## Anti-patterns

- ❌ A list of commands (Edit / Delete) in a Dropdown List → an Actions Dropdown, not in this kit; flag the gap.
- ❌ A Dropdown List as a form field → a Select List, not in this kit; flag the gap.
- ❌ Hiding two or three options behind a Dropdown List when they fit → Tabs or Radio Group.
- ❌ `meta="Critical"` or a coloured dot in `meta` → meta is words, never a severity, risk or status.
- ❌ Truncating long names with an ellipsis → names wrap in full; the list is where they are read.
- ❌ Turning the trigger's chevron 180° on open → the chevron stays still until the Icon work's chevron lands.
- ❌ A shadow added in your own CSS → there is no elevation token; the border is the edge.
