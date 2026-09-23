/**
 * Rule coverage gate.
 *
 * Vela states every component rule in four places on purpose: the guideline is the
 * SPECIFICATION, and the React types, the pack fixtures and the playground are each one
 * implementation of it. Nothing proved they still agreed, and nothing failed the build when
 * a rule was documented with no proof behind it. This is that check.
 *
 * It reads the `[[rule: id | enforcement]]` tag on each bullet under `## Hard constraints`
 * in guidelines/components/*.md — the tag is metadata, stripped before the spec reaches the
 * playground (demo/playground/Markdown.tsx) or a Figma description
 * (scripts/sync-figma-descriptions.mjs) — and asserts:
 *
 *   1. every `compiler` rule — one the types reject outright — has a hand-written fixture in
 *      verify-pack.mjs carrying its id, and the types actually reject that fixture;
 *   2. every `runtime` rule — one ENFORCED BY THE IMPLEMENTATION AND PROVABLE BY A UNIT TEST,
 *      whether it throws, asserts, or simply renders the only correct thing — is referenced by
 *      at least one unit test;
 *   2b. every `browser` rule — one enforced by the implementation but provable ONLY in a real
 *      browser, because it depends on layout, hit-testing or paint — is referenced by at least
 *      one Playwright spec. jsdom has no layout, so these rules cannot reach a unit test;
 *   3. every fixture names a rule that exists — no orphans;
 *   4. every rule id is unique;
 *   5. every Hard-constraints bullet carries a tag, so a rule added later cannot skip the gate.
 *
 * `convention` is a real answer, not an excuse: "one primary filled button per page" cannot be
 * mechanically enforced, and the gate must not demand a fixture for it. Where a rule sits between
 * levels, it is filed at the lower one — a rule enforced only by CSS and a visual baseline is a
 * convention here. Understating what is enforced is the safe direction.
 *
 * `browser` was added after the fact, and the reason is worth keeping. This file first said there
 * was no fourth level, which was true of every rule that existed when it was written: each was
 * either rejected by the types, asserted in jsdom, or unenforceable. Then the press rule arrived.
 * A press that lands 2px inside a wide button must still fire its click — the button scales under
 * the pointer, and if the pointerup misses, the click retargets to the parent and vanishes. That
 * is enforcement, not convention; it is also invisible to both of the other proofs. jsdom does no
 * layout and no hit-testing, so a unit test cannot see it. A screenshot cannot see it either: the
 * pixels are identical whether the click fired or not. Filing it as `convention` would have been
 * the safe direction and also a lie, so the level exists instead. The bar for a fifth is the same:
 * a rule that is genuinely enforced and that no existing level can prove.
 *
 * The fixtures are NOT generated from the annotations. A fixture derived from the same source
 * as the thing it tests proves nothing — see the comment above `violations` in verify-pack.mjs.
 *
 * Division of labour with verify-pack.mjs: this runs early and cheaply, proving the fixtures
 * are rejected by the types in `src`. verify-pack.mjs runs after the build and proves the same
 * fixtures are rejected by the .d.ts that is actually SHIPPED. Two different claims.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEVELS = ['compiler', 'runtime', 'browser', 'convention']

const problems = []
const fail = (msg) => problems.push(msg)

// ---------- the specification ----------
const specDir = join(root, 'guidelines/components')
const rules = []
for (const file of readdirSync(specDir).filter((f) => f.endsWith('.md'))) {
  const md = readFileSync(join(specDir, file), 'utf8')
  const section = md.match(/^## Hard constraints[^\n]*\n([\s\S]*?)(?=^## |\Z)/m)
  if (!section) { fail(`${file}: no "## Hard constraints" section`); continue }

  // A bullet is "- " plus any indented continuation lines.
  const bullets = []
  for (const line of section[1].split('\n')) {
    if (/^- /.test(line)) bullets.push(line)
    else if (/^\s+\S/.test(line) && bullets.length) bullets[bullets.length - 1] += ' ' + line.trim()
  }
  if (!bullets.length) fail(`${file}: "Hard constraints" has no bullets`)

  for (const bullet of bullets) {
    const tag = bullet.match(/\[\[rule:\s*([a-z0-9-]+)\s*\|\s*([a-z]+)\s*\]\]/)
    const text = bullet.replace(/\[\[rule:[^\]]*\]\]/, '').replace(/\s+/g, ' ').trim()
    if (!tag) {
      // 5. an untagged bullet is a rule that would silently skip every check below
      fail(`${file}: untagged rule — add [[rule: <id> | ${LEVELS.join('|')}]]\n          "${text.slice(0, 84)}…"`)
      continue
    }
    const [, id, level] = tag
    if (!LEVELS.includes(level)) fail(`${file}: rule "${id}" has unknown enforcement "${level}" (expected ${LEVELS.join(', ')})`)
    rules.push({ id, level, file, text })
  }
}

// 4. unique ids
const seen = new Map()
for (const r of rules) {
  if (seen.has(r.id)) fail(`duplicate rule id "${r.id}" in ${seen.get(r.id)} and ${r.file}`)
  else seen.set(r.id, r.file)
}

// ---------- the fixtures ----------
const packSrc = readFileSync(join(root, 'scripts/verify-pack.mjs'), 'utf8')
const block = packSrc.match(/const violations = \[([\s\S]*?)\n  \]/)
if (!block) fail('verify-pack.mjs: could not find the violations[] array')
const fixtures = [...(block ? block[1] : '').matchAll(/\['([^']+)',\s*'([^']+)',\s*`([^`]*)`\]/g)]
  .map(([, id, name, snippet]) => ({ id, name, snippet }))
if (block && !fixtures.length) fail('verify-pack.mjs: violations[] parsed to nothing — has its shape changed?')

// 3. no orphan fixtures
for (const f of fixtures)
  if (!seen.has(f.id)) fail(`verify-pack.mjs: fixture "${f.name}" names rule "${f.id}", which no guideline declares`)

// 1a. every compiler rule has at least one fixture
const compiler = rules.filter((r) => r.level === 'compiler')
for (const r of compiler)
  if (!fixtures.some((f) => f.id === r.id))
    fail(`${r.file}: rule "${r.id}" is tagged compiler but has no fixture in verify-pack.mjs\n          "${r.text.slice(0, 84)}…"`)

// 1b. and the types actually reject it. One tsc run over one file per fixture: a fixture that
// produces no error is a rule the compiler does not enforce, whatever the guideline says.
let rejected = new Set()
const proven = fixtures.filter((f) => seen.has(f.id) && rules.some((r) => r.id === f.id && r.level === 'compiler'))
if (proven.length) {
  const dir = mkdtempSync(join(tmpdir(), 'vela-rules-'))
  try {
    proven.forEach((f, i) => {
      writeFileSync(join(dir, `f${i}.tsx`),
        `import { Button, ContextualAlert, Input, StatusIndicator, Tabs, Toggle } from '${join(root, 'src')}'\n` +
        `export const X = () => (${f.snippet})\n`)
    })
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext', moduleResolution: 'bundler',
        jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true,
        baseUrl: root, paths: { react: ['node_modules/@types/react'], 'react/jsx-runtime': ['node_modules/@types/react/jsx-runtime'] },
      },
      include: ['*.tsx'],
    }))
    let out = ''
    try {
      execFileSync(join(root, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.json'],
        { cwd: dir, encoding: 'utf8', stdio: 'pipe' })
    } catch (e) { out = (e.stdout || '') + (e.stderr || '') }
    rejected = new Set([...out.matchAll(/^f(\d+)\.tsx\(/gm)].map((m) => Number(m[1])))
    proven.forEach((f, i) => {
      if (!rejected.has(i))
        fail(`rule "${f.id}" is tagged compiler, but its fixture COMPILES — the rule is documentation only\n          fixture: ${f.name}\n          ${f.snippet.slice(0, 96)}`)
    })
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// 2. every runtime rule is referenced by a unit test, and every browser rule by a Playwright spec
const collect = (dir, re) => {
  const out = []
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (re.test(e.name)) out.push({ p, src: readFileSync(p, 'utf8') })
  })
  walk(dir)
  return out
}
const proofs = {
  runtime: { files: collect(join(root, 'src'), /\.test\.tsx?$/), kind: 'unit test' },
  browser: { files: collect(join(root, 'tests'), /\.spec\.tsx?$/), kind: 'Playwright spec' },
}
for (const [level, { files, kind }] of Object.entries(proofs)) {
  for (const r of rules.filter((x) => x.level === level)) {
    const hit = files.find((t) => new RegExp(`\\[\\[rule:\\s*${r.id}\\b`).test(t.src))
    if (!hit) fail(`${r.file}: rule "${r.id}" is tagged ${level} but no ${kind} references it\n          add "// [[rule: ${r.id}]]" above the test that proves it`)
  }
}

// ---------- report ----------
const count = (l) => rules.filter((r) => r.level === l).length
console.log('\n  RULE COVERAGE\n  ' + '-'.repeat(58))
console.log(`  ${rules.length} rules across ${new Set(rules.map((r) => r.file)).size} specs — ` +
  `${count('compiler')} compiler, ${count('runtime')} runtime, ${count('browser')} browser, ` +
  `${count('convention')} convention`)
console.log(`  ${fixtures.length} fixtures, ${rejected.size} proved rejected by the types; ` +
  `${count('runtime')} runtime rules referenced by unit tests, ` +
  `${count('browser')} browser rules by specs`)
if (problems.length) {
  console.log('')
  for (const p of problems) console.log(`  FAIL  ${p}`)
  console.log(`\n  ${problems.length} problem(s). The guideline is the specification — fix the implementation,\n  or change the rule's enforcement level and say so in the guideline.\n`)
} else {
  console.log('\n  Every documented rule has a proof, and every proof has a rule.\n')
}
process.exit(problems.length ? 1 : 0)
