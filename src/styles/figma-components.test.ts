import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// scripts/figma/components/*.figma.js are the source of the library's component sets, and they
// can only run inside Figma. check-components.mjs runs them against a mock of the Plugin API, so
// the tree a rebuild would create can be asserted here — and linted with the rules a design-system
// reviewer applies to the file: spacing from the scale, every text styled, no placeholder layers,
// sizes bound, colours bound. The live library is compared with the same dump by
// `npm run components:figma:check`.
const root = process.cwd()
const cli = (...args: string[]) => {
  try { return execFileSync('node', ['scripts/figma/check-components.mjs', ...args, '--json'], { cwd: root, encoding: 'utf8' }) }
  catch (e: any) { return e.stdout as string }
}
const lintReport: Record<string, { problems: { rule: string; node: string; what: string; waived: boolean }[]; allow: { rule: string; reason: string }[] }> = JSON.parse(cli('--lint'))
const dump = (name: string) => JSON.parse(cli('--dump', name))
const styles: any[] = JSON.parse(execFileSync('node', ['scripts/figma/text-styles.mjs', '--json'], { cwd: root, encoding: 'utf8' }))
const BUILDERS = ['button', 'contextual-alert', 'input', 'status-indicator', 'tabs', 'toggle']

describe('Figma builders, built in the mock Plugin API', () => {
  it('runs every builder', () => {
    expect(Object.keys(lintReport).sort()).toEqual(BUILDERS)
  })

  it.each(BUILDERS)('%s passes the reviewer rules', (name) => {
    const bad = lintReport[name].problems.filter((p) => !p.waived)
    expect(bad.map((p) => `${p.rule}  ${p.node}: ${p.what}`)).toEqual([])
  })

  it('only the two builders with recorded literal geometry carry waivers', () => {
    const waiving = Object.entries(lintReport).filter(([, r]) => r.allow.length).map(([n]) => n).sort()
    expect(waiving).toEqual(['status-indicator', 'toggle'])
  })
})

