import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// The site's error boundaries (demo/shell/ErrorBoundary.tsx; playground spec, section 7). The
// registry gains one test-only entry whose render throws for one value of a select, and the
// Overview page can be told to throw, so both boundaries can be driven from a real App.
const flags = vi.hoisted(() => ({ overviewThrows: false }))

vi.mock('../../demo/playground/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../demo/playground/registry')>()
  const button = actual.REGISTRY.find((e) => e.id === 'button')!
  const boom: (typeof actual.REGISTRY)[number] = {
    ...button,
    id: 'boom',
    name: 'Boom',
    seed: { ...button.seed, variant: 'destructive' },
    constrain: undefined,
    locks: undefined,
    // The range under the stage has a boundary of its own; this test is about the live stage's.
    range: undefined,
    render: (v) => {
      if (v.variant === 'destructive') throw new Error('Boom cannot render a destructive variant')
      return button.render(v)
    },
  }
  return { ...actual, REGISTRY: [...actual.REGISTRY, boom] }
})

// The nav and the router read the catalog (B8), so Boom is listed there too.
vi.mock('../../demo/playground/catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../demo/playground/catalog')>()
  const button = actual.CATALOG.find((e) => e.id === 'button')!
  return { ...actual, CATALOG: [...actual.CATALOG, { ...button, id: 'boom', name: 'Boom' }] }
})

vi.mock('../../demo/pages/Overview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../demo/pages/Overview')>()
  return {
    Overview: (props: Parameters<typeof actual.Overview>[0]) => {
      if (flags.overviewThrows) throw new Error('The overview broke')
      return actual.Overview(props)
    },
  }
})

const { App } = await import('../../demo/App')
const { SiteBoundary } = await import('../../demo/shell/ErrorBoundary')

beforeAll(() => {
  // jsdom has no matchMedia; the App asks it whether the screen is wide.
  window.matchMedia ??= ((q: string) => ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
})
let quiet: ReturnType<typeof vi.spyOn>
// React reports every caught render error on the console; the assertions below are the record.
beforeEach(() => { quiet = vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { quiet.mockRestore(); flags.overviewThrows = false; window.location.hash = '' })

const go = (hash: string) => act(() => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')) })

describe('the stage error boundary', () => {
  it('a render error in the stage leaves the nav working, and a prop change retries', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/components/boom'
    render(<SiteBoundary><App /></SiteBoundary>)

    // The stage's own copy, not the site's.
    // The page loads in its own chunk (B8), so the first render waits for it.
    const alert = await screen.findByRole('alert', {}, { timeout: 10000 })
    expect(alert).toHaveTextContent("This component stopped working with these settings. That's a fault in Vela, not in what you chose.")
    expect(screen.queryByText('The playground stopped working.')).toBeNull()
    expect(within(alert).getByText('Show details')).toBeInTheDocument()
    expect(within(alert).getByText('Boom cannot render a destructive variant')).toBeInTheDocument()

    // Report it on GitHub: component, closed-set settings and commit; never free text.
    const report = within(alert).getByRole('link', { name: 'Report it on GitHub' })
    const url = new URL(report.getAttribute('href')!)
    expect(url.origin + url.pathname).toBe('https://github.com/omkarpkh/vela/issues/new')
    const body = url.searchParams.get('body')!
    expect(body).toContain('Component: boom')
    expect(body).toContain('- variant: destructive')
    expect(body).toContain('- stage: beside')
    expect(body).toMatch(/Commit: \S+/)
    expect(body).not.toContain('Save Changes')   // the label is free text

    // The page around the stage still works: the heading, the controls, and the nav, whose groups
    // still collapse and open (the nav Filter is gone: Search covers it, spec v1.2).
    expect(screen.getByRole('heading', { level: 1, name: 'Boom' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Site' })
    const inputs = within(nav).getByRole('button', { name: 'Inputs' })
    await user.click(inputs)
    expect(inputs).toHaveAttribute('aria-expanded', 'false')
    await user.click(inputs)
    expect(within(nav).getByRole('link', { name: /^Toggle/ })).toBeInTheDocument()

    // A prop change retries: a variant that renders brings the stage back.
    const props = screen.getByRole('complementary', { name: 'Controls' })
    await user.click(within(within(props).getByRole('group', { name: 'variant' })).getByRole('button', { name: 'primary' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelectorAll('.pg-frame-body .vela-btn').length).toBe(1)   // Compare is Off: one frame, the page's theme

    // Back to the failing value: the boundary catches it again, and Reset settings retries with the seed.
    await user.click(within(within(props).getByRole('group', { name: 'variant' })).getByRole('button', { name: 'destructive' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset settings' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()   // the seed itself is the failing value

    // Navigation still works from the error state.
    await go('#/components/toggle')
    expect(screen.getByRole('heading', { level: 1, name: 'Toggle' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('the root error boundary', () => {
  it('a render error in the shell shows the site copy, with Reload and a report link', async () => {
    flags.overviewThrows = true
    window.location.hash = '#/'
    render(<SiteBoundary><App /></SiteBoundary>)
    expect(await screen.findByRole('heading', { level: 1, name: 'The playground stopped working.' })).toBeInTheDocument()
    expect(screen.getByText('Reload the page to try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    const url = new URL(screen.getByRole('link', { name: 'Report it on GitHub' }).getAttribute('href')!)
    expect(url.searchParams.get('body')).toContain('Page: #/')
    expect(screen.queryByRole('navigation', { name: 'Site' })).toBeNull()
  })
})
