import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildComponents, problemsOf, renderForm, OUT, FORM } from '../../scripts/build-components-json.mjs'

// guidelines/components.json is generated from the specs (scripts/build-components-json.mjs) and
// shipped in the package for agents. These tests fail when a spec is badly written, when the
// committed file is stale, and when an import the file names is not exported where it says.
const root = resolve(process.cwd())
const dir = resolve(root, 'guidelines/components')
const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
const built = buildComponents() as {
  text: string
  problems: string[]
  components: { name: string; spec: string; imports: { from: string; names: string[]; peers: string[]; status: string }[]; props: { part: string; name: string; values?: unknown[]; default?: unknown; required: boolean }[] }[]
}
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

/** The value names an entry file exports (`export { A, B } from`), types left out. */
function exportsOf(file: string): Set<string> {
  const src = readFileSync(resolve(root, file), 'utf8')
  const names = [...src.matchAll(/^export \{([^}]+)\} from/gm)].flatMap((m) => m[1].split(',').map((n) => n.trim()).filter(Boolean))
  return new Set(names)
}
const ENTRY_FILES: Record<string, string> = { [pkg.name]: 'src/index.ts', [`${pkg.name}/headless`]: 'src/headless/index.ts' }

describe('guidelines/components.json', () => {
  it.each(files)('%s is well written enough to generate from', (file) => {
    const mine = built.problems.filter((p) => p.startsWith(`guidelines/components/${file}:`))
    expect(mine, mine.join('\n')).toEqual([])
  })

  it('is up to date with the specs (run npm run components)', () => {
    const committed = readFileSync(resolve(root, OUT), 'utf8')
    expect(committed === built.text, `${OUT} is stale: run npm run components`).toBe(true)
  })

  it('gives the component-request form its closest options (run npm run components)', () => {
    const form = readFileSync(resolve(root, FORM), 'utf8')
    expect(renderForm(form, built.components) === form, `${FORM}'s closest-component options are stale: run npm run components`).toBe(true)
    // The dropdown's options, as GitHub reads them: every component in the file's order, then the way out.
    const closest = form.split(/^ {2}- type: /m).find((b) => /^dropdown\n {4}id: closest\n/.test(b)) ?? ''
    const options = [...closest.matchAll(/^ {8}- (.+)$/gm)].map((m) => m[1])
    expect(options).toEqual([...built.components.map((c) => c.name), 'None comes close'])
  })

  it('has one entry per built spec, and no proposal', () => {
    expect(built.components.map((c) => c.spec).sort()).toEqual(files.map((f) => `guidelines/components/${f}`))
    expect(built.components.some((c) => c.spec.includes('proposals'))).toBe(false)
  })

  it('names only imports that the entry it names exports', () => {
    for (const c of built.components) {
      expect(c.imports.length, c.name).toBeGreaterThan(0)
      for (const i of c.imports) {
        const file = ENTRY_FILES[i.from]
        expect(file, `${c.spec}: ${i.from} is not an entry point`).toBeDefined()
        const exported = exportsOf(file)
        for (const n of i.names) expect(exported.has(n), `${c.spec}: ${n} is not exported from ${i.from} (${file})`).toBe(true)
        // A peer named is an optional peer in the manifest; the headless entry always names Base UI.
        for (const p of i.peers) expect(pkg.peerDependenciesMeta?.[p]?.optional, `${c.spec}: ${p} is not an optional peer`).toBe(true)
        if (i.from.endsWith('/headless')) expect(i.peers, `${c.spec}: the headless entry needs its optional peer`).toContain('@base-ui/react')
        else expect(i.peers, `${c.spec}: the core entry has no runtime peer`).toEqual([])
      }
    }
  })

  it('reads closed values, defaults and required props from the Props tables', () => {
    const prop = (component: string, name: string, part?: string) =>
      built.components.find((c) => c.name === component)!.props.find((p) => p.name === name && (!part || p.part === part))!
    expect(prop('Button', 'variant')).toMatchObject({ part: 'Button', values: ['primary', 'standard', 'destructive'], default: 'standard', required: false })
    expect(prop('Contextual Alert', 'severity')).toMatchObject({ values: ['success', 'info', 'warning', 'minor', 'major', 'critical'], required: true })
    expect(prop('Contextual Alert', 'severity')).not.toHaveProperty('default')
    expect(prop('Toast', 'limit', 'ToastProvider')).toMatchObject({ values: [1, 2, 3], default: 3 })
    expect(prop('Toggle', 'disabled')).toMatchObject({ default: false })
    expect(prop('Toggle', 'label')).not.toHaveProperty('values')
    expect(prop('Tabs', 'onValueChange', 'Tabs')).toBeDefined()
    // Tabs' Composition table carries a Default column, so its size default is data, not prose.
    expect(prop('Tabs', 'size', 'Tabs')).toMatchObject({ values: ['regular', 'large'], default: 'regular' })
    expect(prop('Tabs', 'defaultValue', 'Tabs')).not.toHaveProperty('default')
  })
})

