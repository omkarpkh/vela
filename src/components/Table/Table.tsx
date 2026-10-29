import * as React from 'react'
import { cn } from '../../lib/cn'
import { SortAscendingIcon, SortDescendingIcon, SortNoneIcon } from '../../lib/icons'

/**
 * Table primitives: a native <table> with Vela's density, scroll region and sort affordance.
 *
 * Presentational on purpose. The table fetches nothing, virtualises nothing and holds no sort
 * state: the host owns the rows and their order. A sortable column gets a real <button> inside
 * its <th> and `aria-sort` on the <th>; the button tells the host which direction it promised,
 * and the host re-renders the rows. Phase 2's Approval Queue and Autonomy Ladder grid, and Phase
 * 2b's Filter Bar and Review Queue, are built on these parts.
 */

/**
 * The two density steps DESIGN.md names. `compact` tightens vertical padding only: type size and
 * the 24px target hold. An interim per-table prop until the subtree density tokens land.
 */
export type TableDensity = 'comfortable' | 'compact'
/** `auto` sizes columns to their content; `fixed` takes widths from the first row (the host's classes). */
export type TableLayout = 'auto' | 'fixed'
export type TableAlign = 'start' | 'end'
/** The sorted state a column header announces. There is no fourth value. */
export type TableSortDirection = 'ascending' | 'descending' | 'none'

export interface TableSort {
  /** The column's current state, as the host holds it. */
  direction: TableSortDirection
  /**
   * Called when the header's button is pressed, with the direction the button's name promised:
   * `none` → `ascending` → `descending` → `ascending`. The host sorts and re-renders; clearing a
   * sort is not a header action. A handler that ignores the argument is still assignable.
   */
  onSort: (next: Exclude<TableSortDirection, 'none'>) => void
}