describe('Contextual Alert, as the library has it', () => {
  const alert = dump('contextual-alert')
  const SEV = ['success', 'info', 'warning', 'minor', 'major', 'critical']

  it('has one variant per severity and the Dismissible boolean', () => {
    expect(alert.variants.map((v: any) => v.n)).toEqual(SEV.map((s) => `Severity=${s}`))
    expect(Object.keys(alert.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Dismissible', 'Severity'])
  })

  it('spaces every box from the scale: space/10 to the mark, space/10 and space/15 padding, space/5 between title and message', () => {
    for (const v of alert.variants) {
      expect(v.gap[1]).toBe('space/10')
      expect(v.pad.map((p: any) => p[1])).toEqual(['space/10', 'space/15', 'space/10', 'space/15'])
      expect(v.ch.find((c: any) => c.n === 'Content').gap[1]).toBe('space/5')
    }
  })

  it('wraps each shape in a centred "Status mark / <severity>" box, icon/20 by line-height/body, the shape at icon/16', () => {
    for (const v of alert.variants) {
      const sev = v.n.split('=')[1]
      const mark = v.ch[0]
      expect(mark.n).toBe(`Status mark / ${sev}`)
      expect([mark.lm, mark.ax, mark.sz]).toEqual(['HORIZONTAL', 'CENTER/CENTER', 'FIXED/FIXED'])
      expect(mark.wh.slice(2)).toEqual(['icon/20', 'line-height/body'])
      expect(mark.ch).toHaveLength(1)
      expect(mark.ch[0].n).toBe(`Shape / ${sev}`)
      expect(mark.ch[0].t).toBe(['warning', 'minor', 'major', 'critical'].includes(sev) ? 'POLYGON' : 'ELLIPSE')
      expect(mark.ch[0].wh.slice(2)).toEqual(['icon/16', 'icon/16'])
      expect(mark.ch[0].fill).toEqual([`severity/${sev}/icon`])
    }
    expect(alert.variants.find((v: any) => v.n === 'Severity=critical').ch[0].ch[0].pts).toBe(8)
    expect(alert.variants.find((v: any) => v.n === 'Severity=warning').ch[0].ch[0].pts).toBe(3)
  })

  it('sets the dismiss in Body/Default at icon/20 by line-height/body, and hides it outright on critical', () => {
    for (const v of alert.variants) {
      const x = v.ch.find((c: any) => c.n === 'Dismiss / Close')
      expect([x.style, x.font, x.fs, x.lh]).toEqual(['Body/Default', 'Open Sans Regular', 14, 21])
      expect(x.wh.slice(2)).toEqual(['icon/20', 'line-height/body'])
      if (v.n === 'Severity=critical') { expect(x.hidden).toBe(true); expect(x.ref).toBeUndefined() }
      else expect(Object.keys(x.ref)).toEqual(['visible'])
    }
  })

  it('names no layer Placeholder, and the status-mark note reaches the Figma description verbatim', () => {
    expect(JSON.stringify(alert)).not.toMatch(/placeholder/i)
    const entries: any[] = JSON.parse(execFileSync('node', ['scripts/sync-figma-descriptions.mjs', '--json'], { cwd: root, encoding: 'utf8' }))
    expect(entries.find((e) => e.set === 'Contextual Alert').description).toContain(
      'The status mark is a simple shape: a circle for success and info, a triangle for warning, minor and major, an octagon for critical. It stays until Vela has an icon set. Severity is also carried by the title text, never by colour alone.',
    )
  })
})

describe('Button icon slot', () => {
  const button = dump('button')

  it('is a centred auto-layout box bound to the icon size, holding one union glyph in the label colour', () => {
    expect(button.variants).toHaveLength(24)
    for (const v of button.variants) {
      const icon = v.ch.find((c: any) => c.n === 'Icon')
      const label = v.ch.find((c: any) => c.t === 'TEXT')
      expect([icon.lm, icon.ax, icon.sz, icon.hidden]).toEqual(['HORIZONTAL', 'CENTER/CENTER', 'FIXED/FIXED', true])
      const size = v.n.includes('Size=tiny') ? 'icon/12' : 'icon/16'
      expect(icon.wh.slice(2)).toEqual([size, size])
      expect(icon.ch).toHaveLength(1)
      expect(icon.ch[0]).toMatchObject({ t: 'BOOLEAN_OPERATION', n: 'Glyph / plus', op: 'UNION', fill: label.fill })
      expect(icon.ch[0].ch.map((c: any) => c.n)).toEqual(['bar-h', 'bar-v'])
      expect(Object.keys(icon.ref)).toEqual(['visible'])
    }
  })
})

describe('Tab count', () => {
  const tab = dump('tabs')

  it('uses the Tab/Count styles, never a weight override that would detach the style', () => {
    expect(tab.variants).toHaveLength(6)
    for (const v of tab.variants) {
      const count = v.ch.find((c: any) => c.n === 'Count')
      expect(count.style).toBe(v.n.includes('Size=large') ? 'Tab/Count Large' : 'Tab/Count')
      expect(count.font).toBe('Open Sans SemiBold')
      expect(count.fs).toBe(v.n.includes('Size=large') ? 18 : 14)
    }
  })
})

describe('text styles have a source', () => {
  it('derives one style per ramp size the way the Dart theme does, plus the semibold variants', () => {
    expect(styles.map((s) => s.name)).toEqual([
      'Heading/H1', 'Heading/H2', 'Heading/H3', 'Heading/H4', 'Heading/H5', 'Heading/H6',
      'Body/Default', 'Body/Meta', 'Button/Tiny', 'Button/Regular', 'Button/Large', 'Button/Huge',
      'Tab/Default', 'Tab/Large', 'Body/Link', 'Tab/Count', 'Tab/Count Large',
    ])
  })

  it('binds Tab/Count to size/tab, line-height/tab and weight/semibold, and Tab/Count Large to the large pair', () => {
    const c = styles.find((s) => s.name === 'Tab/Count'), l = styles.find((s) => s.name === 'Tab/Count Large')
    expect([c.size.figma, c.lineHeight.figma, c.weight.figma]).toEqual(['size/tab', 'line-height/tab', 'weight/semibold'])
    expect([l.size.figma, l.lineHeight.figma, l.weight.figma]).toEqual(['size/tab-large', 'line-height/tab-large', 'weight/semibold'])
    expect(c.fontName).toEqual({ family: 'Open Sans', style: 'SemiBold' })
    expect([c.size.value, c.lineHeight.value, l.size.value, l.lineHeight.value]).toEqual([14, 19, 18, 25])
    expect(c.description).toBe('The count beside a tab label, e.g. "Proposals 9". Same size and line height as Tab/Default, semibold.')
  })

  it('every style a builder applies exists in the source', () => {
    const names = new Set(styles.map((s) => s.name))
    for (const f of BUILDERS) {
      const src = readFileSync(resolve(root, `scripts/figma/components/${f}.figma.js`), 'utf8')
      for (const m of src.matchAll(/'((?:Heading|Body|Button|Tab)\/[^']+)'/g)) expect(names.has(m[1]), `${f} applies ${m[1]}`).toBe(true)
    }
  })

  it('the generated script creates-or-updates by name and binds every property it sets', () => {
    const script = execFileSync('node', ['scripts/figma/text-styles.mjs'], { cwd: root, encoding: 'utf8' })
    expect(script).toContain('let s = existing[e.name];')
    expect(script).toContain('s.setBoundVariable(field, need(name))')
    expect(script).toContain('"fontWeight":"weight/semibold"')
  })
})