describe('what a badly written spec is', () => {
  const good = [
    '# Thing',
    '',
    'A thing for doing one job.',
    '',
    '**Status:** Experimental — new.',
    '',
    '## When to use Thing',
    '- For the one job.',
    '',
    '## Props',
    '| Prop | Type | Default | Notes |',
    '|---|---|---|---|',
    '| `size` | `"a" \\| "b"` | `"a"` | **These two only.** |',
    '',
    '## Hard constraints',
    '',
  ].join('\n')
  const entries = ['@omkarux/vela', '@omkarux/vela/headless']
  const check = (md: string) => problemsOf(md, { entries }) as string[]
  const swap = (from: string, to: string) => { expect(good).toContain(from); return good.replace(from, to) }

  it('passes a well written one', () => expect(check(good)).toEqual([]))
  it('passes one with no Status line: Approved is the default (GOVERNANCE.md)', () =>
    expect(check(swap('**Status:** Experimental — new.\n\n', ''))).toEqual([]))
  it('fails one with no title', () => expect(check(swap('# Thing\n', ''))).toContain('no "# Title" line'))
  it('fails one with no intro', () => expect(check(swap('A thing for doing one job.\n\n', ''))).toContain('no intro paragraph under the title'))
  it('fails an unknown Status label', () =>
    expect(check(swap('**Status:** Experimental', '**Status:** Beta')).join()).toMatch(/names no known label/))
  it('fails one with no "When to use"', () => expect(check(swap('## When to use Thing\n- For the one job.\n\n', ''))).toContain('no "## When to use" section'))
  it('fails one with no Props or Composition table', () =>
    expect(check(swap('## Props', '## Shape'))).toContain('no "## Props" or "## Composition" section'))
  it('fails an empty prop name or type', () => {
    expect(check(swap('| `size` |', '| |'))).toContain('a Props row has an empty prop name')
    expect(check(swap('`"a" \\| "b"`', ''))).toContain('size: empty type')
  })
  it('fails an empty Default cell', () => expect(check(swap('| `"a"` |', '| |'))).toContain('size: empty Default cell (write — for none)'))
  it('fails a prop listed twice in one part', () =>
    expect(check(swap('**These two only.** |', '**These two only.** |\n| `size` | `boolean` | `false` | Again. |'))).toContain('size: listed twice'))
  it('fails a row that is not one prop name', () =>
    expect(check(swap('| `size` |', '| `size or tone` |')).join()).toMatch(/"size or tone" is not one prop name/))
  it('fails an Implementations entry the package does not have', () => {
    const md = `${good}## Implementations\n| Entry point | Implementation | Dependencies | Status |\n|---|---|---|---|\n| \`@omkarux/vela/lab\` | core | none | Approved |\n`
    expect(check(md).join()).toMatch(/"@omkarux\/vela\/lab" is not an entry point of the package/)
  })
})
