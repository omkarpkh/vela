import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createTheme, type ThemeOptions } from '@mui/material/styles'
import bridge from '../../bridges/vela.mui-theme.json'
import { Adopt } from '../../demo/Adopt'
import { measure, painted, ratioLabel, ratioOf, TEXT_MIN, type SeverityColour } from '../../demo/adopt-contrast'
import * as maths from '../../scripts/contrast-math.mjs'
import { contrast, loadThemes, resolve, THRESHOLD } from '../../scripts/contrast-core.mjs'

// The Adopt page's contrast labels (0.16.1, item 1b). The page measures with the very function
// PAIRS is asserted with, never a copy of it, and the Vela side passes wherever it draws a severity
// colour with text. tests/e2e/adopt.spec.ts holds the labels to what the browser paints.
const SEVERITIES: SeverityColour[] = ['success', 'warning', 'info', 'error']
const MODES = ['light', 'dark'] as const

describe('the Adopt page contrast labels', () => {
  it('measure with the function npm test asserts PAIRS with', () => {
    expect(contrast).toBe(maths.contrast)
    expect(TEXT_MIN).toBe(THRESHOLD.text)
  })

  it('paint a translucent colour over what is under it, as the browser does', () => {
    expect(painted('#fff')).toBe('#ffffff')
    expect(painted('rgb(98, 84, 52)')).toBe('#625434')
    // Material's dark-on-light label, rgba(0, 0, 0, 0.87), over white.
    expect(painted('rgba(0, 0, 0, 0.87)', '#ffffff')).toBe('#212121')
    expect(() => painted('rgba(0, 0, 0, 0.87)')).toThrow(/translucent/)
  })

  it('agree with the contrast suite on three token pairs, in both themes', () => {
    const themes = loadThemes()
    for (const mode of MODES)
      for (const [fg, bg] of [['--vela-bg-global', '--vela-text-severity-info'], ['--vela-text-severity-major', '--vela-bg-raised'], ['--vela-text-default', '--vela-bg-global']]) {
        const [f, b] = [resolve(themes[mode], fg), resolve(themes[mode], bg)]
        expect(ratioOf(f, b), `${mode} ${fg} on ${bg}`).toBe(contrast(f, b))
      }
  })

  it('say the ratio when it passes and the failure in words when it does not', () => {
    expect(ratioLabel(7.4512)).toBe('7.45:1')
    expect(ratioLabel(4.5)).toBe('4.50:1')
    expect(ratioLabel(4.0349)).toBe('4.03:1, below 4.5:1')
    // Just under the minimum is never rounded up to a passing-looking 4.50.
    expect(ratioLabel(4.4999)).toBe('4.49:1, below 4.5:1')
  })

  it('pass on the Vela side for every severity, wherever Material draws it with text, in both modes', () => {
    for (const mode of MODES) {
      const vela = createTheme(bridge[mode] as ThemeOptions)
      for (const c of SEVERITIES) {
        expect(measure.chip(vela, c), `${mode} ${c} filled chip`).toBeGreaterThanOrEqual(TEXT_MIN)
        expect(measure.textButton(vela, c), `${mode} ${c} text button`).toBeGreaterThanOrEqual(TEXT_MIN)
        expect(measure.alert(vela, c), `${mode} ${c} standard alert`).toBeGreaterThanOrEqual(TEXT_MIN)
      }
    }
  })

  it('render both sides with their computed labels, and none on the Vela side says "below"', () => {
    for (const mode of MODES) {
      const { container, unmount } = render(<Adopt mode={mode} />)
      const [stock, vela] = [...container.querySelectorAll('.adopt-col')]
      const notes = (col: Element) => [...col.querySelectorAll('[data-adopt-ratio]')]
      expect(notes(stock)).toHaveLength(6)
      expect(notes(vela)).toHaveLength(6)
      const stockTheme = createTheme({ palette: { mode } })
      const velaTheme = createTheme(bridge[mode] as ThemeOptions)
      for (const [col, theme] of [[stock, stockTheme], [vela, velaTheme]] as const)
        for (const n of notes(col)) {
          const [kind, c] = n.getAttribute('data-adopt-ratio')!.split(':') as ['chip' | 'alert' | 'text-button', SeverityColour]
          const ratio = kind === 'chip' ? measure.chip(theme, c) : kind === 'alert' ? measure.alert(theme, c) : measure.textButton(theme, c)
          expect(n.textContent).toBe(`Contrast ${ratioLabel(ratio)}`)
        }
      for (const n of notes(vela)) expect(n.textContent, `${mode} ${n.getAttribute('data-adopt-ratio')}`).not.toMatch(/below/)
      unmount()
    }
  })
})
