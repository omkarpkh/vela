# Checkbox

A box that **records intent** — on its own ("accept the terms") or as one of several in a
**Checkbox Group** ("scan these three scopes") — and does nothing until a Save, Apply or Submit
commits the form.

**Status:** Experimental — the first component born in `@omkarux/vela/headless` (Base UI 1.9);
there is no core implementation and no Figma set yet (the builder is
`scripts/figma/components/checkbox.figma.js`). Approved once the API has settled and the set is
published; see `GOVERNANCE.md`.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## When to use Checkbox (vs. Toggle, vs. Radio Group)

- Records a choice that a **Save / Apply / Submit** button commits later — accept terms, pick the
  scopes of a scan, select rows for a bulk action → **Checkbox**.
- Takes effect **the moment it is flipped** — notifications on/off, dark mode, "enable this rule"
  → **Toggle** (`toggle.md`). The test is the Save button: if one is needed, it is a Checkbox; if
  the change is live already, it is a Toggle. A Toggle behind a Save button is the single most
  common mistake agents make with these two.
- Several options where **exactly one** can be chosen → **Radio Group** (`radio-group.md`).
- Several options where **any number** can be chosen → **Checkbox.Group**.
- One box that stands for a set — "select all", with some rows selected → `indeterminate`, which
  renders `aria-checked="mixed"` and a dash.
- A long list to pick from (more than ~7 options, or searchable) → a Multi-select, which is **not
  in this kit**. Flag the gap; do not build it out of Checkboxes.

## Composition

```tsx
<Checkbox label="Accept the data-processing terms" defaultChecked onCheckedChange={setAccepted} />

<Checkbox.Group label="Scan scope" defaultValue={['users']} onValueChange={setScope}>
  <Checkbox value="users" label="Users" />
  <Checkbox value="devices" label="Devices" description="Managed endpoints only" />
  <Checkbox value="apps" label="Applications" disabled />
</Checkbox.Group>
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `Checkbox` | `label` | `string` | — | **Required.** The visible label, also the accessible name. |
| | `checked` | `boolean` | — | Controlled. Exclusive with `defaultChecked`. Ignored inside a Group, which owns the state. |
| | `defaultChecked` | `boolean` | `false` | Uncontrolled initial state. Exclusive with `checked`. |
| | `onCheckedChange` | `(checked: boolean) => void` | — | Receives the **next** value. |
| | `indeterminate` | `boolean` | `false` | The "some of the set" state: `aria-checked="mixed"` and a dash. Visual only — the next click reports `true` or `false`. |
| | `disabled` | `boolean` | `false` | Native `disabled`: leaves the tab order, swallows clicks. |
| | `size` | `"regular" \| "tiny"` | `"regular"` | **These two only.** The same two as Toggle. |
| | `description` | `string` | — | A hint under the label, linked by `aria-describedby`. |
| | `error` | `string` | — | **The message.** Presence puts the box in the error state; the string is announced. |
| | `name` | `string` | — | Native, forwarded to the hidden `<input>` for form submission. |
| | `value` | `string` | — | Native, forwarded. **Required inside a Group** — it is how the group knows the box. |
| `Checkbox.Group` | `label` | `string` | — | **Required.** Rendered as the group's visible label and wired as its accessible name. |
| | `value` | `string[]` | — | Controlled: the `value`s of the checked boxes. Exclusive with `defaultValue`. |
| | `defaultValue` | `string[]` | `[]` | Uncontrolled initial state. Exclusive with `value`. |
| | `onValueChange` | `(value: string[]) => void` | — | Receives the **next** array. |
| | `disabled` | `boolean` | `false` | Disables every box in the group. |
| | `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | **These two only.** Layout; keyboard order is document order either way. |
| | `children` | `ReactNode` | — | `Checkbox` elements, each with a `value`. |

## Hard constraints

- **`label` is required and is a `string`.** Not optional, not `ReactNode`. A box with no name
  is unusable by screen reader, so the type makes one impossible. [[rule: checkbox-label-required | compiler]]
- **Controlled and uncontrolled are exclusive.** Pass `checked` **or** `defaultChecked`; both is
  a build failure, as on Toggle and Tabs. [[rule: checkbox-controlled-exclusive | compiler]]
- **Two sizes.** `regular` and `tiny`, the Toggle pair. There is no `small`, no `large`. [[rule: checkbox-sizes-closed | compiler]]
- **`error` is a message, not a flag.** `error={true}` with the text somewhere else does not
  compile; pass the string and the component renders and announces it, as Input does. [[rule: checkbox-error-is-a-message | compiler]]
