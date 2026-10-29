/**
 * The data behind the library's Changelog and Status pages, read from the repository.
 *
 * The page builders in scripts/figma/pages/ draw frames; this module decides what they say.
 * Everything is read from a file the repository already keeps — CHANGELOG.md, the component
 * specs, GOVERNANCE.md, the playground registry, src/index.ts and pages/published.json — so the
 * pages cannot disagree with the record. The Figma thread built the first versions of both pages
 * by hand on 28 Oct 2026; these builders keep its layout, and where its script hand-copied ROWS
 * and LABELS this module reads them.
 *
 *   changelogData({ published, publishedSource })   one release per version, newest first, no Unreleased
 *   statusData()                                     one row per component in registry order, and the legend
 *   publishedFile()                                  pages/published.json: the versions on npm, and when that was checked
 *   registryVersions()                               the versions on the npm registry (network; throws when unreachable)
 *
 * Parsing rules, stated so they can be checked:
 *   - A release is a `## [X.Y.Z] — YYYY-MM-DD` heading; `## [Unreleased]` is skipped.
 *   - A section is a `### ` heading whose first word is one of Keep a Changelog's six kinds
 *     (Added, Changed, Fixed, Removed, Deprecated, Security). The heading is kept whole, so
 *     "Changed — breaking" stays as written; two headings of the same name in one release are
 *     one list. Other `###` headings ("Note on versioning", "Companion Figma library") and
 *     sections with no bullets are dropped — the link to the full entry covers them.
 *   - A bullet's lead-in is its opening `**bold**`, word for word, with backticks and link
 *     syntax removed. A bullet with no bold lead-in shows its opening and then "…": the whole
 *     bullet when it fits in 90 characters, else its first sentence when that fits, else its
 *     first 90 characters cut at a word. Indented lines belong to their bullet.
 *   - The label follows demo/pages/Status.tsx exactly: the `**Status:**` line under the intent
 *     paragraph, the first label word it starts with; Approved when there is no line.
 *   - The React export is the name src/index.ts exports for the component's source folder, from
 *     `@omkarux/vela` — or from `@omkarux/vela/headless` when the spec's `**Dependencies:**` line
 *     names a dependency (no spec has one yet; the headless entry point is Phase 1 work).
 *   - "Since" is the oldest release whose entry names the component, by its title or by its
 *     title with the spaces removed (0.1.0 writes "ContextualAlert"); "Unreleased" when only
 *     the Unreleased entry names it. A released component's spec links to main; an unreleased
 *     one's to the branch the page was built from, the only place it exists yet.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { meta as builderMeta } from './build-components.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

export const REPO = 'https://github.com/omkarpkh/vela'
export const PACKAGE = '@omkarux/vela'
export const HEADLESS = '@omkarux/vela/headless'
export const LABELS = ['Approved', 'Known bugs', 'Experimental', 'Retired']
export const PUBLISHED_FILE = 'scripts/figma/pages/published.json'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-10-09` → `9 Oct 2026`, the form the live pages use. */
export const longDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}` }

// ---------- CHANGELOG.md ----------
const KINDS = /^(Added|Changed|Fixed|Removed|Deprecated|Security)\b/
const plain = (s) => s.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

/** The lead-in of one bullet: its opening bold, word for word; otherwise its opening sentence, cut to "…" past 90 characters. */
export function leadOf(bullet) {
  const flat = bullet.replace(/\s+/g, ' ').trim()
  const bold = flat.match(/^\*\*(.+?)\*\*/)
  if (bold) return plain(bold[1])
  const text = plain(flat)
  if (text.length <= 90) return text
  const sentence = (text.match(/^.+?\.(?=\s)/) || [''])[0]
  if (sentence && sentence.length <= 90) return sentence + ' …'
  const cut = text.slice(0, 90)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.—-]+$/, '') + '…'
}

/** GitHub's anchor for a markdown heading: lowercase, punctuation dropped, spaces to hyphens. `[0.12.1] — 2026-10-09` → `0121--2026-10-09`. */
export const githubAnchor = (heading) => heading.toLowerCase().replace(/[^\w\- ]/g, '').replace(/ /g, '-')

/** Every `## [version]` entry in the changelog, in file order (newest first), with its sections and their bullet lead-ins. */
export function parseChangelog(md) {
  const entries = []
  for (const part of md.split(/^(?=## )/m)) {
    const h = part.match(/^## (\[([^\]]+)\](?:\s*[—-]\s*(\d{4}-\d{2}-\d{2}))?)/)
    if (!h) continue
    const body = part.slice(part.indexOf('\n') + 1)
    const sections = []
    for (const sec of body.split(/^(?=### )/m)) {
      const sh = sec.match(/^### (.+)$/m)
      if (!sh || !KINDS.test(sh[1].trim())) continue
      const name = sh[1].trim()
      const text = sec.slice(sec.indexOf('\n') + 1)
      // A bullet runs from `- ` at the start of a line to the next one, a blank line followed by prose, or the end.
      const bullets = []
      let cur = null
      for (const line of text.split('\n')) {
        if (/^- /.test(line)) { if (cur !== null) bullets.push(cur); cur = line.slice(2) }
        else if (cur !== null && /^\s+\S/.test(line)) cur += ' ' + line.trim()
        else if (cur !== null && line.trim() !== '') { bullets.push(cur); cur = null }
      }
      if (cur !== null) bullets.push(cur)
      const leads = bullets.map(leadOf)
      const same = sections.find((s) => s.name === name)
      if (same) { same.leads.push(...leads); same.text += text } else sections.push({ name, text, leads })
    }
    entries.push({ version: h[2], date: h[3] ?? null, heading: h[1], sections, text: body, released: h[2].toLowerCase() !== 'unreleased' })
  }
  return entries
}

export const changelog = () => parseChangelog(read('CHANGELOG.md'))

// ---------- what is on npm ----------
/** pages/published.json — `versions` on npm, `checked` the day that was confirmed, `how` the command. */
export function publishedFile() {
  const f = JSON.parse(read(PUBLISHED_FILE))
  if (!Array.isArray(f.versions)) throw new Error(`${PUBLISHED_FILE}: "versions" must be a list`)
  return f
}

/** The versions on the registry. Network; throws when it cannot be reached. */
export function registryVersions() {
  const out = execFileSync('npm', ['view', PACKAGE, 'versions', '--json'], { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] })
  const v = JSON.parse(out)
  return Array.isArray(v) ? v : [v]
}

// ---------- the stamp ----------
/** Branch, short sha ("+uncommitted" when the tree is dirty) and today's date — what every stamp line states. */
export function stampParts() {
  const git = (...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } }
  const sha = git('rev-parse', '--short', 'HEAD') || 'unknown'
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD') || 'unknown'
  const dirty = git('status', '--porcelain') !== ''
  const date = new Date().toISOString().slice(0, 10)
  return { sha, branch, dirty, date, at: `${branch} ${sha}${dirty ? '+uncommitted' : ''} (${longDate(date)})` }
}

/**
 * @param published        the versions on npm
 * @param publishedSource  where that list came from, said on the page
 */
export function changelogData({ published, publishedSource }) {
  if (!Array.isArray(published)) throw new Error('changelogData: `published` must be the list of versions on npm')
  const s = stampParts()
  const releases = changelog().filter((e) => e.released).map((e) => ({
    version: e.version,
    date: e.date ? longDate(e.date) : 'Undated',
    onNpm: published.includes(e.version),
    link: `${REPO}/blob/main/CHANGELOG.md#${githubAnchor(e.heading)}`,
    sections: e.sections.filter((x) => x.leads.length).map((x) => ({ name: x.name, leads: x.leads })),
  }))
  return {
    page: 'Changelog',
    intro: `Every released version of ${PACKAGE}, newest first: the lead-in of each entry, word for word, and whether the version is on npm. Compiled from CHANGELOG.md; the full entry for each version is linked.`,
    releases,
    stamp: `Read from CHANGELOG.md at ${s.at}. On npm: per ${publishedSource}.`,
  }
}

// ---------- the specs, GOVERNANCE.md, the registry and the public API ----------

/** The same rule as demo/pages/Status.tsx: the `**Status:**` line under the intent paragraph; Approved when absent. */
export function statusOf(spec) {
  const m = spec.match(/^\*\*Status:\*\*\s*([^\n]+?)(?:\s+[—-]\s+([\s\S]*?))?\n\n/m)
  if (!m) return { label: 'Approved', note: '' }
  const word = LABELS.find((l) => m[1].trim().toLowerCase().startsWith(l.toLowerCase()))
  return { label: word ?? 'Approved', note: (m[2] ?? '').replace(/`/g, '').replace(/\s+/g, ' ').trim() }
}

/** The spec's `**Dependencies:**` line; "none" when there is none. */
export function dependenciesOf(spec) {
  const m = spec.match(/^\*\*Dependencies:\*\*\s*([^\n]+)/m)
  return m ? m[1].replace(/`/g, '').trim() : 'none'
}

/** Where the component's React export ships from: the headless entry point when the spec names a dependency, the core package otherwise. */
export const entryPointOf = (spec) => (/^none\b/i.test(dependenciesOf(spec)) ? PACKAGE : HEADLESS)

/**
 * The name an entry point exports for a source folder: src/index.ts for the core package
 * (`ContextualAlert` for ./components/ContextualAlert), src/headless/index.ts for the headless one
 * (`Checkbox` for ./Checkbox). A headless-born component has no core export, so the spec's
 * `**Dependencies:**` line decides which index is read.
 */
export function exportNameOf(src, entry = PACKAGE) {
  const headless = entry === HEADLESS
  const file = headless ? 'src/headless/index.ts' : 'src/index.ts'
  const from = headless ? `\\./${src}` : `\\./components/${src}`
  const m = read(file).match(new RegExp(`^export \\{ (\\w+) \\} from '${from}'`, 'm'))
  if (!m) throw new Error(`${file} exports nothing from ${from.replace(/\\/g, '')}`)
  return m[1]
}

/** GOVERNANCE.md's "Component lifecycle" table: label → its Meaning and What-it-promises cells, word for word. */
export function lifecycleTable(md = read('GOVERNANCE.md')) {
  const sec = md.match(/^## Component lifecycle\n([\s\S]*?)(?=^## )/m)
  if (!sec) throw new Error('GOVERNANCE.md: no "## Component lifecycle" section')
  const out = {}
  for (const m of sec[1].matchAll(/^\| \*\*([^*]+)\*\* \| ([^|]+) \| ([^|]+) \|/gm)) out[m[1].trim()] = { meaning: plain(m[2]), promise: plain(m[3]) }
  for (const l of LABELS) if (!out[l]) throw new Error(`GOVERNANCE.md: the lifecycle table has no row for ${l}`)
  return out
}

/** The playground registry's order — id, spec file, source folder, name — read from demo/playground/registry.tsx. */
export function registryOrder() {
  const src = read('demo/playground/registry.tsx')
  const body = src.slice(src.indexOf('export const REGISTRY'))
  const ids = [...body.matchAll(/^\s*id: '([^']+)',/gm)]
  return ids.map((m, i) => {
    const chunk = body.slice(m.index, ids[i + 1]?.index ?? body.length)
    const f = (k) => (chunk.match(new RegExp(`^\\s*${k}: '([^']+)'`, 'm')) || [])[1]
    return { id: m[1], file: f('file') ?? `${m[1]}.md`, src: f('src'), name: f('name') }
  })
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The oldest release whose entry names the component; "Unreleased" when only the Unreleased entry
 * does; "—" when none. Code spans are not prose naming a component: 0.12.1 mentions an `Icon` box
 * (a Figma layer inside Button) long before the Icon component exists, so they are skipped.
 */
export function sinceOf(name, entries = changelog()) {
  const needle = new RegExp(`\\b(${escapeRe(name)}|${escapeRe(name.replace(/\s+/g, ''))})\\b`)
  const names = (e) => needle.test(e.text.replace(/`[^`\n]*`/g, ''))
  const oldest = entries.filter((e) => e.released).reverse().find(names)
  if (oldest) return oldest.version
  return entries.some((e) => !e.released && names(e)) ? 'Unreleased' : '—'
}

export function statusData() {
  const dir = join(root, 'guidelines/components')
  const order = registryOrder()
  const registered = new Set(order.map((o) => o.file))
  const stray = readdirSync(dir).filter((f) => f.endsWith('.md') && !registered.has(f))
  if (stray.length) throw new Error(`guidelines/components: ${stray.join(', ')} not in demo/playground/registry.tsx — register the component first`)
  const entries = changelog()
  const table = lifecycleTable()
  const s = stampParts()
  const rows = order.map((o) => {
    const spec = readFileSync(join(dir, o.file), 'utf8')
    const name = (spec.match(/^# (.+)$/m) || [, o.name ?? o.id])[1].trim()
    const { label } = statusOf(spec)
    // GOVERNANCE.md: an Experimental component "does not get a Figma set yet".
    const hasBuilder = existsSync(join(root, 'scripts/figma/components', `${o.id}.figma.js`))
    const m = hasBuilder ? builderMeta(o.id) : null
    const figmaSet = label === 'Experimental' || !m
      ? (m ? `None yet — the builder is ready (${o.id}.figma.js)` : 'None yet')
      : `${m.set} · page ${m.page}`
    const since = sinceOf(name, entries)
    const onBranch = since === 'Unreleased'
    return {
      name, label, figmaSet,
      reactExport: `${exportNameOf(o.src, entryPointOf(spec))} · ${entryPointOf(spec)}`,
      since,
      spec: { text: o.file + (onBranch ? ' (branch)' : ''), url: `${REPO}/blob/${onBranch ? s.branch : 'main'}/guidelines/components/${o.file}` },
    }
  })
  return {
    page: 'Status',
    intro: 'Every component in Vela, with its lifecycle label. The labels and what moves a component between them are set in GOVERNANCE.md. A spec states its label on a Status line under its intent; Approved is the default and is not written down.',
    legend: LABELS.map((label) => ({ label, text: `${table[label].meaning} ${table[label].promise}` })),
    legendNote: 'A lifecycle label is not a severity, a risk or a status, so it carries no taxonomy colour: the word is the signal. “Main components — do not touch” is the fifth label, and it applies to the Figma file, not to a component: it marks the source sets on the component pages, which scripts/figma/ creates and updates.',
    rows,
    stamp: `Read from guidelines/components/*.md, GOVERNANCE.md and CHANGELOG.md at ${s.at}. The label is each spec’s Status line, Approved when it has none; Since is the first release whose changelog entry names the component.`,
    governance: `${REPO}/blob/main/GOVERNANCE.md`,
  }
}
