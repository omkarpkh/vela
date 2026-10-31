import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Segments } from '../../demo/shell/Segments'

// The site's Segmented Control stand-in (demo/shell/Segments.tsx; playground spec, section 5, D4).
// Each value is a button; Tab reaches each one; Enter or Space selects; arrow keys do nothing; the
// selected value carries aria-current="true" and applies at once.
type V = 'system' | 'light' | 'dark'
const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

function Harness() {
  const [v, setV] = useState<V>('system')
  return (
    <>
      <Segments label="Theme" value={v} options={OPTIONS} onChange={setV} />
      <output aria-label="chosen">{v}</output>
    </>
  )
}

describe('Segments (shell part for Segmented Control)', () => {
  it('is a named group of buttons; only the selected one carries aria-current="true"', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Theme' })
    const buttons = Array.from(group.querySelectorAll('button'))
    expect(buttons.map((b) => b.textContent)).toEqual(['System', 'Light', 'Dark'])
    expect(buttons.map((b) => b.getAttribute('aria-current'))).toEqual(['true', null, null])
    for (const b of buttons) expect(b).toHaveAttribute('type', 'button')
    // Not a primary filled Button standing for "selected".
    expect(group.querySelector('.vela-btn')).toBeNull()
  })

  it('Tab moves to each value, arrow keys do nothing, Enter and Space select at once', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const [system, light, dark] = ['System', 'Light', 'Dark'].map((name) => screen.getByRole('button', { name }))
    await user.tab()
    expect(system).toHaveFocus()
    await user.tab()
    expect(light).toHaveFocus()
    await user.tab()
    expect(dark).toHaveFocus()
    await user.tab({ shift: true })
    expect(light).toHaveFocus()

    await user.keyboard('{ArrowRight}{ArrowLeft}{ArrowDown}{Home}{End}')
    expect(light).toHaveFocus()
    expect(screen.getByLabelText('chosen')).toHaveTextContent('system')

    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('chosen')).toHaveTextContent('light')
    expect(light).toHaveAttribute('aria-current', 'true')
    expect(system).not.toHaveAttribute('aria-current')

    await user.tab()
    await user.keyboard(' ')
    expect(dark).toHaveAttribute('aria-current', 'true')
    expect(screen.getByLabelText('chosen')).toHaveTextContent('dark')
  })
})

// The audit counted two or more primary filled buttons per page, used to mean "selected". None of
// the site's sources may do that again: "selected" is a Segments value, never a Button variant.
describe('the site never uses a primary filled Button to mean "selected"', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : []
    })
  const files = walk(resolve(process.cwd(), 'demo'))
  it.each(files.map((f) => f.replace(process.cwd() + '/', '')))('%s', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8')
    expect(src).not.toMatch(/variant=\{[^}]*\?\s*'primary'/)
    expect(src).not.toMatch(/appearance=\{[^}]*\?\s*'filled'/)
  })
})