- **A Group has a `label`.** `Checkbox.Group` without one does not compile: an unnamed group
  reads to a screen-reader user as a run of unrelated boxes. [[rule: checkbox-group-label-required | compiler]]
- **A Group is controlled or uncontrolled, never both.** `value` **or** `defaultValue`. [[rule: checkbox-group-controlled-exclusive | compiler]]
- **A Checkbox inside a Group carries a `value`.** Without one the group cannot know which box
  changed, so the component throws a named error rather than rendering a box that silently
  tracks nothing. [[rule: checkbox-in-group-requires-value | runtime]]
- **`aria-describedby` points only at rendered elements.** No `description` and no `error` →
  no attribute; a dangling reference is worse than none. [[rule: checkbox-describedby-only-rendered | runtime]]
- **Indeterminate is `aria-checked="mixed"` with a visible dash.** Not an unchecked box with a
  different border, not a tooltip: the state is in the markup and in the glyph. [[rule: checkbox-indeterminate-is-mixed | runtime]]
- **A Checkbox records intent; a Toggle acts.** Never wire a Checkbox to take effect on change
  with no Save, and never put a Toggle behind a Save button. [[rule: checkbox-records-intent | convention]]

## Token bindings

| State | Box background | Box border | Mark |
|---|---|---|---|
| unchecked | `--vela-control-bg` | `--vela-control-border` | — |
| unchecked, hovered | `--vela-control-bg` | `--vela-control-border-hover` | — |
| checked / indeterminate | `--vela-control-check-bg-checked` | `--vela-control-check-bg-checked` | `--vela-control-check-mark` |
| error (any) | as the row above | `--vela-control-border-error` | as the row above |
| disabled (any) | `--vela-control-bg-disabled` | `--vela-border-inactive` | `--vela-icon-disabled` |

Label `--vela-text-default`; `description` `--vela-text-de-emphasized`; `error`
`--vela-text-error`; disabled label `--vela-text-inactive`. Box radius `--vela-radius-3` (the
small-inner-element scope in `foundations/radius.md`). The box is `--vela-control-checkbox-size`
square (`-tiny` at `tiny`); the mark is an inline SVG at `currentColor`, so it takes the colour of
the row.

`--vela-control-check-bg-checked` and `--vela-control-check-mark` are shared with Radio Group so
the two controls read as one family. Their pairs are asserted in `PAIRS`: mark on fill at 3:1
(6.08 light, 4.74 dark), fill on `--vela-bg-global` and on `--vela-bg-container` at 3:1, and the
error border on `--vela-control-bg` at 3:1. Dark re-points the fill to `primary-450`, not
`primary-400`: white on `primary-400` is 3.18:1 and the margin was not worth keeping.

## Sizes

| size | Box | Mark | Label |
|---|---|---|---|
| regular | `--vela-control-checkbox-size` (16) | the SVG fills the box | Body 14/21 |
| tiny | `--vela-control-checkbox-size-tiny` (12) | the SVG fills the box | Meta 12/18 |

