/**
 * Rule coverage gate.
 *
 * Vela states every component rule in four places on purpose: the guideline is the
 * SPECIFICATION, and the React types, the pack fixtures and the playground are each one
 * implementation of it. Nothing proved they still agreed, and nothing failed the build when
 * a rule was documented with no proof behind it. This is that check.
 *
 * It reads the `[[rule: id | enforcement]]` tag on each bullet under `## Hard constraints`
 * in guidelines/components/*.md and guidelines/contracts/*.md (a contract, such as the Filter
 * Grammar, has no UI but states its rules the same way) — the tag is metadata, stripped before the spec reaches the
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
 *
 * `--write <dir>` also writes the proof map, one JSON file per component or contract spec (playground spec,
 * section 8; slice 4): each rule's id, level and sentence; the file and line of its proof; and, for
 * a compiler rule, its fixture and the error the compiler gave for it. The site fetches the file for
 * the page being read (B8). `npm run proofs` writes them to demo/public/proofs/, which is generated,
 * never committed: the lines are only true of the commit they were read from.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEVELS = ['compiler', 'runtime', 'browser', 'convention']

const problems = []
const fail = (msg) => problems.push(msg)

// ---------- the specification ----------
const specDir = join(root, 'guidelines/components')
// A contract (guidelines/contracts/) is a spec with no UI: the same tags, the same proofs.
const contractDir = join(root, 'guidelines/contracts')
const specFiles = [
  ...readdirSync(specDir).filter((f) => f.endsWith('.md')).map((file) => ({ file, dir: 'guidelines/components' })),
  ...(existsSync(contractDir) ? readdirSync(contractDir).filter((f) => f.endsWith('.md')).map((file) => ({ file, dir: 'guidelines/contracts' })) : []),
]
const rules = []
for (const { file, dir } of specFiles) {
  const md = readFileSync(join(root, dir, file), 'utf8')
  const section = md.match(/^## Hard constraints[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)
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
    rules.push({ id, level, file, dir, text, sentence: bullet.replace(/^- /, '').replace(/\s*\[\[rule:[^\]]*\]\]\s*/, ' ').replace(/\s+/g, ' ').trim() })
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
const compilerSays = new Map()   // fixture index -> the compiler's own error text
const proven = fixtures.filter((f) => seen.has(f.id) && rules.some((r) => r.id === f.id && r.level === 'compiler'))
if (proven.length) {
  const dir = mkdtempSync(join(tmpdir(), 'vela-rules-'))
  try {
    proven.forEach((f, i) => {
      writeFileSync(join(dir, `f${i}.tsx`),
        `import { BrandMark, Button, ContextualAlert, Icon, Input, RiskPill, StatusIndicator, Table, Tabs, TextArea, Toggle } from '${join(root, 'src')}'\n` +
        // Filter Grammar (guidelines/contracts/) is plain functions from the core entry.
        `import { defineFields, parseQuery, validateQuery, normalise, queryToText, readback, evaluate, leftOutQuery } from '${join(root, 'src')}'\n` +
        // Checkbox, Radio Group, Popover, Tooltip, Icon Button, Dialog, Toast and Dropdown List ship from the headless entry only.
        `import { Checkbox, RadioGroup, Popover, Tooltip, Dialog, ToastProvider, useToast, DropdownList, IconButton } from '${join(root, 'src/headless')}'\n` +
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
    // Each error starts "fN.tsx(line,col): error TS…" and may run on over indented lines.
    let at = -1
    for (const line of out.split('\n')) {
      const m = line.match(/^f(\d+)\.tsx(\(\d+,\d+\): .*)$/)
      if (m) { at = Number(m[1]); compilerSays.set(at, [...(compilerSays.get(at) ?? []), `fixture.tsx${m[2]}`]) }
      else if (at >= 0 && /^\s+\S/.test(line)) compilerSays.get(at).push(line)
      else at = -1
    }
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

// ---------- patterns: pattern-cites-real-rules (guidelines/patterns/README.md) ----------
// A pattern's Tests table cites component rules, each with its level, and states the components'
// totals. Nothing else keeps those true when a component spec changes. A component that is only
// specified (no guidelines/components/<name>.md yet) is skipped and printed as not built yet.
// VELA_PATTERN_DIR points the check at another folder; src/styles/patterns.test.ts uses it for its fixtures.
const patternDir = process.env.VELA_PATTERN_DIR || join(root, 'guidelines/patterns')
const patternNotes = []
const specFile = (name) => `${name.toLowerCase().replace(/\s+/g, '-')}.md`
const builtSpecs = new Set(readdirSync(specDir).filter((f) => f.endsWith('.md')))
// The component a rule id belongs to: the longest spec file name that prefixes it.
const ownerOf = (id, names) => names.filter((n) => id.startsWith(`${n}-`)).sort((a, b) => b.length - a.length)[0]
let patternFiles = []
try { patternFiles = readdirSync(patternDir).filter((f) => f.endsWith('.md') && f !== 'README.md') } catch { /* no patterns yet */ }
for (const file of patternFiles) {
  const md = readFileSync(join(patternDir, file), 'utf8')
  const where = `guidelines/patterns/${file}`
  // The per-component totals: "- Copy Button: 20 rules, 16 with proofs;"
  const comps = [...md.matchAll(/^- ([A-Z][A-Za-z ]+): (\d+) rules, (\d+) with proofs/gm)]
    .map(([, name, total, proved]) => ({ name: name.trim(), file: specFile(name.trim()), total: +total, proved: +proved }))
  const names = comps.map((c) => c.file.replace(/\.md$/, ''))
  // The cited rules: table rows "| promise | `rule-id` | level |"
  const cited = [...md.matchAll(/^\|[^|\n]*\|\s*`([a-z0-9-]+)`\s*\|\s*([a-z]+)\s*\|\s*$/gm)].map(([, id, level]) => ({ id, level }))
  if (!cited.length) fail(`${where}: no cited rules found — a pattern's Tests table lists "| promise | \`rule-id\` | level |"`)
  for (const c of cited) {
    if (!LEVELS.includes(c.level)) { fail(`${where} cites ${c.id} as "${c.level}", which is not a level (${LEVELS.join(', ')})`); continue }
    const r = rules.find((x) => x.id === c.id)
    const owner = ownerOf(c.id, names) ?? ownerOf(c.id, [...builtSpecs].map((f) => f.replace(/\.md$/, '')))
    if (r) {
      if (r.level !== c.level) fail(`${where} cites ${c.id} as ${c.level}; ${r.file} says ${r.level}`)
    } else if (owner && !builtSpecs.has(`${owner}.md`)) {
      patternNotes.push(`${where}: ${c.id} (${c.level}) — ${owner} is not built yet`)
    } else {
      fail(`${where} cites ${c.id} (${c.level}), which no component spec defines`)
    }
  }
  // The totals, for the components that are built.
  for (const c of comps) {
    if (!builtSpecs.has(c.file)) { patternNotes.push(`${where}: ${c.name} totals (${c.total}, ${c.proved} with proofs) — not built yet`); continue }
    const own = rules.filter((r) => r.file === c.file)
    const proved = own.filter((r) => r.level !== 'convention').length
    if (own.length !== c.total || proved !== c.proved)
      fail(`${where} says ${c.name} has ${c.total} rules, ${c.proved} with proofs; ${c.file} has ${own.length}, ${proved} with proofs`)
  }
  const overall = md.match(/\*\*(\d+) rules, (\d+) with proofs\*\*/)
  if (overall && comps.length) {
    const [t, p] = [comps.reduce((n, c) => n + c.total, 0), comps.reduce((n, c) => n + c.proved, 0)]
    if (+overall[1] !== t || +overall[2] !== p) fail(`${where}: the total says ${overall[1]} rules, ${overall[2]} with proofs; its components add up to ${t}, ${p}`)
  }
}

// ---------- the proof map (--write <dir>) ----------
const writeAt = process.argv.indexOf('--write')
if (writeAt > 0) {
  const out = resolve(root, process.argv[writeAt + 1] ?? 'demo/public/proofs')
  mkdirSync(out, { recursive: true })
  const lineOf = (src, index) => src.slice(0, index).split('\n').length
  const rel = (p) => p.slice(root.length + 1)
  const typescript = JSON.parse(readFileSync(join(root, 'node_modules/typescript/package.json'), 'utf8')).version
  const proofOf = (r) => {
    if (r.level === 'compiler') {
      const at = packSrc.search(new RegExp(`\\['${r.id}',`))
      return at < 0 ? null : { file: 'scripts/verify-pack.mjs', line: lineOf(packSrc, at) }
    }
    if (r.level === 'runtime' || r.level === 'browser') {
      for (const t of proofs[r.level].files) {
        const at = t.src.search(new RegExp(`\\[\\[rule:\\s*${r.id}\\b`))
        if (at >= 0) return { file: rel(t.p), line: lineOf(t.src, at) }
      }
    }
    return null
  }
  for (const file of new Set(rules.map((r) => r.file))) {
    const own = rules.filter((r) => r.file === file).map((r) => {
      const fx = r.level === 'compiler' ? proven.map((f, i) => ({ f, i })).find(({ f }) => f.id === r.id) : undefined
      return {
        id: r.id, level: r.level, sentence: r.sentence, proof: proofOf(r),
        ...(fx ? { fixture: { name: fx.f.name, snippet: fx.f.snippet, error: (compilerSays.get(fx.i) ?? []).join('\n') } } : {}),
      }
    })
    const dir = rules.find((r) => r.file === file).dir
    writeFileSync(join(out, file.replace(/\.md$/, '.json')), JSON.stringify({ spec: `${dir}/${file}`, typescript, rules: own }, null, 2) + '\n')
  }
  console.log(`  Proof map written to ${out.startsWith(root) ? rel(out) : out}/ (${new Set(rules.map((r) => r.file)).size} files)`)
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
for (const file of new Set(rules.filter((r) => r.dir === 'guidelines/contracts').map((r) => r.file))) {
  const own = rules.filter((r) => r.dir === 'guidelines/contracts' && r.file === file)
  console.log(`  contract ${file}: ${own.length} rules, ${own.filter((r) => r.level !== 'convention').length} with proofs`)
}
if (patternFiles.length)
  console.log(`  ${patternFiles.length} pattern(s) checked (pattern-cites-real-rules)` +
    (patternNotes.length ? `; not built yet:\n    ${patternNotes.join('\n    ')}` : ''))
if (problems.length) {
  console.log('')
  for (const p of problems) console.log(`  FAIL  ${p}`)
  console.log(`\n  ${problems.length} problem(s). The guideline is the specification — fix the implementation,\n  or change the rule's enforcement level and say so in the guideline.\n`)
} else {
  console.log('\n  Every documented rule has a proof, and every proof has a rule.\n')
}
process.exit(problems.length ? 1 : 0)
