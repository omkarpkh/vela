import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Table, type TableSortDirection } from './Table'

const sortName = (label: string, next: string) => `${label}, sort ${next}`
const css = readFileSync(resolve(process.cwd(), 'src/components/Table/Table.css'), 'utf8')
/** The declarations of the first rule whose selector list contains `selector`. */
const ruleFor = (selector: string) => {
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim())
    if (selectors.includes(selector)) return m[2]
  }
  return ''
}

function Assets({ direction = 'none', onSort = () => {} }: { direction?: TableSortDirection; onSort?: (n: 'ascending' | 'descending') => void }) {
  return (
    <Table caption="Assets">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell sort={{ direction, onSort }}>Last seen</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell align="end">Findings</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row">api-gateway-01</Table.HeaderCell>
          <Table.Cell>Healthy</Table.Cell>
          <Table.Cell numeric>1,204</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  )
}

describe('Table', () => {
  it('renders native table semantics, named by its caption', () => {
    render(<Assets />)
    const table = screen.getByRole('table', { name: 'Assets' })
    expect(table.querySelector('caption')).toHaveTextContent('Assets')
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3)
    expect(within(table).getByRole('rowheader', { name: 'api-gateway-01' })).toHaveAttribute('scope', 'row')
    expect(within(table).getAllByRole('columnheader')[1]).toHaveAttribute('scope', 'col')
  })

  // [[rule: table-region-labelled-focusable]]
  it('wraps the table in a region labelled by the caption and reachable from the keyboard', async () => {
    render(<Assets />)
    const region = screen.getByRole('region', { name: 'Assets' })
    const caption = screen.getByRole('table').querySelector('caption')!
    expect(region).toHaveAttribute('aria-labelledby', caption.id)
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toContainElement(screen.getByRole('table'))
    await userEvent.tab()
    expect(region).toHaveFocus()
  })

  it('hides the caption visually with captionHidden, and keeps the names', () => {
    render(<Table caption="Findings" captionHidden><Table.Body><Table.Empty colSpan={1}>None</Table.Empty></Table.Body></Table>)
    expect(screen.getByRole('table').querySelector('caption')).toHaveClass('vela-sr-only')
    expect(screen.getByRole('table', { name: 'Findings' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Findings' })).toBeInTheDocument()
  })

  // [[rule: table-aria-sort-only-when-sortable]]
  it('puts aria-sort on the sorted column only — never on an unsortable one, never "none"', () => {
    const { rerender } = render(<Assets direction="none" />)
    const [lastSeen, status, findings] = screen.getAllByRole('columnheader')
    expect(lastSeen).not.toHaveAttribute('aria-sort')
    expect(status).not.toHaveAttribute('aria-sort')
    expect(findings).not.toHaveAttribute('aria-sort')
    rerender(<Assets direction="ascending" />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'ascending')
    rerender(<Assets direction="descending" />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getAllByRole('columnheader')[1]).not.toHaveAttribute('aria-sort')
    // An unsortable header renders its label, not a button.
    expect(within(screen.getAllByRole('columnheader')[1]).queryByRole('button')).toBeNull()
  })

  // [[rule: table-sort-button-names-next-direction]]
  it.each([
    ['none', 'ascending'],
    ['ascending', 'descending'],
    ['descending', 'ascending'],
  ] as const)('a %s column is a button named "Last seen, sort %s", and onSort receives that direction', async (direction, next) => {
    const onSort = vi.fn()
    render(<Assets direction={direction} onSort={onSort} />)
    const button = within(screen.getAllByRole('columnheader')[0]).getByRole('button', { name: sortName('Last seen', next) })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort).toHaveBeenCalledWith(next)
  })

  it('keeps no sort state of its own: the direction is whatever the host passes', async () => {
    const onSort = vi.fn()
    render(<Assets direction="none" onSort={onSort} />)
    await userEvent.click(screen.getByRole('button', { name: sortName('Last seen', 'ascending') }))
    // The host did not re-render with a new direction, so nothing changed.
    expect(screen.getAllByRole('columnheader')[0]).not.toHaveAttribute('aria-sort')
    expect(screen.getByRole('button', { name: sortName('Last seen', 'ascending') })).toBeInTheDocument()
  })

  // [[rule: table-numeric-tabular]]
  it('sets tabular numerals and end alignment on a numeric cell', () => {
    render(<Assets />)
    const cell = screen.getByRole('cell', { name: '1,204' })
    expect(cell).toHaveClass('vela-table__cell--numeric', 'vela-table__cell--end')
    expect(ruleFor('.vela-table__cell--numeric')).toMatch(/font-variant-numeric:\s*tabular-nums/)
    expect(ruleFor('.vela-table__cell--end')).toMatch(/text-align:\s*end/)
    expect(screen.getByRole('cell', { name: 'Healthy' })).not.toHaveClass('vela-table__cell--numeric')
  })

  // [[rule: table-row-state-in-markup]]
  it('carries selection and currency in ARIA attributes, and the stylesheet keys on them', () => {
    render(
      <Table caption="Approvals">
        <Table.Body>
          <Table.Row selected><Table.Cell>Rotate keys</Table.Cell></Table.Row>
          <Table.Row aria-current="true"><Table.Cell>Block egress</Table.Cell></Table.Row>
          <Table.Row><Table.Cell>Isolate host</Table.Cell></Table.Row>
        </Table.Body>
      </Table>,
    )
    const [selected, current, plain] = screen.getAllByRole('row')
    expect(selected).toHaveAttribute('aria-selected', 'true')
    expect(current).toHaveAttribute('aria-current', 'true')
    expect(current).not.toHaveAttribute('aria-selected')
    expect(plain).not.toHaveAttribute('aria-selected')
    expect(plain).not.toHaveAttribute('aria-current')
    // The tint and the marker key on the attributes — never on a class the markup could drop.
    expect(ruleFor(".vela-table__row[aria-selected='true'] > *")).toMatch(/--vela-bg-row-selected/)
    expect(ruleFor(".vela-table__row[aria-selected='true'] > :first-child")).toMatch(/inset[^;]*--vela-border-active/)
    expect(ruleFor(".vela-table__row[aria-current]:not([aria-current='false']) > :first-child")).toMatch(/--vela-border-active/)
  })

  it('renders an empty state as one cell across every column, carrying its message', () => {
    render(
      <Table caption="Assets">
        <Table.Head><Table.Row><Table.HeaderCell>A</Table.HeaderCell><Table.HeaderCell>B</Table.HeaderCell></Table.Row></Table.Head>
        <Table.Body><Table.Empty colSpan={2}>No assets match these filters</Table.Empty></Table.Body>
      </Table>,
    )
    const cell = screen.getByRole('cell', { name: 'No assets match these filters' })
    expect(cell).toHaveAttribute('colspan', '2')
  })

  it('maps density, layout and stickyHeader to classes, and defaults to regular and auto', () => {
    const { container, rerender } = render(<Assets />)
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('vela-table', 'vela-table--regular', 'vela-table--auto')
    expect(root).not.toHaveClass('vela-table--sticky-header')
    rerender(<Table caption="Assets" density="compact" layout="fixed" stickyHeader><Table.Body><Table.Empty colSpan={1}>None</Table.Empty></Table.Body></Table>)
    expect(container.firstChild).toHaveClass('vela-table--compact', 'vela-table--fixed', 'vela-table--sticky-header')
  })

  it('compact tightens padding but never the sort target', () => {
    expect(ruleFor('.vela-table--compact .vela-table__cell')).toMatch(/padding-block:\s*var\(--vela-space-5\)/)
    expect(ruleFor('.vela-table__sort')).toMatch(/min-block-size:\s*var\(--vela-control-height-24\)/)
  })

  it('binds no severity, status or risk token to a row', () => {
    expect(css).not.toMatch(/--vela-[a-z]+-(severity|status|risk)-/)
  })
})
