import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Vela's logo makes no security claim (brand/README.md): it is never called a seal, and no sentence
// that names the logo, the Pulse mark or the mood background calls it secure, trusted, verified or
// certified. "Security" alone is everywhere in these docs ("security products"), and "mark" alone
// is a common word (the copy mark, a lock mark), so a sentence is caught only when it names the
// brand itself: "logo", "mood", "the Pulse mark", "Vela's mark" or "brand mark". CHANGELOG.md and
// decisions/ are not scanned, so the decision's own record may use the word "seal".
const root = resolve(process.cwd())
const walk = (d: string): string[] => readdirSync(join(root, d)).flatMap((f) => {
  const p = `${d}/${f}`
  return statSync(join(root, p)).isDirectory() ? (p === 'demo/public' ? [] : walk(p)) : [p]
})
const files = ['guidelines', 'demo', 'brand'].filter((d) => existsSync(join(root, d))).flatMap(walk)
  .concat('README.md').filter((f) => /\.(md|txt|tsx?|html|css|json)$/.test(f))
const SEAL = /\bseal(s|ed)?\b/i
const SUBJECT = /\b(logos?|mood|the Pulse mark|Vela['’]s mark|brand mark)\b/i
const CLAIM = /\b(secure|security|trusted|verified|certified)\b/i
// A sentence that states the rule itself is not a claim.
const STATES_THE_RULE = /never call(ed)? it a seal|no security claim/i

describe('brand wording', () => {
  it('scans the docs, the site source, the brand folder and llms.txt', () => {
    expect(files).toEqual(expect.arrayContaining(['README.md', 'guidelines/llms.txt', 'demo/App.tsx']))
  })
  it('never calls the logo a seal, or secure, trusted, verified or certified', () => {
    const hits = files.flatMap((f) => readFileSync(join(root, f), 'utf8').split(/(?<=[.!?])\s+|\n\s*\n/)
      .filter((s) => !STATES_THE_RULE.test(s) && (SEAL.test(s) || (SUBJECT.test(s) && CLAIM.test(s))))
      .map((s) => `${f}: ${s.replace(/\s+/g, ' ').trim().slice(0, 160)}`))
    expect(hits).toEqual([])
  })
  it('catches what it is for, and not the common uses of "mark" and "security"', () => {
    const caught = (s: string) => SEAL.test(s) || (SUBJECT.test(s) && CLAIM.test(s))
    expect(['The logo is a trust seal.', 'The Pulse mark shows the product is secure.', 'A verified mood.'].map(caught)).toEqual([true, true, true])
    expect(['Vela is built for security products.', 'The copy mark turns to a check.', 'A lock mark on a trusted row.'].map(caught)).toEqual([false, false, false])
  })
})
