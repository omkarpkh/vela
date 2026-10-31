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
const BUILDERS = ['button', 'checkbox', 'contextual-alert', 'dialog', 'dropdown-list', 'icon', 'input', 'popover', 'radio-group', 'risk-pill', 'status-indicator', 'table', 'tabs', 'text-area', 'toast', 'toggle', 'tooltip']
// Extensions (<builder>.<id>.extend.figma.js) are reported under `<builder>.<id>`.
const EXTENSIONS = ['dropdown-list.usage-locked']
const tmp = () => mkdtempSync(join(tmpdir(), 'vela-figma-'))
const fixture = (name: string, body: string) => { const file = join(tmp(), name); writeFileSync(file, body); return file }
// Runs an ES module in the repo and returns the JSON it prints last.
const runModule = (src: string) => JSON.parse(execFileSync('node', ['--input-type=module', '-e', src], { cwd: root, encoding: 'utf8' }).trim().split('\n').pop()!)

describe('Figma builders, built in the mock Plugin API', () => {
  it('runs every builder, then every extension', () => {
    expect(Object.keys(lintReport).filter((k) => !k.includes('.')).sort()).toEqual(BUILDERS)
    expect(Object.keys(lintReport).filter((k) => k.includes('.')).sort()).toEqual(EXTENSIONS)
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

  it('allows an unbound gradient on an alpha mask: isMask, every stop black, any alpha (R18-1)', () => {
    const file = fixture('mask.figma.js', `// @page Fixture
// @set  Fixture
const c = figma.createComponent(); c.name = 'Fade=on'; c.layoutMode = 'HORIZONTAL'; c.fills = [];
const m = figma.createRectangle(); m.name = 'Fade mask'; m.isMask = true;
m.setBoundVariable('width', num('icon/size')); m.setBoundVariable('height', num('icon/size'));
m.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 0, g: 0, b: 0, a: 0 } }] }];
c.appendChild(m);
const set = figma.combineAsVariants([c], page); set.name = SET;
return { created: SET };
`)
    expect(JSON.parse(cli('--lint', file))[file].problems).toEqual([])
  })

  it('still fails a mask with a coloured stop, and a black gradient on a node that is not a mask (R18-1)', () => {
    const file = fixture('not-a-mask.figma.js', `// @page Fixture
// @set  Fixture
const c = figma.createComponent(); c.name = 'Fade=on'; c.layoutMode = 'HORIZONTAL'; c.fills = [];
const fade = (name, isMask, stop) => {
  const r = figma.createRectangle(); r.name = name; r.isMask = isMask;
  r.setBoundVariable('width', num('icon/size')); r.setBoundVariable('height', num('icon/size'));
  r.fills = [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: { ...stop, a: 1 } }, { position: 1, color: { r: 0, g: 0, b: 0, a: 0 } }] }];
  c.appendChild(r);
};
fade('Tinted mask', true, { r: 1, g: 0, b: 0 });
fade('Black fade', false, { r: 0, g: 0, b: 0 });
const set = figma.combineAsVariants([c], page); set.name = SET;
return { created: SET };
`)
    const r = JSON.parse(cli('--lint', file))[file]
    expect(r.problems.map((p: any) => [p.rule, p.node, p.what, p.waived])).toEqual([
      ['raw-colour', 'Tinted mask', 'GRADIENT_LINEAR', false],
      ['raw-colour', 'Black fade', 'GRADIENT_LINEAR', false],
    ])
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
      'Tab/Default', 'Tab/Large', 'Body/Link', 'Body/Strong', 'Tab/Count', 'Tab/Count Large', 'Mono/Meta',
    ])
  })

  it('binds Body/Strong to the body size and line height and the semibold weight: SemiBold 14/21', () => {
    const b = styles.find((s) => s.name === 'Body/Strong')
    expect([b.size.figma, b.lineHeight.figma, b.weight.figma]).toEqual(['size/body', 'line-height/body', 'weight/semibold'])
    expect(b.fontName).toEqual({ family: 'Open Sans', style: 'SemiBold' })
    expect([b.size.value, b.lineHeight.value]).toEqual([14, 21])
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
    for (const f of [...BUILDERS, ...EXTENSIONS.map((e) => e + '.extend')]) {
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

// Dropdown List (headless, Experimental): one row as a set whose axes mirror the markup, and the
// popup as a one-size component of item instances. Placement, focus, typeahead and the highlight
// following the keys are code.
describe('Dropdown List, as the builder draws it', () => {
  const d = dump('dropdown-list')
  const p = dump('dropdown-list', 'Dropdown List')
  const by = (h: string, c: string, x: string) => d.variants.find((v: any) => v.n === `Highlighted=${h}, Current=${c}, Locked=${x}`)
  const B = ['false', 'true']
  // The name row: the lock's slot when Locked, then the Label.
  const nameOf = (v: any) => v.ch[1]
  const labelOf = (v: any) => nameOf(v).ch[nameOf(v).ch.length - 1]

  it('Highlighted × Current × Locked, a Meta boolean and two TEXT properties, each written the same in every variant', () => {
    expect(d.set).toBe('Dropdown List item')
    expect(d.variants).toHaveLength(8)
    for (const h of B) for (const c of B) for (const x of B) expect(by(h, c, x), `${h} ${c} ${x}`).toBeTruthy()
    expect(Object.keys(d.defs).map((k) => k.replace(/#.*$/, '')).sort()).toEqual(['Current', 'Highlighted', 'Label', 'Locked', 'Meta', 'Meta text'])
    for (const v of d.variants) {
      expect(v.ch.map((c: any) => c.n), v.n).toEqual(['Check', 'Name', 'Meta'])
      expect([labelOf(v).n, labelOf(v).chars, v.ch[2].chars], v.n).toEqual(['Label', 'Firewall', '1 new'])
      expect(v.ch[2].hidden, v.n).toBe(true)
    }
  })

  it('popover/width wide, padded space/5 · space/15 · space/5 · space/10, the check slot kept by every variant, the meta in Body/Strong', () => {
    for (const v of d.variants) {
      expect(v.wh[2], v.n).toBe('popover/width')
      expect(v.pad.map((x: any) => x[1]), v.n).toEqual(['space/5', 'space/15', 'space/5', 'space/10'])
      expect(v.gap[1], v.n).toBe('space/10')
      expect(v.ch[0].wh.slice(2), v.n).toEqual(['icon/size', 'line-height/body'])
      expect([labelOf(v).style, v.ch[2].style], v.n).toEqual(['Body/Default', 'Body/Strong'])
      // The name row fills the rest of the row, with space/5 between the lock and the name.
      expect([nameOf(v).lm, nameOf(v).ls, nameOf(v).gap[1]], v.n).toEqual(['HORIZONTAL', 'FILL/HUG', 'space/5'])
    }
  })

  it('Highlighted is surface/raised-hover, locked or not; only Current draws the check, in text/link; Locked greys the name, never the meta', () => {
    for (const h of B) for (const c of B) for (const x of B) {
      const v = by(h, c, x), n = v.n
      expect(v.fill[0], n).toBe(h === 'true' ? 'surface/raised-hover' : 'surface/raised')
      expect(v.ch[0].ch.map((g: any) => [g.n, g.fill[0]]), n).toEqual(c === 'true' ? [['Glyph / check', 'text/link']] : [])
      expect(labelOf(v).fill[0], n).toBe(x === 'true' ? 'text/inactive' : 'text/default')
      expect(v.ch[2].fill[0], n).toBe('text/default')
    }
  })

  it('Locked puts an instance of Icon\'s lock before the name, in a slot one body line tall; no other variant has one', () => {
    for (const v of d.variants) {
      const locked = v.n.endsWith('Locked=true')
      expect(nameOf(v).ch.map((c: any) => c.n), v.n).toEqual(locked ? ['Lock', 'Label'] : ['Label'])
      if (!locked) continue
      const slot = nameOf(v).ch[0]
      expect([slot.wh.slice(2), slot.ax], v.n).toEqual([['icon/size', 'line-height/body'], 'CENTER/CENTER'])
      expect(slot.ch.map((i: any) => [i.t, i.main, i.props.Glyph, i.wh[2]]), v.n).toEqual([['INSTANCE', 'Glyph=lock', 'lock', 'icon/size']])
    }
  })

  it('draws a Usage / Locked frame beside the popup: a locked item with its reason in Meta, and a caption', () => {
    // The frame is not a set, so --dump can't reach it: build in the mock and read the page. Since
    // R18 the frame comes from an extension (dropdown-list.usage-locked.extend.figma.js), which create
    // mode runs after the builder: the page holds the same three nodes in the same order.
    const u = runModule(`import { build } from './scripts/figma/check-components.mjs'
const { figma } = await build('dropdown-list')
const page = figma.root.children.find((p) => p.name === 'Dropdown List')
const u = page.children.find((n) => n.name === 'Usage / Locked')
console.log(JSON.stringify({ order: page.children.map((n) => n.name), type: u.type, kids: u.children.map((n) => ({ type: n.type, main: n.mainComponent && n.mainComponent.name, chars: n.characters, props: n.componentProperties && Object.fromEntries(Object.entries(n.componentProperties).map(([k, p]) => [k.replace(/#.*$/, ''), p.value])) })) }))`)
    expect(u.order).toEqual(['Dropdown List item', 'Dropdown List', 'Usage / Locked'])
    expect(u.type).toBe('FRAME')
    expect(u.kids[0].props).toMatchObject({ Label: 'Archive', Meta: true, 'Meta text': 'Needs retention on', Locked: 'true' })
    const [item, caption] = u.kids
    expect([item.type, item.main]).toEqual(['INSTANCE', 'Highlighted=false, Current=false, Locked=true'])
    expect(caption.chars).toBe('Locked: always with its reason in Meta. The lock never appears without it.')
  })

  it('draws the popup as one component on Popover\'s surface, holding four item instances', () => {
    expect(p.set).toBe('Dropdown List')
    expect(p.count).toBe(1)
    const c = p.variants[0]
    expect(c.t).toBe('COMPONENT')
    expect([c.lm, c.wh[2], c.fill[0], c.stroke[0], c.sw, c.rad[1]]).toEqual(['VERTICAL', 'popover/width', 'surface/raised', 'border/default', 1, 'radius/4'])
    expect(c.pad.map((x: any) => x[1])).toEqual(['space/5', 'space/5', 'space/5', 'space/5'])
    expect(c.ch.map((i: any) => [i.t, i.n, i.ls])).toEqual([
      ['INSTANCE', 'Item / Alerts', 'FILL/HUG'],
      ['INSTANCE', 'Item / Firewall', 'FILL/HUG'],
      ['INSTANCE', 'Item / Archive', 'FILL/HUG'],
      ['INSTANCE', 'Item / Reports', 'FILL/HUG'],
    ])
    expect(c.ch.map((i: any) => [i.main, i.props.Label, i.props.Meta, i.props.Meta ? i.props['Meta text'] : null])).toEqual([
      ['Highlighted=false, Current=false, Locked=false', 'Alerts', false, null],
      ['Highlighted=false, Current=true, Locked=false', 'Firewall', true, '1 new'],
      ['Highlighted=false, Current=false, Locked=true', 'Archive', true, 'Needs retention on'],
      ['Highlighted=true, Current=false, Locked=false', 'Reports', true, '3 open'],
    ])
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

// R18: a change to a published set is an extension, run in place by --extend. Create mode runs the
// builder and then its extensions, so a fresh build and an extended file make the same tree.
describe('Figma extensions: a published set is extended in place, never rebuilt', () => {
  const fixtures = 'scripts/figma/__fixtures__'
  const extLint = (file: string) => JSON.parse(cli('--lint', file))[file]
  const failure = (file: string) => extLint(file).problems.find((p: any) => p.rule === 'extend-run').what as string
  const builder = (...args: string[]) => {
    try { return { out: execFileSync('node', ['scripts/figma/build-components.mjs', ...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' }), code: 0 } }
    catch (e: any) { return { out: String(e.stderr), code: e.status as number } }
  }

  it('extension files are not builders; the builder lists its extensions in file-name order', async () => {
    const { available, extensionsOf } = await import('../../scripts/figma/build-components.mjs')
    expect(available().sort()).toEqual(BUILDERS)
    expect(extensionsOf('dropdown-list').map((e: any) => [e.id, e.adds])).toEqual([['usage-locked', ['Usage / Locked']]])
    expect(builder('--list').out.split('\n').filter(Boolean).sort()).toEqual(BUILDERS)
  })

  it('moved Usage / Locked out of the Dropdown List builder into its first extension', () => {
    const base = readFileSync(resolve(root, 'scripts/figma/components/dropdown-list.figma.js'), 'utf8')
    const ext = readFileSync(resolve(root, 'scripts/figma/components/dropdown-list.usage-locked.extend.figma.js'), 'utf8')
    expect(base).not.toMatch(/createFrame\(\); usage\.name/)
    expect(ext).toMatch(/^\/\/ @extends dropdown-list$/m)
    expect(ext).toMatch(/^\/\/ @adds Usage \/ Locked$/m)
    const create = builder('dropdown-list').out
    expect(create).toContain('from components/dropdown-list.figma.js, components/dropdown-list.usage-locked.extend.figma.js')
    expect(create).toContain('return { ...built, extensions };')
  })

  it('--extend on Dropdown List, run twice in the mock: the first extends with the snapshot unchanged, the second skips', () => {
    const r = lintReport['dropdown-list.usage-locked'] as any
    expect(r.problems).toEqual([])
    expect(r.extend.first).toEqual({ extended: ['usage-locked'], skipped: [], snapshot: 'unchanged' })
    expect(r.extend.second).toEqual({ extended: [], skipped: ['usage-locked'], snapshot: 'unchanged' })
  })

  it('--extend needs the sets first, and a builder with no extensions has nothing to extend', () => {
    const r = runModule(`import { createMockFigma } from './scripts/figma/mock-figma.mjs'
import { generate } from './scripts/figma/build-components.mjs'
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const figma = createMockFigma({ variables: [], styles: [], pages: ['Dropdown List'] })
try { await new AsyncFunction('figma', generate('dropdown-list', { extend: true }))(figma); console.log('null') } catch (e) { console.log(JSON.stringify(e.message)) }`)
    expect(r).toMatch(/^Build Dropdown List first: Dropdown List item, Dropdown List are not on the Dropdown List page/)
    const none = builder('tabs', '--extend')
    expect([none.code, none.out.trim()]).toEqual([1, 'tabs has no extensions (components/tabs.<id>.extend.figma.js); there is nothing to extend'])
  })

  it('refuses to run when an extension is half there, and names what is and is not', () => {
    const r = runModule(`import { build } from './scripts/figma/check-components.mjs'
import { extensionsOf, generateFrom, meta } from './scripts/figma/build-components.mjs'
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const { figma } = await build('dropdown-list')
const two = { ...extensionsOf('dropdown-list')[0], adds: ['Usage / Locked', 'Usage / Current'] }
try { await new AsyncFunction('figma', generateFrom(meta('dropdown-list'), 'x', { extensions: [two], extend: true, which: 'dropdown-list' }))(figma); console.log('null') } catch (e) { console.log(JSON.stringify(e.message)) }`)
    expect(r).toBe('Nothing was run: usage-locked is half there (Usage / Locked on the page; Usage / Current not). Finish or remove those nodes by hand, then run --extend again.')
  })

  it('appendVariant puts a new variant below the others and grows the set; nothing that was there moves', () => {
    const file = fixture('tabs.loading.extend.figma.js', `// @extends tabs
// @adds State=loading, Size=default
const t = figma.createComponent();
t.name = 'State=loading, Size=default';
t.layoutMode = 'HORIZONTAL'; t.counterAxisAlignItems = 'CENTER'; t.fills = [];
t.setBoundVariable('itemSpacing', num('space/5'));
const label = figma.createText(); label.name = 'Label'; label.characters = 'Alerts';
await label.setTextStyleIdAsync(style('Tab/Default').id); label.fills = [paint('text/inactive')];
t.appendChild(label); label.layoutSizingHorizontal = 'HUG';
appendVariant(set, t);
return {};
`)
    const r = extLint(file)
    expect(r.problems).toEqual([])
    expect(r.extend.first).toEqual({ extended: ['loading'], skipped: [], snapshot: 'unchanged' })
    expect(r.extend.second).toEqual({ extended: [], skipped: ['loading'], snapshot: 'unchanged' })
    const at = runModule(`import { build, extendInMock } from './scripts/figma/check-components.mjs'
import { extensionMeta } from './scripts/figma/build-components.mjs'
const box = (s) => ({ w: s.width, h: s.height, dflt: s.defaultVariant.name, opts: s.componentPropertyDefinitions.State.variantOptions, kids: Object.fromEntries(s.children.map((v) => [v.name, [v.x, v.y, v.height]])) })
const fresh = box((await build('tabs')).set)
const { page } = await extendInMock('tabs', [extensionMeta(${JSON.stringify(file)})])
console.log(JSON.stringify({ fresh, extended: box(page.children.find((n) => n.name === 'Tab')) }))`)
    const { fresh, extended } = at
    const added = extended.kids['State=loading, Size=default']
    for (const [name, xy] of Object.entries(fresh.kids)) expect(extended.kids[name], name).toEqual(xy)
    const bottom = Math.max(...Object.values<number[]>(fresh.kids).map(([, y, h]) => y + h))
    expect([added[0], added[1]]).toEqual([32, bottom + 32])
    expect(extended.h).toBeGreaterThan(fresh.h)
    expect(extended.w).toBe(fresh.w)
    expect(extended.dflt).toBe(fresh.dflt)
    expect(extended.opts).toEqual([...fresh.opts, 'loading'])
  })

  it('fails an extension that makes a node its // @adds does not list', () => {
    const file = fixture('tabs.stray.extend.figma.js', `// @extends tabs
// @adds Note / listed
const a = figma.createFrame(); a.name = 'Note / listed'; a.fills = []; page.appendChild(a);
const b = figma.createFrame(); b.name = 'Note / stray'; b.fills = []; page.appendChild(b);
return {};
`)
    expect(failure(file)).toBe('Extension stray made "Note / stray", not in its // @adds.')
  })

  it('fails the fixture that renames a variant: the snapshot names it, and the body is refused too', () => {
    const file = `${fixtures}/tabs.rename-variant.extend.figma.js`
    expect(failure(file)).toContain('Tab › State=disabled, Size=large: renamed to "State=inactive, Size=large"')
    expect(failure(file)).toContain("Figma can't undo a partial run")
    expect(extLint(file).problems.map((p: any) => p.rule).sort()).toEqual(['extend-forbidden', 'extend-run'])
  })

  it('fails the fixture that removes a node', () => {
    const file = `${fixtures}/tabs.remove-node.extend.figma.js`
    expect(failure(file)).toContain('Tab › State=selected, Size=default › Count: removed')
    expect(extLint(file).problems.find((p: any) => p.rule === 'extend-forbidden').what).toContain('.remove(')
  })

  it('fails the fixture that changes the default variant', () => {
    const file = `${fixtures}/tabs.move-default.extend.figma.js`
    expect(failure(file)).toContain('Tab: default variant changed from "State=default, Size=default" to "State=loading, Size=default"')
    // nothing in its body is refused: only the run shows the harm
    expect(extLint(file).problems.map((p: any) => p.rule)).toEqual(['extend-run'])
  })

  it('refuses .remove(, combineAsVariants( and .name on a node the extension did not make', () => {
    // check-components.mjs runs in node, as the CLI does (vite can't load it in-process).
    const forbidden = (body: string) => runModule(`import { forbidden } from './scripts/figma/check-components.mjs'
console.log(JSON.stringify(forbidden(${JSON.stringify(body)})))`)
    expect(forbidden(`const f = figma.createFrame(); f.name = 'Mine';
const i = set.children[0].createInstance(); i.name = 'Mine too';
// set.name = 'a comment is not code'
if (set.name === 'Tab') {}`)).toEqual([])
    expect(forbidden(`set.name = 'Tabs';
for (const v of set.children) v.name += ' old';
set.children[0].name = 'x';
figma.combineAsVariants([], page);
set.children[0].remove();`)).toEqual([
      'calls .remove(: an extension never removes a node',
      'calls combineAsVariants(: an extension appends to a set, it never makes one',
      'sets .name on set, a node it did not make: an extension never renames what the set has',
      'sets .name on v, a node it did not make: an extension never renames what the set has',
      'sets .name on set.children[0], a node it did not make: an extension never renames what the set has',
    ])
    // an // @allow does not waive them
    const file = fixture('tabs.waive.extend.figma.js', readFileSync(resolve(root, `${fixtures}/tabs.remove-node.extend.figma.js`), 'utf8').replace('// @extends tabs', '// @extends tabs\n// @allow extend-forbidden trying'))
    expect(extLint(file).problems.filter((p: any) => p.waived)).toEqual([])
  })
})
