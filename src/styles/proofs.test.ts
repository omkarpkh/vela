import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// The proof map (playground spec, section 8; slice 4): `check-rules.mjs --write` writes each
// component's rules with the file and line of their proof. Every link the Rules tab draws from it
// must land on that proof: the line names the rule, at the commit the map was read from.
const root = process.cwd()
type ProofRule = { id: string; level: string; sentence: string; proof: { file: string; line: number } | null; fixture?: { snippet: string; error: string } }

describe('the proof map', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vela-proofs-'))
  let maps: { file: string; rules: ProofRule[]; typescript: string }[] = []
  // A contract (guidelines/contracts/, the Filter Grammar) states its rules as a component does, and
  // rules:check reads it, so it gets a map too.
  it('is written for every component and contract spec', () => {
    execFileSync('node', ['scripts/check-rules.mjs', '--write', dir], { cwd: root, encoding: 'utf8' })
    maps = readdirSync(dir).map((f) => ({ file: f, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }))
    const specs = ['guidelines/components', 'guidelines/contracts'].flatMap((d) => readdirSync(resolve(root, d)).filter((f) => f.endsWith('.md')))
    expect(maps.map((m) => m.file).sort()).toEqual(specs.map((f) => f.replace(/\.md$/, '.json')).sort())
  }, 60_000)

  it('points every proof at a line that names its rule', () => {
    for (const m of maps) for (const r of m.rules) {
      if (r.level === 'convention') { expect(r.proof, r.id).toBeNull(); continue }
      expect(r.proof, r.id).not.toBeNull()
      const path = resolve(root, r.proof!.file)
      expect(existsSync(path), r.proof!.file).toBe(true)
      const line = readFileSync(path, 'utf8').split('\n')[r.proof!.line - 1]
      expect(line, `${r.id} at ${r.proof!.file}:${r.proof!.line}`).toMatch(r.level === 'compiler' ? new RegExp(`\\['${r.id}',`) : new RegExp(`\\[\\[rule:\\s*${r.id}\\b`))
    }
  })

  it('keeps the compiler\'s own words for every compiler rule', () => {
    for (const m of maps) {
      expect(m.typescript).toMatch(/^\d+\.\d+\.\d+$/)
      for (const r of m.rules.filter((x) => x.level === 'compiler')) {
        expect(r.fixture?.snippet, r.id).toBeTruthy()
        expect(r.fixture?.error, r.id).toMatch(/^fixture\.tsx\(\d+,\d+\): error TS\d+:/)
      }
    }
    rmSync(dir, { recursive: true, force: true })
  })
})
