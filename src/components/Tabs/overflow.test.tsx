import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { Tabs as CoreTabs } from './Tabs'
import { Tabs as HeadlessTabs } from '../../headless/Tabs'
import { moreName } from '../../headless/Tabs/Tabs'
import { measureRow, revealScroll, inViewWithRing, type RowInput, type RowTab } from './overflow'

// Tabs overflow (guidelines/components/tabs.md, Overflow). The arithmetic is pure and tested here
// directly; the headless control is rendered with a laid-out row stubbed in, because jsdom lays
// nothing out. What only a browser can prove (the fades, the sticky tab, the ring, forced colours)
// is in tests/e2e/playground.spec.ts.

const tab = (width: number, extra: Partial<RowTab> = {}): RowTab => ({ width, selected: false, disabled: false, unseen: false, ...extra })
/** Ten 80px tabs with a 20px gap (980px of tabs), in a 300px row; the second is open. */
const row = (patch: Partial<RowInput> = {}): RowInput => ({
  tabs: Array.from({ length: 10 }, (_, i) => tab(80, { selected: i === 1 })),
  view: 300, scroll: 0, padStart: 0, gap: 20, ring: 4, fade: 20, room: 300, sticky: false,
  ...patch,
})

describe('Tabs overflow: the row arithmetic', () => {
  // [[rule: tabs-overflow-count-measured]]
  it('counts the tabs not wholly in view: cut by an edge or under a fade, whatever the scroll', () => {
    // 0–80, 100–180 and 200–280 are clear of the end fade (280–300); 300–380 is past the edge.
    const r = measureRow(row())
    expect(r.overflow).toBe(true)
    expect(r.tabs.map((t) => t.hidden)).toEqual([false, false, false, true, true, true, true, true, true, true])
    expect(r.hiddenCount).toBe(7)
    // One pixel narrower and the third tab runs into the fade: it is hidden too, though it is on screen.
    expect(measureRow(row({ view: 299, room: 299 })).hiddenCount).toBe(8)
    // Scrolled to the end: the start fade is drawn and the first tabs are the hidden ones.
    const end = measureRow(row({ scroll: 680 }))
    expect([end.moreStart, end.moreEnd]).toEqual([true, false])
    expect(end.tabs.slice(-3).map((t) => t.hidden)).toEqual([false, false, false])
    expect(end.hiddenCount).toBe(7)
  })

  // [[rule: tabs-overflow-count-measured]]
  it('measures nothing when every tab fits the row: no overflow, no fade, no count', () => {
    const r = measureRow(row({ room: 980, view: 980 }))
    expect(r).toMatchObject({ overflow: false, moreStart: false, moreEnd: false, hiddenCount: 0, unseenHidden: 0, stuck: null })
    expect(r.tabs.every((t) => !t.hidden && t.fade === 'none')).toBe(true)
    // The control's own width doesn't count: the tabs fit the row, so nothing appears, even if the
    // scroller is narrower while the control is still showing.
    expect(measureRow(row({ room: 980, view: 700 })).overflow).toBe(false)
  })

  // [[rule: tabs-overflow-count-measured]]
  it('fades only the tabs that reach an edge where more tabs are, with a mask, never the row', () => {
    const r = measureRow(row({ scroll: 300 }))
    // The tab at 300–380 is at the start edge (0–80 on screen) under the start fade (0–20).
    expect(r.tabs[3].fade).toMatch(/^linear-gradient\(to right, transparent 0px, currentColor 20px, currentColor/)
    // A tab clear of both fades has no mask.
    expect(r.tabs[4].fade).toBe('none')
  })

  // [[rule: tabs-overflow-count-measured]]
  it('on the headless row the open tab sticks to the edge it would leave by, never hides and is never faded', () => {
    const r = measureRow(row({ sticky: true, scroll: 400, padStart: 4 }))
    expect(r.stuck).toBe('start')
    // It sits the ring's reach in from the edge; the fade begins half a gap past it.
    expect(r.tabs[1]).toMatchObject({ hidden: false, fade: 'none', start: 4 })
    expect(r.edgeStart).toBe(4 + 80 + 10)
    // The tabs passing under it are hidden, and their mask is transparent up to its edge.
    expect(r.tabs[5].hidden).toBe(true)
    // Scrolled back to the start with the open tab far along: it sticks at the end instead.
    const far = measureRow(row({ sticky: true, padStart: 4, tabs: Array.from({ length: 10 }, (_, i) => tab(80, { selected: i === 8 })) }))
    expect(far.stuck).toBe('end')
    expect(far.tabs[8]).toMatchObject({ hidden: false, fade: 'none', start: 300 - 4 - 80 })
    // The core never sticks: the open tab can be scrolled out of view, the gap the spec names.
    expect(measureRow(row({ scroll: 400 })).stuck).toBeNull()
    expect(measureRow(row({ scroll: 400 })).tabs[1].hidden).toBe(true)
  })

  // [[rule: tabs-overflow-news-words]]
  it('counts the news of hidden tabs only: a tab in view with unseen adds nothing', () => {
    const tabs = Array.from({ length: 10 }, (_, i) => tab(80, { selected: i === 1, unseen: i === 0 || i === 8 || i === 9 }))
    expect(measureRow(row({ tabs })).unseenHidden).toBe(2)
    expect(measureRow(row({ tabs, scroll: 680 })).unseenHidden).toBe(1)
  })
})

describe('Tabs overflow: revealing a tab', () => {
  const inView = (input: RowInput, j: number) => {
    const at = { ...input, scroll: revealScroll(input, j) }
    return inViewWithRing(measureRow(at), at, j)
  }

  it('brings any tab wholly into view, its ring included, clear of the fades', () => {
    for (let j = 0; j < 10; j++) expect(inView(row(), j), `tab ${j}`).toBe(true)
    for (let j = 0; j < 10; j++) expect(inView(row({ scroll: 680 }), j), `tab ${j} from the end`).toBe(true)
  })

  it('moves the row as little as it can, and not at all when the tab is already in view', () => {
    expect(revealScroll(row(), 0)).toBe(0)
    expect(revealScroll(row(), 1)).toBe(0)
    // Tab 2 is 200–280: clear of the end fade with its ring means its end at 300 - 20 - 4.
    expect(revealScroll(row(), 2)).toBe(280 + 4 + 20 - 300)
  })

  it('on the headless row, clears the stuck open tab as well', () => {
    for (const scroll of [0, 250, 680]) {
      for (let j = 0; j < 10; j++) expect(inView(row({ sticky: true, padStart: 4, scroll }), j), `tab ${j} from ${scroll}`).toBe(true)
    }
  })
})

// ---- the headless control, rendered against a laid-out row ----------------------------------------
// jsdom lays nothing out, so the widths the measure reads are stubbed: each tab 100px, the row and
// the scroller 250px. Stylesheets don't load here, so the gap, the ring and the fade read as 0.
const TAB = 100
let restore: (() => void) | null = null
function layOut(rowWidth: number) {
  // clientWidth lives on Element.prototype; the stub shadows it on HTMLElement.prototype and is deleted after.
  const rect = HTMLElement.prototype.getBoundingClientRect
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('vela-tabs__row') || this.classList.contains('vela-tabs__list') ? rowWidth : 0
    },
  })
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const w = this.getAttribute('role') === 'tab' ? TAB : 0
    return { x: 0, y: 0, top: 0, left: 0, right: w, bottom: 0, width: w, height: 0, toJSON: () => ({}) } as DOMRect
  }
  restore = () => {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
    HTMLElement.prototype.getBoundingClientRect = rect
  }
}
afterEach(() => { restore?.(); restore = null })

