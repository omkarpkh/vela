import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { Tooltip, TooltipProvider } from './Tooltip'
import * as headless from '../index'
import { sideOf } from '../overlay'
import { Button } from '../../components/Button'

// The spec is guidelines/components/tooltip.md. Tooltip ships from `@omkarux/vela/headless` only,
// on Base UI 1.9; these tests are the spec's, not Base UI's.
const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

// jsdom loads no stylesheet, so the delay token is declared here, on the trigger, the way
// dist/vela.css declares it on :root. A short value keeps the suite fast; the test is that the
// component reads the token at all, and waits for it.
function withDelayToken(value: string) {
  const style = document.createElement('style')
  style.textContent = `button { --vela-delay-tooltip: ${value}; }`
  document.head.appendChild(style)
  return style
}
afterEach(() => document.head.querySelectorAll('style').forEach((s) => s.remove()))

const Export = (props: { describedBy?: string }) => (
  <>
    <button type="button">Before</button>
    <Tooltip content="Download the last 24 hours as CSV">
      <Button aria-describedby={props.describedBy}>Export</Button>
    </Tooltip>
    {props.describedBy && <span id={props.describedBy}>CSV, UTF-8</span>}
  </>
)

describe('Tooltip (headless)', () => {
  // [[rule: tooltip-opens-on-hover-and-focus]]
  it('opens on hover only after --vela-delay-tooltip has passed', async () => {
    withDelayToken('300ms')
    render(<Export />)
    const trigger = screen.getByRole('button', { name: 'Export' })
    await userEvent.hover(trigger)
    await wait(100)
    expect(screen.queryByRole('tooltip')).toBeNull()
    await wait(400)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Download the last 24 hours as CSV')
    await userEvent.unhover(trigger)
    await wait(50)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  // [[rule: tooltip-opens-on-hover-and-focus]]
  it('opens at once on keyboard focus, and does not animate', async () => {
    withDelayToken('5s')
    render(<Export />)
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Export' })).toHaveFocus()
    await wait(20)
    const tip = screen.getByRole('tooltip')
    // Base UI marks a focus-opened tooltip instant; Tooltip.css skips the transition on it.
    expect(tip).toHaveAttribute('data-instant', 'focus')
  })

  // [[rule: tooltip-is-a-description]]
  it('is role="tooltip" and describes the trigger only while it is rendered', async () => {
    withDelayToken('0ms')
    render(<Export />)
    const trigger = screen.getByRole('button', { name: 'Export' })
    expect(trigger).not.toHaveAttribute('aria-describedby')
    await userEvent.hover(trigger)
    await wait(20)
    const tip = screen.getByRole('tooltip')
    expect(trigger).toHaveAttribute('aria-describedby', tip.id)
    expect(trigger).toHaveAccessibleDescription('Download the last 24 hours as CSV')
    // The NAME is still the trigger's own.
    expect(trigger).toHaveAccessibleName('Export')
    await userEvent.unhover(trigger)
    await wait(50)
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  // [[rule: tooltip-is-a-description]]
  it('keeps a description the trigger already had', async () => {
    withDelayToken('0ms')
    render(<Export describedBy="fmt" />)
    const trigger = screen.getByRole('button', { name: 'Export' })
    expect(trigger).toHaveAttribute('aria-describedby', 'fmt')
    await userEvent.hover(trigger)
    await wait(20)
    expect(trigger.getAttribute('aria-describedby')?.split(' ')).toEqual(['fmt', screen.getByRole('tooltip').id])
  })

  // [[rule: tooltip-escape-dismisses]]
  it('Escape dismisses it and leaves focus where it was', async () => {
    render(<Export />)
    screen.getByRole('button', { name: 'Before' }).focus()
    await userEvent.tab()
    await wait(20)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await wait(20)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('button', { name: 'Export' })).toHaveFocus()
  })

  // [[rule: tooltip-trigger-has-own-name]]
  it('throws when the trigger has no accessible name of its own', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Tooltip content="Delete the rule">
          <button type="button">
            <svg aria-hidden="true" />
          </button>
        </Tooltip>,
      ),
    ).toThrow('<Tooltip> trigger has no accessible name of its own')
    spy.mockRestore()
  })

  // [[rule: tooltip-trigger-has-own-name]]
  it('accepts an icon-only trigger named by aria-label', () => {
    render(
      <Tooltip content="Delete the rule">
        <button type="button" aria-label="Delete">
          <svg aria-hidden="true" />
        </button>
      </Tooltip>,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  // [[rule: tooltip-label-kind-matches-name]]
  it('kind="label" shows the trigger\'s own name, hidden from assistive technology and never wired', async () => {
    withDelayToken('0ms')
    render(
      <Tooltip kind="label" content="Search">
        <button type="button" aria-label="Search" aria-describedby="hint"><svg aria-hidden="true" /></button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Search' })
    await userEvent.hover(trigger)
    await wait(20)
    const popup = screen.getByRole('tooltip', { hidden: true })
    expect(popup).toHaveTextContent('Search')
    expect(popup).toHaveAttribute('aria-hidden', 'true')
    // Nothing points at it; what the trigger already described is left exactly as it was.
    expect(trigger).toHaveAttribute('aria-describedby', 'hint')
    expect(trigger.getAttribute('aria-describedby')).not.toContain(popup.id)
  })

  // [[rule: tooltip-label-kind-matches-name]]
  it('kind="label" throws a named error when the trigger\'s name is not the tooltip\'s words', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Tooltip kind="label" content="Search the logs">
          <button type="button" aria-label="Search"><svg aria-hidden="true" /></button>
        </Tooltip>,
      ),
    ).toThrow('<Tooltip kind="label">: the trigger\'s accessible name is "Search", but the tooltip says "Search the logs"')
    spy.mockRestore()
    // Text and aria-labelledby names count, spaces collapsed.
    render(<Tooltip kind="label" content="Export  as CSV"><Button>Export as CSV</Button></Tooltip>)
    render(
      <>
        <span id="n">Open audit log</span>
        <Tooltip kind="label" content="Open audit log"><button type="button" aria-labelledby="n">↗</button></Tooltip>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open audit log' })).toBeInTheDocument()
  })

  // [[rule: tooltip-is-a-description]]
  it('is a description by default: kind="description" is today\'s behaviour', async () => {
    withDelayToken('0ms')
    render(<Tooltip kind="description" content="Download as CSV"><Button>Export</Button></Tooltip>)
    const trigger = screen.getByRole('button', { name: 'Export' })
    await userEvent.hover(trigger)
    await wait(20)
    expect(screen.getByRole('tooltip')).not.toHaveAttribute('aria-hidden')
    expect(trigger).toHaveAccessibleDescription('Download as CSV')
  })

  it('maps the logical placements onto the popup', async () => {
    withDelayToken('0ms')
    render(
      <Tooltip content="Next page" placement="end" align="start">
        <Button>Next</Button>
      </Tooltip>,
    )
    await userEvent.hover(screen.getByRole('button', { name: 'Next' }))
    await wait(20)
    // jsdom has no layout, so the collision logic may flip it to the opposite side; what must hold
    // is that `end` is the logical inline axis, never a physical left or right.
    expect(['inline-end', 'inline-start']).toContain(screen.getByRole('tooltip').getAttribute('data-side'))
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-align', 'start')
    expect(screen.getByRole('tooltip').closest('.vela-overlay-portal')).toHaveClass('vela-root')
  })

  it('names the four placements in logical terms', () => {
    expect(['top', 'bottom', 'start', 'end'].map((p) => sideOf(p as 'top'))).toEqual(['top', 'bottom', 'inline-start', 'inline-end'])
  })

  describe('TooltipProvider', () => {
    // Two neighbours, as a toolbar holds them: each its own Tooltip, the pair grouped or not.
    const Pair = ({ grouped }: { grouped: boolean }) => {
      const pair = (
        <>
          <Tooltip content="Download as CSV"><Button>Export</Button></Tooltip>
          <Tooltip content="Print this view"><Button>Print</Button></Tooltip>
        </>
      )
      return grouped ? <TooltipProvider>{pair}</TooltipProvider> : pair
    }
    // The label kind, as a row of Icon Buttons uses it.
    const Labels = () => (
      <TooltipProvider>
        <Tooltip kind="label" content="Search"><button type="button" aria-label="Search">S</button></Tooltip>
        <Tooltip kind="label" content="Settings"><button type="button" aria-label="Settings">G</button></Tooltip>
      </TooltipProvider>
    )

    it('is exported from the headless entry, beside Tooltip, and renders only its children', () => {
      expect(headless.TooltipProvider).toBe(TooltipProvider)
      const { container } = render(<TooltipProvider><span data-testid="row">Row</span></TooltipProvider>)
      // No element of its own: the children are all it renders.
      expect(container.innerHTML).toBe('<span data-testid="row">Row</span>')
    })

    it('takes children and nothing else', () => {
      // A delay, a timeout or a close delay in JS would bypass --vela-delay-tooltip; none compiles.
      // @ts-expect-error delay is not a prop
      const a = <TooltipProvider delay={0}><span /></TooltipProvider>
      // @ts-expect-error timeout is not a prop
      const b = <TooltipProvider timeout={400}><span /></TooltipProvider>
      // @ts-expect-error closeDelay is not a prop
      const c = <TooltipProvider closeDelay={0}><span /></TooltipProvider>
      // @ts-expect-error children are required
      const d = <TooltipProvider />
      expect([a, b, c, d]).toHaveLength(4)
    })

    it('opens a neighbour at once once one tooltip in the group is open, and does not animate it', async () => {
      withDelayToken('300ms')
      render(<Pair grouped />)
      await userEvent.hover(screen.getByRole('button', { name: 'Export' }))
      await wait(400)
      expect(screen.getByRole('tooltip')).toHaveTextContent('Download as CSV')
      await userEvent.unhover(screen.getByRole('button', { name: 'Export' }))
      await userEvent.hover(screen.getByRole('button', { name: 'Print' }))
      await wait(20)
      // Export's may still be fading out, so Print's is found by its words.
      const tip = screen.getByText('Print this view')
      expect(tip).toHaveAttribute('role', 'tooltip')
      // Base UI marks a tooltip opened in the group's instant phase; Tooltip.css skips the grow.
      expect(tip).toHaveAttribute('data-instant', 'delay')
      expect(screen.getByRole('button', { name: 'Print' })).toHaveAccessibleDescription('Print this view')
    })

    it('groups label tooltips too', async () => {
      withDelayToken('300ms')
      render(<Labels />)
      await userEvent.hover(screen.getByRole('button', { name: 'Search' }))
      await wait(400)
      expect(screen.getByText('Search')).toHaveAttribute('aria-hidden', 'true')
      await userEvent.unhover(screen.getByRole('button', { name: 'Search' }))
      await userEvent.hover(screen.getByRole('button', { name: 'Settings' }))
      await wait(20)
      expect(screen.getByText('Settings')).toHaveAttribute('data-instant', 'delay')
      // Still heard once: nothing points at the label.
      expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveAttribute('aria-describedby')
    })

    it('outside a provider, the neighbour still waits the dwell', async () => {
      withDelayToken('300ms')
      render(<Pair grouped={false} />)
      await userEvent.hover(screen.getByRole('button', { name: 'Export' }))
      await wait(400)
      expect(screen.getByRole('tooltip')).toHaveTextContent('Download as CSV')
      await userEvent.unhover(screen.getByRole('button', { name: 'Export' }))
      await userEvent.hover(screen.getByRole('button', { name: 'Print' }))
      await wait(20)
      expect(screen.queryByText('Print this view')).toBeNull()
      await wait(400)
      expect(screen.getByText('Print this view')).toBeInTheDocument()
    })
  })
})
