import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Playground spec, B8: one chunk per page, loaded when it is opened. The shell (header, nav, search)
// is the first chunk; it must not pull a page, the stage code or the components' stages in with it.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
const staticImports = (src: string) => [...src.matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1])

describe('the site loads each page when it is opened', () => {
  it('App imports no page statically; each is a lazy import', () => {
    const app = read('demo/App.tsx')
    const pages = ['./pages/Overview', './pages/Foundation', './pages/Status', './Adopt', './Playground', './pages/How', './pages/Motion', './pages/Proposal']
    for (const p of pages) {
      expect(staticImports(app), p).not.toContain(p)
      expect(app, p).toContain(`lazy(() => import('${p}')`)
    }
  })

  it('the nav and search read the catalog, never the stage registry', () => {
    for (const f of ['demo/App.tsx', 'demo/nav.ts', 'demo/playground/search.ts', 'demo/shell/Search.tsx'])
      expect(staticImports(read(f)).some((i) => /playground\/registry$|\.\/registry$/.test(i)), f).toBe(false)
    // The catalog imports specs and nothing that renders.
    expect(staticImports(read('demo/playground/catalog.ts')).every((i) => i.endsWith('.md?raw')), 'catalog.ts').toBe(true)
  })
})