const VIEWS = [
  ['overview', 'Overview'], ['alerts', 'Alerts'], ['assets', 'Assets'], ['identities', 'Identities'],
  ['audit', 'Audit log'], ['sessions', 'Sessions'],
] as const

function Row({ unseen = [] as string[], value }: { unseen?: string[]; value?: string }) {
  return (
    <HeadlessTabs {...(value ? { value } : { defaultValue: 'alerts' })}>
      <HeadlessTabs.List aria-label="Views">
        {VIEWS.map(([v, label]) => (
          <HeadlessTabs.Trigger key={v} value={v} count={v === 'alerts' ? 12 : undefined} disabled={v === 'audit'} unseen={unseen.includes(v)}>{label}</HeadlessTabs.Trigger>
        ))}
      </HeadlessTabs.List>
      {VIEWS.map(([v]) => <HeadlessTabs.Panel key={v} value={v}>{v} panel</HeadlessTabs.Panel>)}
    </HeadlessTabs>
  )
}
const control = () => screen.queryByRole('button', { name: /^All tabs/ })
const settle = () => act(() => new Promise((r) => setTimeout(r, 40)))

describe('Tabs overflow: the headless control', () => {
  beforeEach(() => layOut(250))

  // [[rule: tabs-overflow-count-measured]]
  // [[rule: tabs-overflow-news-words]]
  it('says how many tabs are hidden and how many of those have news, in words, and names itself in full', () => {
    render(<Row unseen={['sessions', 'overview']} />)
    // Six 100px tabs in 250px: Overview and Alerts are whole; four are hidden. Overview is in view,
    // so its news does not count; Sessions is hidden, so it does.
    const more = control()!
    expect(more).toHaveTextContent('4 more · 1 new')
    expect(more).toHaveAccessibleName('All tabs, 4 hidden, 1 with new items')
    expect(moreName(6, 0)).toBe('All tabs, 6 hidden')
    // The news is its own words, at a heavier weight in the stylesheet, never a dot.
    expect(more.querySelector('.vela-tabs__more-news')).toHaveTextContent('· 1 new')
    expect(more.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // Outside the tablist, which still holds only its tabs.
    const list = screen.getByRole('tablist')
    expect(list).not.toContainElement(more)
    expect([...list.children].every((c) => c.getAttribute('role') === 'tab')).toBe(true)
  })

  // [[rule: tabs-overflow-count-measured]]
  it('renders no control when every tab fits', () => {
    restore?.()
    layOut(1000)
    render(<Row unseen={['sessions']} />)
    expect(control()).toBeNull()
    expect(document.querySelector('.vela-tabs__row')).not.toHaveAttribute('data-vela-overflow')
  })

  // [[rule: tabs-overflow-list-every-tab]]
  it('lists every tab that can be opened, in row order, by its full name: the open one says "open", news says "new"', async () => {
    render(<Row unseen={['sessions']} />)
    await userEvent.click(control()!)
    await settle()
    const menu = screen.getByRole('menu', { name: 'All tabs' })
    const items = screen.getAllByRole('menuitemradio')
    for (const i of items) expect(menu).toContainElement(i)
    // Audit log is disabled: it can't be opened, and the list doesn't offer it. The count badge is not part of the name.
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(['Overview', 'Alerts, open', 'Assets', 'Identities', 'Sessions, new'])
    expect(items.filter((i) => i.getAttribute('aria-checked') === 'true').map((i) => i.getAttribute('aria-label'))).toEqual(['Alerts, open'])
  })

  // [[rule: tabs-overflow-list-every-tab]]
  it('choosing a tab in the list opens it, as a click on it would', async () => {
    render(<Row />)
    await userEvent.click(control()!)
    await settle()
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Identities' }))
    await settle()
    expect(screen.getByRole('tab', { name: 'Identities' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('identities panel')
  })

  // [[rule: tabs-overflow-announce-news]]
  it('announces news once, politely, when it arrives in a hidden tab; never on the first render', async () => {
    const { rerender } = render(<Row unseen={['assets']} />)
    const live = document.querySelector('.vela-tabs__row [aria-live="polite"]')!
    expect(live).not.toBeNull()
    await settle()
    expect(live).toHaveTextContent('')
    rerender(<Row unseen={['assets', 'sessions']} />)
    await waitFor(() => expect(live).toHaveTextContent('All tabs, 2 with new items'))
    // News on a tab in view is not news the control carries: nothing new is said.
    rerender(<Row unseen={['assets', 'sessions', 'overview']} />)
    await settle()
    expect(live).toHaveTextContent('All tabs, 2 with new items')
    // Cleared: the region empties, which is not announced.
    rerender(<Row unseen={[]} />)
    await waitFor(() => expect(live).toHaveTextContent(''))
    expect(control()).toHaveTextContent(/^4 more$/)
  })

  it('the core list has no control, no row and no live region', () => {
    const { container } = render(
      <CoreTabs defaultValue="alerts">
        <CoreTabs.List aria-label="Views">
          {VIEWS.map(([v, label]) => <CoreTabs.Trigger key={v} value={v}>{label}</CoreTabs.Trigger>)}
        </CoreTabs.List>
      </CoreTabs>,
    )
    expect(container.querySelector('.vela-tabs__row, .vela-tabs__more, [aria-live]')).toBeNull()
    expect(control()).toBeNull()
  })
})