export interface TableProps {
  /**
   * Required. The table's accessible name: rendered as the <caption>, and the label of the scroll
   * region. A string, so it can never be an icon or an empty node.
   */
  caption: string
  /** Visually hides the caption; it still names the table and the scroll region. */
  captionHidden?: boolean
  density?: TableDensity
  layout?: TableLayout
  /** Pins the header row to the top of the scroll region. The host bounds the table's height. */
  stickyHeader?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * A data table. The wrapper is an inline-size container, so a wide table can never widen its
 * host; the table scrolls inside a labelled, focusable region instead, never the page.
 */
export function Table({
  caption,
  captionHidden = false,
  density = 'comfortable',
  layout = 'auto',
  stickyHeader = false,
  children,
  className,
}: TableProps) {
  const captionId = `${React.useId()}-caption`
  return (
    <div
      className={cn(
        'vela-table',
        `vela-table--${density}`,
        `vela-table--${layout}`,
        stickyHeader && 'vela-table--sticky-header',
        className,
      )}
    >
      {/* Focusable whether or not it overflows: overflow depends on the host's width and the
          reader's zoom, both of which change after render, and a keyboard user must be able to
          scroll it at 400% (WCAG 2.1.1, 1.4.10). One extra tab stop is the price. */}
      <div className="vela-table__region" role="region" aria-labelledby={captionId} tabIndex={0}>
        <table className="vela-table__table">
          <caption id={captionId} className={cn('vela-table__caption', captionHidden && 'vela-sr-only')}>
            {caption}
          </caption>
          {children}
        </table>
      </div>
    </div>
  )
}

export interface TableSectionProps {
  children: React.ReactNode
  className?: string
}

function TableHead({ children, className }: TableSectionProps) {
  return <thead className={cn('vela-table__head', className)}>{children}</thead>
}

function TableBody({ children, className }: TableSectionProps) {
  return <tbody className={cn('vela-table__body', className)}>{children}</tbody>
}

export interface TableRowProps {
  /**
   * The row is part of the host's selection. Rendered as `aria-selected="true"` and a start-edge
   * marker as well as the tint, so selection is never colour alone. The control that selects it —
   * a labelled Checkbox in the row — is the host's.
   */
  selected?: boolean
  /** The row the rest of the page is about (open in a side panel, say). Passed through. */
  'aria-current'?: React.AriaAttributes['aria-current']
  children: React.ReactNode
  className?: string
}

function TableRow({ selected = false, 'aria-current': current, children, className }: TableRowProps) {
  return (
    <tr
      className={cn('vela-table__row', className)}
      aria-selected={selected ? true : undefined}
      aria-current={current}
    >
      {children}
    </tr>
  )
}

interface HeaderCellBase {
  align?: TableAlign
  className?: string
}

/**
 * `scope` is closed, and only a column header sorts: a row header with a `sort` does not compile.
 * A sortable header's label is a `string`, because the button's accessible name is built from it
 * ("Last seen, sort ascending") and has to come out the same in every browser.
 */
export type TableHeaderCellProps = HeaderCellBase &
  (
    | {
        /** Defaults to `col`. */ scope?: 'col'
        sort: TableSort
        /** The column's label: visible in the button, and the start of its accessible name. */
        children: string
      }
    | { scope?: 'col'; sort?: undefined; /** The column's label. */ children: React.ReactNode }
    | { scope: 'row'; sort?: never; /** The row's label. */ children: React.ReactNode }
  )

const NEXT: Record<TableSortDirection, Exclude<TableSortDirection, 'none'>> = {
  none: 'ascending',
  ascending: 'descending',
  descending: 'ascending',
}

const SORT_ICON = {
  none: SortNoneIcon,
  ascending: SortAscendingIcon,
  descending: SortDescendingIcon,
} as const

function TableHeaderCell({ children, align = 'start', scope = 'col', sort, className }: TableHeaderCellProps) {
  // aria-sort only where the column IS sorted (WAI-ARIA APG sortable table): a sortable column
  // that is not sorted carries no aria-sort, and an unsortable one never does. Sortability is
  // in the button's name.
  const sorted = sort && sort.direction !== 'none' ? sort.direction : undefined
  const next = sort ? NEXT[sort.direction] : undefined
  const Icon = sort ? SORT_ICON[sort.direction] : null
  return (
    <th
      scope={scope}
      aria-sort={sorted}
      className={cn(
        'vela-table__header-cell',
        `vela-table__header-cell--${align}`,
        scope === 'row' && 'vela-table__header-cell--row',
        className,
      )}
    >
      {sort && Icon && next ? (
        <button
          type="button"
          className={cn('vela-table__sort', sorted && 'vela-table__sort--sorted')}
          // The name says what pressing does, not what is, and starts with the visible label
          // (WCAG 2.5.3): "Last seen, sort ascending". An aria-label rather than a visually hidden
          // span, because browsers put a space before an out-of-flow span ("Last seen , sort …").
          aria-label={`${children}, sort ${next}`}
          onClick={() => sort.onSort(next)}
        >
          <span className="vela-table__sort-label">{children}</span>
          <Icon className="vela-table__sort-icon" />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

interface CellBase {
  children?: React.ReactNode
  className?: string
}

/**
 * `numeric` sets tabular numerals and end alignment together, so it takes no `align`: a
 * start-aligned number column does not compile.
 */
export type TableCellProps = CellBase &
  (
    | { numeric?: false; align?: TableAlign }
    | { /** Tabular numerals, end-aligned, never wrapped. */ numeric: true; align?: never }
  )

function TableCell({ children, align = 'start', numeric = false, className }: TableCellProps) {
  return (
    <td
      className={cn(
        'vela-table__cell',
        `vela-table__cell--${numeric ? 'end' : align}`,
        numeric && 'vela-table__cell--numeric',
        className,
      )}
    >
      {children}
    </td>
  )
}

export interface TableEmptyProps {
  /** How many columns the row spans — the header's column count. */
  colSpan: number
  /** Required. What the empty table means ("No assets match these filters"), not a blank row. */
  children: string
  className?: string
}

function TableEmpty({ colSpan, children, className }: TableEmptyProps) {
  return (
    <tr className="vela-table__empty-row">
      <td colSpan={colSpan} className={cn('vela-table__empty', className)}>
        {children}
      </td>
    </tr>
  )
}

Table.Head = TableHead
Table.Body = TableBody
Table.Row = TableRow
Table.HeaderCell = TableHeaderCell
Table.Cell = TableCell
Table.Empty = TableEmpty
