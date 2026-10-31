import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Playground spec, B8: one chunk per page, loaded when it is opened. The shell (header, nav, search)
// is the first chunk; it must not pull a page, the stage code or the components' stages in with it.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const staticImports = (src: string) => [...src.matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1])

describe('the site loads each page when it is opened', () => {
  it('App imports no page statically; each is a lazy import', () => {
    const app = read('demo/App.tsx')
    const pages = ['./pages/Overview', './pages/Foundation', './pages/Status', './Adopt', './Playground', './pages/How', './pages/Motion', './pages/Proposal', './pages/CopyPattern']
    for (const p of pages) {
      expect(staticImports(app), p).not.toContain(p)
      expect(app, p).toContain(`lazy(() => import('${p}')`)
    }
  })

  it('only App imports the Copy pattern page, and only lazily, so it is a chunk of its own', () => {
    const walk = (d: string): string[] => readdirSync(resolve(process.cwd(), d), { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []))
    const importers = walk('demo').filter((f) => f !== 'demo/pages/CopyPattern.tsx' && /CopyPattern['"]/.test(read(f)))
    expect(importers).toEqual(['demo/App.tsx'])
    expect(staticImports(read('demo/App.tsx')).some((i) => i.includes('CopyPattern'))).toBe(false)
  })

  it('the nav and search read the catalog, never the stage registry', () => {
    for (const f of ['demo/App.tsx', 'demo/nav.ts', 'demo/playground/search.ts', 'demo/shell/Search.tsx'])
      expect(staticImports(read(f)).some((i) => /playground\/registry$|\.\/registry$/.test(i)), f).toBe(false)
    // The catalog imports specs cut to their facts (B8), and nothing that renders.
    expect(staticImports(read('demo/playground/catalog.ts')).every((i) => i.endsWith('.md?facts')), 'catalog.ts').toBe(true)
  })
})