The box sits on the first line of the label (`align-self: flex-start`, offset so its centre is on
the line's centre) and never scales with the label, so a two-line label does not pull the box
to the middle. Gap box-to-label `--vela-space-10`; gap between boxes in a vertical Group
`--vela-space-10`, in a horizontal one `--vela-space-20`.

## States

- **Hover** — border to `--vela-control-border-hover`, under `@media (hover: hover)` only.
- **Focus** — the global ring (`.vela-root :focus-visible`); nothing per-component.
- **Checked / indeterminate** — CSS keys on `[aria-checked='true']` and `[aria-checked='mixed']`
  on the box; the fill and the mark cannot drift from the state the markup carries.
- **Error** — CSS keys on `[aria-invalid='true']`, set when `error` is a non-empty string.
- **Disabled** — the native attribute; CSS keys on `:disabled`. Nothing animates.
- **Motion** — the fill changes over `--vela-duration-fast` with `--vela-ease-standard`; the mark
  does not animate (from the keyboard, nothing should).

## Responsive behaviour

The box is fixed geometry and only the **label flexes**. In a narrow container the label wraps
under itself beside the box, which stays on the first line, so the control is always findable at
the start of the row; `description` and `error` wrap below the label in the same column. The
label never truncates. Minimum width: the box plus the gap plus one word — below that, the text
wraps a word per line and nothing clips. A horizontal `Checkbox.Group` **wraps** (`flex-wrap`)
rather than scrolling: a row of boxes that scrolls hides options, a row that wraps shows them. In
a host narrower than two boxes a horizontal group therefore reads as a vertical one. Density
tokens do not exist yet (see `DESIGN.md`, *Responsive and density*); until they do, the two sizes
are the only density control.

## Accessibility

- Renders a native `<button type="button" role="checkbox">` with `aria-checked` (`true`, `false`
  or `mixed`), plus Base UI's visually hidden `<input type="checkbox">` so a plain `<form>` submits
  `name`/`value`.
- The visible label is a `<label htmlFor>` **and** is wired by `aria-labelledby`: clicking the
  text toggles the box natively, and the name is explicit.
- Space toggles; Enter does not (it submits the form, as a native checkbox does). It is in the
  tab order; a disabled box is not.
- `description` and `error` are linked by `aria-describedby`; the error is a live region
  (`role="alert"`).
- A Group is `role="group"` named by its label through `aria-labelledby`.
- Colour is never the only signal: the mark is a glyph and the error is a message.

## Implementations

Checkbox ships from `@omkarux/vela/headless` only. There is no hand-rolled core and none is
planned: this is the first component to start on Base UI rather than be migrated to it
(`decisions/002-agent-ready-direction`).

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | **headless** — Base UI 1.9 `Checkbox` + `CheckboxGroup` (`src/headless/Checkbox`) | **`@base-ui/react` (optional peer, via /headless)** | Experimental |

Where Base UI's defaults differ from this spec, the implementation maps to the spec and the
difference is recorded here:

- **Element.** Base UI renders a `<span role="checkbox">` by default. This spec wants the native
  disabled state and the kit's `:disabled` and `:focus-visible` CSS, so the root renders a
  `<button type="button">` through Base UI's `render` prop with `nativeButton`; Base UI then puts
  the native `disabled` attribute on it, not `aria-disabled`, and the browser keeps it out of the
  tab order and swallows its clicks. Toggle is a `<button role="switch">` for the same reason.
- **Labelling.** Base UI's own labelling expects a `Field.Label`; this spec's `label` is a plain
  `<label htmlFor>` and an explicit `aria-labelledby`, which Base UI honours over its fallback.
- **Indicator.** Base UI mounts its `Indicator` only while checked or indeterminate; the spec's
  mark and dash are rendered inside it, so an unchecked box has no SVG in the DOM at all.
- **Group value.** Base UI identifies a grouped box by `value`, falling back to `name`. This spec
  requires `value` and throws when it is missing (`checkbox-in-group-requires-value`); the
  fallback is not relied on.
- **Parent checkbox.** Base UI's `parent` prop and `allValues` (a "select all" box that the group
  computes) are not exposed: `indeterminate` is a prop you set, as the Props table says. A
  computed parent is a spec change, flagged here rather than smuggled in.
- **Extra attributes.** Base UI adds `data-checked` / `data-unchecked` / `data-indeterminate` and
  `data-disabled`; the stylesheet keys on the ARIA attributes instead, and none of them is part of
  the contract. Ids are Base UI's (`base-ui-…`).

## Figma mapping

Library file: **Vela Design System** → page `Checkbox`. Six variants, `State`
(unchecked / checked / indeterminate) x `Size` (regular / tiny), plus a `Label text` text
property and a `Description` boolean. The set is created by
`scripts/figma/components/checkbox.figma.js`; until that builder has been run in the file, the
library has no Checkbox set. There is no `Checkbox.Group` set: compose a group by stacking
Checkbox instances, as Tabs composes a tablist from Tab instances.

| Figma property | Code prop |
|---|---|
| `State` | `checked` / `defaultChecked`, or `indeterminate` |
| `Size` | `size` |
| `Label text` | `label` |
| `Description` (boolean) | `description` |

**Disabled and error have no Figma axis on purpose, as Button's `disabled` has none: they are
states the markup carries (`:disabled`, `aria-invalid`), not variants. The box binds
`control/checkbox/size` (or `/size-tiny`), its fill and stroke bind `control/bg` and
`control/border` unchecked and `control/check/bg-checked` checked, and the mark binds
`control/check/mark`.** Nothing in this component is literal.

## Anti-patterns

- ❌ A Checkbox that acts on change with no Save button → that is a Toggle.
- ❌ A Toggle behind a Save button → that is a Checkbox.
- ❌ `<Checkbox />` with no label → will not compile.
- ❌ `error={true}` with the message elsewhere → pass the message; the boolean will not compile.
- ❌ A Checkbox inside a Group with no `value` → throws; the group cannot track it.
- ❌ Several Checkboxes where only one may be chosen → Radio Group.
- ❌ A custom `<div>` with a click handler and a tick icon → no role, no keyboard, no announcement.
- ❌ Hiding the native state behind `data-*` selectors in your own CSS → key on `aria-checked`.
- ❌ `size="small"` or `size="large"` → the set is closed at two.
