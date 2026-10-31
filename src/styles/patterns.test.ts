import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// pattern-cites-real-rules (guidelines/patterns/README.md): a pattern's Tests table and totals are
// checked against the component specs by `npm run rules:check`. These fixtures prove the check fails
// when they drift, and stays quiet about components that are only specified.
const run = (md: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'vela-patterns-'))
  writeFileSync(join(dir, 'fixture.md'), md)
  try {
    const out = execFileSync('node', ['scripts/check-rules.mjs'], { encoding: 'utf8', env: { ...process.env, VELA_PATTERN_DIR: dir }, stdio: 'pipe' })
    return { ok: true, out }
  } catch (e: any) {
    return { ok: false, out: String(e.stdout) }
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
const table = (rows: string) => `## Tests\n\n| The promise | Rule | Level |\n|---|---|---|\n${rows}\n`

describe('pattern-cites-real-rules', () => {
  it('passes the real patterns, printing a specified component as not built yet', () => {
    const out = execFileSync('node', ['scripts/check-rules.mjs'], { encoding: 'utf8' })
    expect(out).toContain('pattern(s) checked (pattern-cites-real-rules)')
    expect(out).toMatch(/copy-button-fails-honestly \(runtime\) — copy-button is not built yet/)
  })

  it('passes a pattern that cites a built rule at its own level, with true totals', () => {
    const r = run(`- Dropdown List: 19 rules, 17 with proofs;\n\n**19 rules, 17 with proofs**\n\n` +
      table('| Locked is not chosen | `dropdown-list-locked-not-chosen` | runtime |'))
    expect(r.ok, r.out).toBe(true)
  })

  it('fails a rule cited at the wrong level', () => {
    const r = run(table('| Locked is not chosen | `dropdown-list-locked-not-chosen` | browser |'))
    expect(r.ok).toBe(false)
    expect(r.out).toContain('cites dropdown-list-locked-not-chosen as browser; dropdown-list.md says runtime')
  })

  it('fails a rule no component spec defines, when its component is built', () => {
    const r = run(table('| Made up | `dropdown-list-never-written` | runtime |'))
    expect(r.ok).toBe(false)
    expect(r.out).toContain('cites dropdown-list-never-written (runtime), which no component spec defines')
  })

  it('fails totals that disagree with the spec, and an overall total that disagrees with its parts', () => {
    const r = run(`- Dropdown List: 18 rules, 17 with proofs;\n\n**20 rules, 17 with proofs**\n\n` +
      table('| Locked is not chosen | `dropdown-list-locked-not-chosen` | runtime |'))
    expect(r.ok).toBe(false)
    expect(r.out).toContain('says Dropdown List has 18 rules, 17 with proofs; dropdown-list.md has 19, 17 with proofs')
    expect(r.out).toContain('the total says 20 rules, 17 with proofs; its components add up to 18, 17')
  })
})
