import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

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
const dump = (name: string, set?: string) => JSON.parse(set ? cli('--dump', name, `--set=${set}`) : cli('--dump', name))
const styles: any[] = JSON.parse(execFileSync('node', ['scripts/figma/text-styles.mjs', '--json'], { cwd: root, encoding: 'utf8' }))
const BUILDERS = ['button', 'checkbox', 'contextual-alert', 'dialog', 'icon', 'input', 'popover', 'radio-group', 'risk-pill', 'status-indicator', 'table', 'tabs', 'text-area', 'toast', 'toggle', 'tooltip']

describe('Figma builders, built in the mock Plugin API', () => {
  it('runs every builder', () => {
    expect(Object.keys(lintReport).sort()).toEqual(BUILDERS)
  })

  it.each(BUILDERS)('%s passes the reviewer rules', (name) => {
    const bad = lintReport[name].problems.filter((p) => !p.waived)
    expect(bad.map((p) => `${p.rule}  ${p.node}: ${p.what}`)).toEqual([])
  })

  it('a TEXT property bound only where every variant writes the same word: Toggle, Checkbox and Radio keep theirs', () => {
    for (const [name, word] of [['toggle', 'Email alerts'], ['checkbox', 'Accept the terms'], ['radio-group', 'Monitor']]) {
      const d = dump(name)
      const key = Object.keys(d.defs).find((k) => k.startsWith('Label text#'))!
      expect(d.defs[key], name).toBe(`TEXT=${JSON.stringify(word)}`)
      for (const v of d.variants) expect(JSON.stringify(v), `${name} ${v.n}`).toContain(`"chars":${JSON.stringify(word)}`)
    }
  })

  it('fails a builder that binds one TEXT property in variants whose texts differ (text-property-collapse)', () => {
    // Figma holds one default per TEXT property for the whole set: binding Low / Medium / High to
    // it shows the last word in every variant. This is the Risk Pill builder before the fix.
    const dir = mkdtempSync(join(tmpdir(), 'vela-figma-'))
    const file = join(dir, 'collapsing.figma.js')
    writeFileSync(file, `// @page Fixture
// @set  Fixture
const variants = [];
for (const w of ['Low', 'Medium', 'High']) {
  const c = figma.createComponent(); c.name = 'Word=' + w; c.layoutMode = 'HORIZONTAL'; c.fills = [];
  const t = figma.createText(); t.name = 'Label'; t.characters = w; await t.setTextStyleIdAsync(style('Body/Meta').id);
  t.fills = [paint('text/default')]; c.appendChild(t); variants.push(c);
}
const set = figma.combineAsVariants(variants, page); set.name = SET;
const key = set.addComponentProperty('Label text', 'TEXT', 'Low');
for (const v of set.children) v.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: key };
return { created: SET };
`)
    const r = JSON.parse(cli('--lint', file))[file]
    expect(r.problems.filter((p: any) => !p.waived).map((p: any) => p.rule)).toEqual(['text-property-collapse'])
    expect(r.problems[0].what).toContain('"Low", "Medium", "High"')
    // and the mock shows what the live file showed: every variant says the last word
    const d = dump(file)
    expect(d.variants.map((v: any) => v.ch[0].chars)).toEqual(['High', 'High', 'High'])
  })

  it('only the builders with recorded literal geometry carry waivers', () => {
    // status-indicator and toggle: diameters with no token. icon (29 Oct 2026): the glyph is drawn
    // geometry on Lucide's 24-unit grid inside a box bound to icon/size — not a layout.
    const waiving = Object.entries(lintReport).filter(([, r]) => r.allow.length).map(([n]) => n).sort()
    expect(waiving).toEqual(['icon', 'status-indicator', 'toggle'])
    expect(lintReport.icon.allow.map((a) => a.rule).sort()).toEqual(['absolute-children', 'raw-size'])
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

describe('Risk Pill, as the builder creates it', () => {
  const pill = dump('risk-pill')
  const RISK = ['low', 'medium', 'high']

  it('has Risk × Size variants and no TEXT property, nothing literal', () => {
    expect(pill.variants.map((v: any) => v.n)).toEqual(RISK.flatMap((r) => ['regular', 'small'].map((s) => `Risk=${r}, Size=${s}`)))
    expect(Object.keys(pill.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Risk', 'Size'])
    expect(lintReport['risk-pill'].allow).toEqual([])
  })

  it('keeps each variant’s own level word in an unbound Label layer: Low, Medium, High', () => {
    const words = pill.variants.map((v: any) => v.ch.find((c: any) => c.n === 'Label').chars)
    expect(words).toEqual(['Low', 'Low', 'Medium', 'Medium', 'High', 'High'])
  })

  it('binds every fill, stroke and label to that level’s own risk row — never severity, never status', () => {
    for (const v of pill.variants) {
      const risk = v.n.match(/Risk=(\w+)/)![1]
      expect(v.fill).toEqual([`risk/${risk}/bg`])
      expect(v.stroke).toEqual([`risk/${risk}/border`])
      expect(v.sw).toBe(1)
      expect(v.rad[1]).toBe('radius/3')
      const label = v.ch.find((c: any) => c.t === 'TEXT')
      expect([label.n, label.style, label.fill]).toEqual(['Label', 'Body/Meta', [`risk/${risk}/text`]])
      expect(label.ref).toBeUndefined()
    }
  })

  it('regular binds control-height/24 and pads space/10; small hugs its text and pads space/5', () => {
    for (const v of pill.variants) {
      const small = v.n.endsWith('Size=small')
      expect(v.sz).toBe(small ? 'AUTO/AUTO' : 'AUTO/FIXED')
      expect(v.wh[3]).toBe(small ? null : 'control-height/24')
      expect(v.pad.map((p: any) => p[1])).toEqual(small ? [null, 'space/5', null, 'space/5'] : [null, 'space/10', null, 'space/10'])
    }
  })
})

describe('Icon, as the builder creates it', () => {
  const icon = dump('icon')
  const list: string[] = JSON.parse(readFileSync(resolve(root, 'scripts/icons.list.json'), 'utf8')).icons

  it('has one Glyph variant per curated name, in the list order, and no other property', () => {
    expect(icon.variants.map((v: any) => v.n)).toEqual(list.map((n) => `Glyph=${n}`))
    expect(Object.keys(icon.defs)).toEqual(['Glyph'])
  })

  it('binds every box to icon/size and strokes one flattened vector with icon/strong, no fill', () => {
    for (const v of icon.variants) {
      const name = v.n.split('=')[1]
      expect(v.wh.slice(2)).toEqual(['icon/size', 'icon/size'])
      expect(v.fill).toEqual([])
      expect(v.ch).toHaveLength(1)
      expect(v.ch[0]).toMatchObject({ t: 'VECTOR', n: `Glyph / ${name}`, fill: [], stroke: ['icon/strong'], sa: 'CENTER' })
    }
  })

  it('writes the stroke the code renders at regular: icon/stroke × icon/size ÷ 24', () => {
    // 2 grid units in a 16px box = 1.33px. Figma cannot bind a product of two variables, so this is
    // the one literal on the page, derived from the variables when the script runs.
    for (const v of icon.variants) expect(v.ch[0].sw).toBe(1.33)
  })

  it('stays under the 50 KB the MCP accepts as one script', async () => {
    const { generate } = await import('../../scripts/figma/build-components.mjs')
    expect(Buffer.byteLength(generate('icon'))).toBeLessThan(50 * 1024)
  })
})

describe('Checkbox and Radio, as the builders create them', () => {
  const checkbox = dump('checkbox')
  const radio = dump('radio-group')

  it('Checkbox has State × Size, Label text and Description; Radio has State, Label text and Description; no waivers', () => {
    expect(checkbox.variants.map((v: any) => v.n)).toEqual(
      ['unchecked', 'checked', 'indeterminate'].flatMap((st) => ['regular', 'tiny'].map((sz) => `State=${st}, Size=${sz}`)),
    )
    expect(Object.keys(checkbox.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Description', 'Label text', 'Size', 'State'])
    expect(radio.variants.map((v: any) => v.n)).toEqual(['State=unselected', 'State=selected'])
    expect(Object.keys(radio.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Description', 'Label text', 'State'])
    expect(lintReport.checkbox.allow).toEqual([])
    expect(lintReport['radio-group'].allow).toEqual([])
  })

  it('sits the box on the first label line and binds it to the check family; the glyph is one union shape', () => {
    for (const v of checkbox.variants) {
      const tiny = v.n.endsWith('Size=tiny')
      const on = !v.n.includes('State=unchecked')
      const size = tiny ? 'control/checkbox/size-tiny' : 'control/checkbox/size'
      const slot = v.ch[0]
      expect([slot.n, slot.ax, slot.sz]).toEqual(['Control', 'CENTER/CENTER', 'FIXED/FIXED'])
      expect(slot.wh.slice(2)).toEqual([size, tiny ? 'line-height/meta' : 'line-height/body'])
      const box = slot.ch[0]
      expect(box.n).toBe('Box')
      expect(box.wh.slice(2)).toEqual([size, size])
      expect(box.rad[1]).toBe('radius/3')
      expect(box.fill).toEqual([on ? 'control/check/bg-checked' : 'control/bg'])
      expect(box.stroke).toEqual([on ? 'control/check/bg-checked' : 'control/border'])
      if (on) {
        expect(box.ch).toHaveLength(1)
        expect(box.ch[0]).toMatchObject({ t: 'BOOLEAN_OPERATION', op: 'UNION', fill: ['control/check/mark'] })
        expect(box.ch[0].n).toBe(v.n.includes('indeterminate') ? 'Glyph / dash' : 'Glyph / check')
      } else expect(box.ch).toEqual([])
      const label = v.ch[1].ch.find((c: any) => c.n === 'Label')
      expect(label.style).toBe(tiny ? 'Body/Meta' : 'Body/Default')
    }
  })

  it('draws the radio circle as an ellipse at control/radio/size and the dot at control/radio/dot in control/check/mark', () => {
    for (const v of radio.variants) {
      const on = v.n === 'State=selected'
      const slot = v.ch[0]
      expect(slot.wh.slice(2)).toEqual(['control/radio/size', 'line-height/body'])
      const [circle, dot] = slot.ch
      expect([circle.t, circle.n]).toEqual(['ELLIPSE', 'Circle'])
      expect(circle.wh.slice(2)).toEqual(['control/radio/size', 'control/radio/size'])
      expect(circle.fill).toEqual([on ? 'control/check/bg-checked' : 'control/bg'])
      if (on) {
        expect([dot.t, dot.n, dot.fill]).toEqual(['ELLIPSE', 'Dot', ['control/check/mark']])
        expect(dot.wh.slice(2)).toEqual(['control/radio/dot', 'control/radio/dot'])
      } else expect(slot.ch).toHaveLength(1)
    }
  })
})

describe('Table, as the builder creates its three sets', () => {
  const head = dump('table', 'Table Header Cell')
  const cell = dump('table', 'Table Cell')
  const row = dump('table', 'Table Row')
  const D = ['comfortable', 'compact']
  const pads = (density: string) => ['space/' + (density === 'compact' ? 5 : 10), 'space/10', 'space/' + (density === 'compact' ? 5 : 10), 'space/10']

  it('declares three sets on one page, linted together, with no waiver', () => {
    expect([head.set, cell.set, row.set]).toEqual(['Table Header Cell', 'Table Cell', 'Table Row'])
    expect(lintReport.table.allow).toEqual([])
    expect(lintReport.table.problems).toEqual([])
  })

  it('writes one word in every variant of each TEXT property, so neither collapses (text-property-collapse)', () => {
    for (const [d, prop, layer, word] of [[head, 'Label text', 'Label', 'Last seen'], [cell, 'Value text', 'Value', 'api-gateway-01']] as const) {
      const key = Object.keys(d.defs).find((k) => k.startsWith(prop + '#'))!
      expect(d.defs[key], prop).toBe(`TEXT=${JSON.stringify(word)}`)
      for (const v of d.variants) expect(v.ch.find((c: any) => c.n === layer).chars, `${prop} ${v.n}`).toBe(word)
    }
  })

  it('Header Cell is Density × Sort × Align with a Label text property; the header sits on surface/global over a border/default rule', () => {
    expect(head.variants.map((v: any) => v.n)).toEqual(
      D.flatMap((d) => ['unsortable', 'none', 'ascending', 'descending'].flatMap((s) => ['start', 'end'].map((a) => `Density=${d}, Sort=${s}, Align=${a}`))),
    )
    expect(Object.keys(head.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Align', 'Density', 'Label text', 'Sort'])
    for (const v of head.variants) {
      const [, density, sort, align] = v.n.match(/Density=(\w+), Sort=(\w+), Align=(\w+)/)!
      expect(v.fill).toEqual(['surface/global'])
      expect([v.stroke, v.swx]).toEqual([['border/default'], [0, 0, 1, 0]])
      expect(v.pad.map((p: any) => p[1])).toEqual(pads(density))
      expect(v.ax).toBe(`${align === 'end' ? 'MAX' : 'MIN'}/CENTER`)
      const label = v.ch.find((c: any) => c.n === 'Label')
      expect([label.style, label.fill]).toEqual(['Heading/H6', ['text/default']])
      const icon = v.ch.find((c: any) => c.n === 'Sort icon')
      if (sort === 'unsortable') { expect(icon).toBeUndefined(); continue }
      expect(icon.wh.slice(2)).toEqual(['icon/12', 'icon/12'])
      expect(icon.ch[0]).toMatchObject({ t: 'BOOLEAN_OPERATION', n: `Glyph / sort ${sort}`, op: 'UNION', fill: [sort === 'none' ? 'icon/default' : 'text/default'] })
      // an end-aligned column puts the glyph first, as the code's row-reverse does
      expect(v.ch.map((c: any) => c.n)).toEqual(align === 'end' ? ['Sort icon', 'Label'] : ['Label', 'Sort icon'])
    }
  })

  it('Cell is Density × Align with a Value text property, unfilled, over a border/subtle rule', () => {
    expect(cell.variants.map((v: any) => v.n)).toEqual(D.flatMap((d) => ['start', 'end'].map((a) => `Density=${d}, Align=${a}`)))
    expect(Object.keys(cell.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Align', 'Density', 'Value text'])
    for (const v of cell.variants) {
      expect(v.fill).toEqual([])
      expect([v.stroke, v.swx]).toEqual([['border/subtle'], [0, 0, 1, 0]])
      expect(v.pad.map((p: any) => p[1])).toEqual(pads(v.n.includes('compact') ? 'compact' : 'comfortable'))
      expect(v.ch[0].style).toBe('Body/Default')
    }
  })

  it('Row is Density × State; selected and current carry a border/active start stroke, and no row binds a taxonomy colour', () => {
    expect(row.variants.map((v: any) => v.n)).toEqual(D.flatMap((d) => ['default', 'hover', 'selected', 'current'].map((s) => `Density=${d}, State=${s}`)))
    const FILL: Record<string, string> = { default: 'surface/global', hover: 'surface/row-hover', selected: 'surface/row-selected', current: 'surface/global' }
    for (const v of row.variants) {
      const state = v.n.split('State=')[1]
      expect(v.fill).toEqual([FILL[state]])
      if (state === 'selected' || state === 'current') expect([v.stroke, v.swx]).toEqual([['border/active'], [0, 0, 0, 2]])
      else expect(v.stroke).toEqual([])
      expect(v.ch.map((c: any) => c.n)).toEqual(['Cell / asset', 'Cell / status', 'Cell / findings'])
    }
    expect(JSON.stringify([head, cell, row])).not.toMatch(/severity|status\/|risk\//)
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
      'Tab/Default', 'Tab/Large', 'Body/Link', 'Tab/Count', 'Tab/Count Large', 'Mono/Meta',
    ])
  })

  it('draws Mono/Meta as Body/Meta in Roboto Mono: same size, line height, weight and tracking variables', () => {
    const mono = styles.find((s) => s.name === 'Mono/Meta'), meta = styles.find((s) => s.name === 'Body/Meta')
    expect(mono.fontName).toEqual({ family: 'Roboto Mono', style: 'Regular' })
    for (const k of ['size', 'lineHeight', 'weight', 'tracking']) expect(mono[k], k).toEqual(meta[k])
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

// The overlays (headless, Experimental): the popup only — placement, focus and dismissal are code.
describe('Popover, Tooltip and Dialog, as the builders draw them', () => {
  const defs = (d: any) => Object.keys(d.defs).map((k) => k.replace(/#.*$/, '')).sort()

  it('Popover: Size regular / wide at popover/width(-wide), surface/raised in a border/default edge, radius/4', () => {
    const p = dump('popover')
    expect(p.variants.map((v: any) => v.n)).toEqual(['Size=regular', 'Size=wide'])
    expect(defs(p)).toEqual(['Size', 'Title text'])
    expect(p.variants.map((v: any) => v.wh[2])).toEqual(['popover/width', 'popover/width-wide'])
    for (const v of p.variants) {
      expect([v.fill, v.stroke, v.rad[1]]).toEqual([['surface/raised'], ['border/default'], 'radius/4'])
      expect(v.pad.map((x: any) => x[1])).toEqual(['space/15', 'space/15', 'space/15', 'space/15'])
      expect(v.ch.map((c: any) => [c.n, c.style, c.fill[0]])).toEqual([['Title', 'Heading/H5', 'text/heading'], ['Body', 'Body/Default', 'text/default']])
    }
  })

  it('Tooltip: text/tooltip in Body/Meta on surface/tooltip; the two-line variant is tooltip/width-max wide', () => {
    const t = dump('tooltip')
    expect(t.variants.map((v: any) => v.n)).toEqual(['Lines=one', 'Lines=two'])
    // No TEXT property: each variant keeps its own sentence in an unbound Content layer.
    expect(defs(t)).toEqual(['Lines'])
    // (the dump keeps the first 40 characters of a text)
    expect(t.variants.map((v: any) => v.ch[0].chars)).toEqual(['Download the last 24 hours as CSV', 'Download the last 24 hours of alerts, ev'])
    for (const v of t.variants) {
      expect([v.fill, v.rad[1]]).toEqual([['surface/tooltip'], 'radius/4'])
      expect(v.ch[0]).toMatchObject({ n: 'Content', style: 'Body/Meta', fill: ['text/tooltip'] })
    }
    expect(t.variants[1].wh[2]).toBe('tooltip/width-max')
  })

  it('Dialog: Variant × Size; an alert has no close button, no body and no footer rule, and a destructive confirm', () => {
    const d = dump('dialog')
    expect(d.variants.map((v: any) => v.n)).toEqual([
      'Variant=standard, Size=regular', 'Variant=standard, Size=wide', 'Variant=alert, Size=regular', 'Variant=alert, Size=wide',
    ])
    // No TEXT property: a standard dialog and an alert keep their own titles in an unbound Title layer.
    expect(defs(d)).toEqual(['Description', 'Size', 'Variant'])
    for (const v of d.variants) {
      const alert = v.n.includes('alert')
      expect([v.fill, v.rad[1], v.wh[2]]).toEqual([['surface/raised'], 'radius/8', v.n.includes('wide') ? 'dialog/width-wide' : 'dialog/width'])
      expect(v.ch.map((c: any) => c.n)).toEqual(alert ? ['Header', 'Footer'] : ['Header', 'Body', 'Footer'])
      const header = v.ch[0]
      expect(header.ch.map((c: any) => c.n)).toEqual(alert ? ['Heading'] : ['Heading', 'Close'])
      if (!alert) expect(header.ch[1].wh.slice(2)).toEqual(['control-height/24', 'control-height/24'])
      const footer = v.ch.at(-1)
      expect(footer.stroke).toEqual(alert ? [] : ['border/subtle'])
      if (!alert) expect(footer.swx).toEqual([1, 0, 0, 0])
      expect(footer.ch.map((b: any) => b.fill[0])).toEqual(alert ? ['button/standard-bg', 'button/destructive-bg'] : ['button/standard-bg', 'button/primary-bg'])
      for (const b of footer.ch) expect(b.wh[3]).toBe('control-height/35')
    }
  })
})

// Toast (headless, Experimental): one toast — the region, the stack and the timer are code.
describe('Toast, as the builder draws it', () => {
  const t = dump('toast')

  it('three severities only — success, info, warning — with Description and Action properties and no TEXT property', () => {
    expect(t.variants.map((v: any) => v.n)).toEqual(['Severity=success', 'Severity=info', 'Severity=warning'])
    expect(Object.keys(t.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Action', 'Description', 'Severity'])
  })

  it('surface/raised in a border/default edge at toast/width, radius/4, padded space/15', () => {
    for (const v of t.variants) {
      expect([v.fill, v.stroke, v.rad[1], v.wh[2]]).toEqual([['surface/raised'], ['border/default'], 'radius/4', 'toast/width'])
      expect(v.pad.map((x: any) => x[1])).toEqual(['space/15', 'space/15', 'space/15', 'space/15'])
      expect(v.ch.map((c: any) => c.n)).toEqual([`Status mark / ${v.n.split('=')[1]}`, 'Content', 'Close'])
    }
  })

  it("the mark binds its own severity's icon colour; the action is a standard button at control-height/24; the close is the Dialog's", () => {
    for (const v of t.variants) {
      const sev = v.n.split('=')[1]
      const [mark, content, close] = v.ch
      expect(mark.wh.slice(2)).toEqual(['icon/20', 'line-height/body'])
      expect(mark.ch[0].fill).toEqual([`severity/${sev}/icon`])
      expect(content.ch.map((c: any) => c.n)).toEqual(['Message', 'Action'])
      expect(content.ch[0].ch.map((c: any) => [c.n, c.style, c.fill[0]])).toEqual([['Title', 'Heading/H5', 'text/heading'], ['Description', 'Body/Default', 'text/default']])
      const action = content.ch[1]
      expect([action.fill[0], action.stroke[0], action.wh[3]]).toEqual(['button/standard-bg', 'button/standard-border', 'control-height/24'])
      expect(action.ch[0]).toMatchObject({ style: 'Button/Tiny', fill: ['button/standard-text'] })
      expect(close.wh.slice(2)).toEqual(['control-height/24', 'control-height/24'])
      expect(close.ch[0].fill).toEqual(['icon/strong'])
    }
  })
})
