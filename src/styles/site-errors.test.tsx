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
    unavailable: undefined,
    render: (v) => {
      if (v.variant === 'destructive') throw new Error('Boom cannot render a destructive variant')
      return button.render(v)
    },
  }
  return { ...actual, REGISTRY: [...actual.REGISTRY, boom] }
})

vi.mock('../../demo/pages/Overview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../demo/pages/Overview')>()
  return {
    Overview: () => {
      if (flags.overviewThrows) throw new Error('The overview broke')
      return actual.Overview()
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
  it('a render error in the stage leaves the nav and its filter working, and a prop change retries', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/components/boom'
    render(<SiteBoundary><App /></SiteBoundary>)

    // The stage's own copy, not the site's.
    const alert = await screen.findByRole('alert')
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
    expect(body).toContain('- stage: both')
    expect(body).toMatch(/Commit: \S+/)
    expect(body).not.toContain('Save Changes')   // the label is free text

    // The page around the stage still works: the heading, the props panel, the nav and its filter.
    expect(screen.getByRole('heading', { level: 1, name: 'Boom' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Site' })
    await user.type(within(nav).getByLabelText('Filter'), 'tog')
    expect(within(nav).getByRole('link', { name: 'Toggle' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Button' })).toBeNull()
    await user.clear(within(nav).getByLabelText('Filter'))

    // A prop change retries: a variant that renders brings the stage back.
    const props = screen.getByRole('complementary', { name: 'Props' })
    await user.selectOptions(within(props).getByLabelText('variant'), 'primary')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelectorAll('.pg-frame-body .vela-btn').length).toBe(2)

    // Back to the failing value: the boundary catches it again, and Reset settings retries with the seed.
    await user.selectOptions(within(props).getByLabelText('variant'), 'destructive')
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
