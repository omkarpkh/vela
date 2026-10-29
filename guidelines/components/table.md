# Table

Rows of records under named columns — assets, findings, policies, approvals — on native table
elements, with a caption that names it, an optional sort affordance per column, two densities,
and a scroll region that keeps a wide table inside its host.

**Status:** Experimental — specced, built and tested in the core entry, but the API may still
change while Phase 2 (Approval Queue, Autonomy Ladder policy grid) and Phase 2b (Filter Bar,
Review Queue) build on it, and its Figma sets are not in the library yet (the builder is
`scripts/figma/components/table.figma.js`). See `GOVERNANCE.md`.
**Dependencies:** none

## When to use Table (vs. something else)

- Records the user compares **across columns** — sort by last seen, scan a status column, read
  a count → **Table**.
- One record's fields, label and value → a description list (`<dl>`), not a two-column table.
- Cells the user **edits or moves between with the arrow keys** like a spreadsheet → a Data Grid
  (`role="grid"`), which is **not in this kit**. Flag the gap; a Table is read, not navigated
  cell by cell.
- Thousands of rows, server paging, column resizing, virtualisation → still a Table for the
  markup, but the data layer is the host's: this component fetches nothing, pages nothing and
  virtualises nothing. Flag a virtualised grid as a gap rather than building one on top.
- A narrow host that wants **cards instead of rows** → a card list, **not in this kit**. Do not
  restyle a table into cards with CSS; see *Responsive behaviour*.
- A layout grid of unrelated things → CSS grid, never a table.

## Composition

