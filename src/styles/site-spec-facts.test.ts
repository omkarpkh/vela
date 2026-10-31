import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { specFacts } from '../../scripts/vite-spec-facts.mjs'
import { statusOf } from '../../demo/playground/status'
import { rulesOf } from '../../demo/playground/facts'
import { CATALOG } from '../../demo/playground/catalog'

// B8: the shell reads each spec cut to its facts (?facts), not the whole spec. The cut must give the
// shell exactly what the whole spec gives it, for every spec, or the nav and search would drift.
const dir = resolve(process.cwd(), 'guidelines/components')
const specs = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => ({ f, md: readFileSync(resolve(dir, f), 'utf8') }))

describe('a spec cut to its facts', () => {
  it.each(specs.map((s) => [s.f, s.md]))('%s keeps its status, its rules, its title and its "When to use"', (_f, md) => {
    const facts = specFacts(md)
    expect(statusOf(facts)).toEqual(statusOf(md))
    expect(rulesOf(facts)).toEqual(rulesOf(md))
    expect(facts.split('\n')[0]).toBe(md.split('\n').find((l) => /^# /.test(l)))
    const when = md.match(/^## When to use[^\n]*\n[\s\S]*?(?=^## )/m)?.[0].trimEnd()
    if (when) expect(facts).toContain(when)
  })

  it('is much smaller than the spec, and is what the catalog carries', () => {
    const whole = specs.reduce((n, s) => n + s.md.length, 0)
    const cut = specs.reduce((n, s) => n + specFacts(s.md).length, 0)
    expect(cut).toBeLessThan(whole / 3)
    for (const e of CATALOG) expect(e.spec, e.id).toBe(specFacts(specs.find((s) => s.f === e.file)!.md))
  })
})