```tsx
<Table caption="Assets" density="compact" stickyHeader>
  <Table.Head>
    <Table.Row>
      <Table.HeaderCell sort={{ direction: sort.name, onSort: (next) => setSort({ name: next }) }}>Asset</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell>Risk</Table.HeaderCell>
      <Table.HeaderCell align="end">Open findings</Table.HeaderCell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    {rows.length === 0 && <Table.Empty colSpan={4}>No assets match these filters</Table.Empty>}
    {rows.map((r) => (
      <Table.Row key={r.id} selected={picked.has(r.id)}>
        <Table.HeaderCell scope="row">{r.name}</Table.HeaderCell>
        <Table.Cell><StatusIndicator status={r.status} label={r.statusLabel} /></Table.Cell>
        <Table.Cell><RiskPill risk={r.risk} /></Table.Cell>
        <Table.Cell numeric>{r.findings}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

| Part | Prop | Type | Default | Notes |
|---|---|---|---|---|
| `Table` | `caption` | `string` | — | **Required.** Rendered as the `<caption>` and the label of the scroll region. |
| | `captionHidden` | `boolean` | `false` | Visually hides the caption; it still names the table and the region. |
| | `density` | `"regular" \| "compact"` | `"regular"` | **These two only.** Compact tightens vertical padding; type and targets hold. |
| | `layout` | `"auto" \| "fixed"` | `"auto"` | **These two only.** `fixed` takes column widths from the first row. |
| | `stickyHeader` | `boolean` | `false` | Pins the header row to the top of the scroll region. The host bounds the height. |
| | `children` | `ReactNode` | — | `Table.Head` and `Table.Body`. |
| `Table.Head` / `Table.Body` | `children` | `ReactNode` | — | `<thead>` / `<tbody>`. Rows only. |
| `Table.Row` | `selected` | `boolean` | `false` | Part of the host's selection: `aria-selected="true"`, the row tint and a start-edge marker. |
| | `aria-current` | `boolean \| "true" \| "false" \| "page" \| "step" \| "location" \| "date" \| "time"` | — | The row the page is about (open in a side panel). Passed through; draws the marker. |
| `Table.HeaderCell` | `scope` | `"col" \| "row"` | `"col"` | **These two only.** `row` for the cell that names a body row. |
| | `sort` | `{ direction: "ascending" \| "descending" \| "none"; onSort: (next) => void }` | — | Column headers only. Renders a button in the `<th>`; `aria-sort` while sorted. |
| | `align` | `"start" \| "end"` | `"start"` | **These two only.** `end` over a numeric column. |
| | `children` | `ReactNode` | — | **Required.** The label. **A `string` when `sort` is set** — the button's name is built from it. |
| `Table.Cell` | `numeric` | `boolean` | `false` | Tabular numerals, end-aligned, unwrapped. Takes no `align`. |
| | `align` | `"start" \| "end"` | `"start"` | **These two only.** |
| `Table.Empty` | `colSpan` | `number` | — | **Required.** The header's column count. |
| | `children` | `string` | — | **Required.** What the empty table means — "No assets match these filters". |

Every part also takes `className`. Nothing else is forwarded: no `onClick` on a row (see
*Anti-patterns*), no `colSpan` or `rowSpan` on a cell yet (a gap, flagged for Phase 2's grouped
rows), no `style`.

## Hard constraints

- **`caption` is required and is a `string`.** A table with no name is a grid of words to a
  screen-reader user, and the scroll region needs the same name; the type makes an unnamed or
  node-named table impossible. Hide it with `captionHidden`, never omit it. [[rule: table-caption-required | compiler]]
- **Two densities.** `regular` and `compact`. There is no `comfortable`, no `spacious`, no
  `condensed`. [[rule: table-density-closed | compiler]]
- **Two layouts.** `auto` and `fixed`, the CSS `table-layout` values. [[rule: table-layout-closed | compiler]]
- **`scope` is `col` or `row`.** No `colgroup`, no `rowgroup`: Vela has no column or row groups
  yet. [[rule: table-header-scope-closed | compiler]]
- **A sort direction is `ascending`, `descending` or `none`.** Not `asc`, not a boolean, not a
  fourth state. [[rule: table-sort-direction-closed | compiler]]
- **Only a column header sorts.** `sort` on a `scope="row"` header does not compile — a row is
  not an axis the table orders by. [[rule: table-sort-column-headers-only | compiler]]
- **A sortable header's label is a `string`.** The sort button's accessible name is built from
  it, so it cannot be an icon or a node; an unsortable header's label may be any node. [[rule: table-sort-label-is-a-string | compiler]]
- **Two alignments, and numbers are always end-aligned.** `align` is `start` or `end`;
  `numeric` sets end alignment itself and takes no `align`, so a start-aligned number column
  does not compile. [[rule: table-align-closed | compiler]]
- **`Table.Empty` carries its message as a `string`.** An empty table with no words is a blank
  box; with a message it says whether the filters, the data or the permissions are why. [[rule: table-empty-requires-text | compiler]]
- **The table scrolls inside a labelled, focusable region.** The region is
  `role="region"`, `aria-labelledby` the caption, `tabIndex={0}` — always, because whether it
  overflows depends on the host's width and the reader's zoom, both of which change after
  render. [[rule: table-region-labelled-focusable | runtime]]
- **`aria-sort` only on a sortable column, and only while it is sorted.** An unsortable header
  never carries it; a sortable one that is not sorted carries none (WAI-ARIA APG sortable table);
  the sorted one carries `ascending` or `descending`. [[rule: table-aria-sort-only-when-sortable | runtime]]
- **A sort button is named by its column and the direction it will sort.** "Last seen, sort
  ascending" — the visible label first (WCAG 2.5.3), then what pressing does, as an `aria-label`
  so every browser computes the same string. `onSort` receives that same direction: `none` →
  `ascending` → `descending` → `ascending`. [[rule: table-sort-button-names-next-direction | runtime]]
- **Numeric cells use tabular numerals.** `numeric` sets `font-variant-numeric: tabular-nums`
  and end alignment, so digits line up down the column. [[rule: table-numeric-tabular | runtime]]
- **Row state lives in the markup.** `selected` renders `aria-selected="true"` and
  `aria-current` passes through; the CSS keys on those attributes, never on a class alone, and
  draws a start-edge marker as well as the tint. [[rule: table-row-state-in-markup | runtime]]
- **A wide table never widens its host.** Below its minimum width the region scrolls
  horizontally and the page, the grid track or the flex row around it does not; the region
  scrolls from the keyboard once focused. [[rule: table-scroll-stays-in-region | browser]]
- **A sticky header stays at the top of the region** while the body scrolls under it, in a
  table whose height the host has bounded. [[rule: table-sticky-header-pins | browser]]
- **Presentational.** The table holds no sort state, fetches nothing, pages nothing and
  virtualises nothing: the host owns the rows and their order, and re-renders. [[rule: table-is-presentational | convention]]
- **Rows carry no colour meaning.** No zebra striping, and never a Severity, Status or Risk
  colour on a row: a cell holds a Status Indicator or a Risk Pill, which carry their words. The
  only row tints are hover (a reading aid) and selection (with its marker and its attribute). [[rule: table-rows-carry-no-colour-meaning | convention]]
- **Selection has a control.** A selectable row puts a labelled Checkbox (`checkbox.md`) in its
  first cell; `selected` mirrors it. `aria-selected` on a table row is not announced by every
  screen reader, so the checkbox is what carries the state. [[rule: table-selection-has-a-control | convention]]
- **Never truncate.** No ellipsis on a cell: a hostname or a hash cut short is a different
  hostname. Auto layout widens the column and the region scrolls; fixed layout wraps inside the
  column. [[rule: table-never-truncates | convention]]

## Token bindings

| Part | Background | Text | Border |
|---|---|---|---|
| region | `--vela-bg-global` | — | — |
| caption | — | `--vela-text-heading` | — |
| header cell | `--vela-bg-global` | `--vela-text-default` | bottom `--vela-border-default` |
| body cell | — | `--vela-text-default` | bottom `--vela-border-subtle` |
| row, hovered | `--vela-bg-row-hover` | `--vela-text-default` | — |
| row, selected | `--vela-bg-row-selected` | `--vela-text-default` | start marker `--vela-border-active` |
| row, current | — | `--vela-text-default` | start marker `--vela-border-active` |
| sort glyph | — | `--vela-icon-default` unsorted, `--vela-text-default` sorted | — |
| empty message | — | `--vela-text-de-emphasized` | bottom `--vela-border-subtle` |

The two row surfaces are new and exist for this component. `--vela-bg-selected` (blue-100) puts
the `unknown` status dot at 2.97:1 and de-emphasized text at 4.20:1 in light mode, so a selected
row binds `--vela-bg-row-selected` (`blue-50`, new; dark `blue-950`). `--vela-bg-hover` (grey-850
in dark) puts links at 4.35:1 and de-emphasized text at 3.99:1, so a hovered row binds
`--vela-bg-row-hover` (`grey-50` light, `grey-900` dark). On both, every pair a console row
carries — body text, de-emphasized text, a link, the marker and all five status dots — is in
`PAIRS` and passes in both themes; the tightest is the `unknown` dot on a selected row at 3.22:1.
The marker is `--vela-stroke-2` wide. Type: header cells use the H6 metrics
(`--vela-text-h6-size`, `--vela-text-h6-weight`, `--vela-text-h6-line-height`) in
`--vela-text-default`; body cells `--vela-text-body-size` and `--vela-text-body-line-height`; the
caption the H5 metrics (`--vela-text-h5-size`). The sort glyph is `--vela-icon-12`; the sort
button's minimum height is `--vela-control-height-24`. Radius: none — a table is square.

## Sizes

Density is the size axis. Inline padding is `--vela-space-10` at both; only the vertical
padding changes. Type size never changes with density.

| density | Cell padding (block) | Body row, one line | Header row with a sort button |
|---|---|---|---|
| regular | `--vela-space-10` | 21 + 20 = 41px, plus the 1px rule | 24 + 20 = 44px, plus the rule |
| compact | `--vela-space-5` | 21 + 10 = 31px, plus the rule | 24 + 10 = 34px, plus the rule |

The sort button never drops under `--vela-control-height-24` at either density: compact tightens
spacing, not targets.

## States

- **Row hover** — pointer only (`@media (hover: hover)`), `--vela-bg-row-hover`, never on a
  selected row. A reading aid, not a meaning; nothing animates.
- **Row selected** — `aria-selected="true"`: `--vela-bg-row-selected` and a 2px start-edge
  marker in `--vela-border-active`. Hovering a selected row keeps it selected-looking.
- **Row current** — `aria-current` (not `"false"`): the marker alone, no tint.
- **Sortable header** — the button's hover darkens the label to `--vela-text-heading` and the
  glyph to `--vela-text-default`; focus is the global ring; a sorted column's glyph is the
  direction arrow in `--vela-text-default`, an unsorted one a neutral up-down glyph in
  `--vela-icon-default`.
- **Empty** — one row, one cell across every column, the message centred.
- **Loading** — not a table state. The host renders its own skeleton or busy message; a table
  with stale rows under a spinner is the host's decision, not a prop.

## Responsive behaviour

**Minimum width.** The table's minimum is its content's: in `auto` layout, the sum of each
column's longest unbreakable run (a hostname, a hash, a header label — header labels do not
wrap); in `fixed` layout, the widths the host gives the first row's cells through `className`
(Vela has no column-width tokens). Above the minimum the table fills its container
(`inline-size: 100%`).

**Below the minimum it scrolls, inside itself.** The wrapper is an inline-size container
(`container-type: inline-size`), so its width is never taken from the table: a 1200px table in a
400px side panel, a `1fr` grid track or a flex row does not push its host wider. The region
scrolls horizontally instead, and because it is focusable a keyboard user tabs to it and scrolls
with the arrow keys. The page never scrolls sideways because of a table.

**It never truncates and never collapses columns.** In `auto` layout a long value widens its
column; in `fixed` layout it wraps inside the column (`overflow-wrap: anywhere`). Numeric cells
do not wrap in `auto` layout. Nothing is hidden behind an ellipsis.

**Sticky header.** `stickyHeader` pins the header row to the top of the region. The region only
scrolls vertically when the host bounds the table's height — a height or max-height on the
`Table` through `className`, or a parent with a definite height; the region fills it and scrolls.
Without a bound there is nothing to stick to, and the header scrolls with the page, correctly.

**Stacking to cards is out of scope, and a gap.** A host that needs cards below some width
renders a different component from the same data — a card list, which is not in this kit — and
switches on its own container query. It does not restyle `<table>` into blocks: that breaks the
header-to-cell association screen readers depend on. Breakpoint tokens do not exist yet (see
`DESIGN.md`, *Responsive and density*), so the table has one layout at every width and states no
breakpoint of its own.

**Density.** `density` is a prop here because a table is where density matters most and the
subtree density tokens `DESIGN.md` describes do not exist yet. When they land, a table with no
`density` will follow its subtree, and the prop stays as the per-table override.

## Accessibility

- Native semantics, end to end: `<table>`, `<caption>`, `<thead>`, `<tbody>`, `<tr>`, `<th
  scope>`, `<td>`. No ARIA roles are added to the table itself; the only role is the scroll
  region's.
- The caption names the table (the native association) and the region (`aria-labelledby`).
- `scope="col"` on column headers, `scope="row"` on the cell that names a row, so a screen
  reader announces both when it moves through a cell.
- Sorting: a real `<button>` inside the `<th>`, named "Column, sort ascending"; `aria-sort` on
  the `<th>` of the sorted column only. Announcing the re-sorted result ("120 assets, sorted by
  last seen") is the host's job, through its own live region.
- Keyboard: Tab reaches the region, then each sort button and each control inside the cells, in
  document order. There is no arrow-key cell navigation: that is a Data Grid, which is not in
  this kit.
- Colour is never the only signal: selection has its attribute, its marker and the host's
  checkbox; status and risk live in cells as components that carry their words.

## Figma mapping

Library file: **Vela Design System** → page `Table`. Three sets, built by
`scripts/figma/components/table.figma.js`: **Table Header Cell** (16 variants, `Density` (2) x
`Sort` (4) x `Align` (2), plus a `Label text` property), **Table Cell** (4 variants, `Density` x
`Align`, plus `Value text`) and **Table Row** (8 variants, `Density` x `State` (4)). Compose a
table by stacking a header row of Header Cells over Rows; until the builder has been run in the
file, the library has no Table sets.

| Figma property | Code prop |
|---|---|
| `Density` (all three sets) | `density` on `<Table>` |
| `Sort=unsortable` (Header Cell) | no `sort` prop |
| `Sort=none` (Header Cell) | `sort={{ direction: "none", … }}` |
| `Sort=ascending` (Header Cell) | `sort={{ direction: "ascending", … }}` |
| `Sort=descending` (Header Cell) | `sort={{ direction: "descending", … }}` |
| `Align` (Header Cell, Cell) | `align`; a numeric column is `Align=end` with `numeric` on the cell |
| `State=default` (Row) | — |
| `State=hover` (Row) | the pointer, not a prop |
| `State=selected` (Row) | `selected` on `<Table.Row>` |
| `State=current` (Row) | `aria-current` on `<Table.Row>` |
| `Label text` (Header Cell) | the header cell's children |
| `Value text` (Cell) | the cell's children |

**Tabular numerals, the scroll region, the sticky header and the sort button's name have no Figma
expression.** The Figma cell shows a number end-aligned; the code sets `tabular-nums` on it. Every
fill, stroke and text binds a variable: the header on surface/global with a border/default rule,
cells with a border/subtle rule, the hovered and selected rows on surface/row-hover and
surface/row-selected, the selected and current marker a 2px border/active stroke on the row's
start edge.

## Anti-patterns

- ❌ `<Table>` with no `caption`, or `caption={<Icon />}` → will not compile; use `captionHidden` to hide it.
- ❌ `onClick` on a row to open a record → no keyboard, no announcement. Put a link or a Button in the row's first cell.
- ❌ Zebra striping → competes with the hover and selected tints and reads as grouping; the row rules already track the eye.
- ❌ A red row for a critical finding, an amber row for a degraded host → colour on a row is meaning by colour alone; put a Status Indicator or a Risk Pill in a cell.
- ❌ `text-overflow: ellipsis` on a cell → a truncated hostname is a different hostname; let it widen or wrap.
- ❌ `overflow-x: auto` on the page or a parent to fit a wide table → the region already scrolls; the page never does.
- ❌ Restyling `<tr>` into cards below a breakpoint → breaks header association; render a card list (not in this kit) instead.
- ❌ Holding sort state in the table, or sorting inside a cell renderer → the host sorts and passes `direction`.
- ❌ `sort` on a `scope="row"` header, `direction="asc"`, `align="center"` → will not compile.
- ❌ Arrow-key navigation between cells, `role="grid"` on a Table → that is a Data Grid, not in this kit.
