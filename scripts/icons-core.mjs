/**
 * The Icon set's one source of truth, shared by the generator (scripts/build-icons.mjs) and the
 * tests (src/components/Icon/Icon.test.tsx, src/icons/icons.test.ts), so the build and the checks
 * cannot read the curated list or Lucide differently.
 *
 * Source of the glyph geometry: the installed `lucide` package (a pinned devDependency), one ESM
 * module per canonical icon at node_modules/lucide/dist/esm/icons/<kebab-name>.mjs. Each module's
 * default export is Lucide's IconNode — `[[tag, attrs], …]` on a 24×24 grid — the same data the
 * package's public `import { ShieldX } from 'lucide'` returns; reading the per-icon file avoids
 * importing all ~1,900 icons to use fifty. Aliases (`filter`, `trash-2`, `history`) have no module
 * of their own and are listed in dist/esm/iconsAndAliases.mjs; the curated list must use the
 * canonical name, and a test of the list says which canonical name an alias resolves to.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lucideDir = join(root, 'node_modules/lucide')
const iconFile = (name) => join(lucideDir, 'dist/esm/icons', `${name}.mjs`)

/** kebab → Pascal, the way Lucide names its exports: `shield-question-mark` → `ShieldQuestionMark`, `undo-2` → `Undo2`. */
export const pascal = (kebab) => kebab.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')

export function loadList() {
  const list = JSON.parse(readFileSync(join(root, 'scripts/icons.list.json'), 'utf8'))
  if (!Array.isArray(list.icons) || !list.icons.length) throw new Error('scripts/icons.list.json: "icons" must be a non-empty array')
  const dupes = list.icons.filter((n, i) => list.icons.indexOf(n) !== i)
  if (dupes.length) throw new Error(`scripts/icons.list.json: duplicate names ${dupes.join(', ')}`)
  return list
}

export function lucideVersion() {
  return JSON.parse(readFileSync(join(lucideDir, 'package.json'), 'utf8')).version
}

/** Every export name Lucide publishes (canonical and alias) → the canonical kebab name it resolves to. */
export function aliasTable() {
  const src = readFileSync(join(lucideDir, 'dist/esm/iconsAndAliases.mjs'), 'utf8')
  const table = new Map()
  for (const m of src.matchAll(/^export \{ ([^}]+) \} from '\.\/icons\/([a-z0-9-]+)\.mjs';$/gm))
    for (const part of m[1].split(',')) table.set(part.trim().replace(/^default as /, ''), m[2])
  return table
}

/** The canonical kebab name for a name Lucide knows (an alias resolves; an unknown name is null). */
export function canonical(name, table = aliasTable()) {
  if (existsSync(iconFile(name))) return name
  return table.get(pascal(name)) ?? null
}

/** Lucide's IconNode for one canonical name. Throws, naming the canonical name, for an alias. */
export async function glyphNode(name) {
  if (!existsSync(iconFile(name))) {
    const to = canonical(name)
    throw new Error(to
      ? `"${name}" is a Lucide alias of "${to}" — use the canonical name in scripts/icons.list.json`
      : `"${name}" is not a Lucide ${lucideVersion()} icon`)
  }
  return (await import(pathToFileURL(iconFile(name)).href)).default
}

/**
 * The curated glyphs Lucide's LICENSE says derive from Feather (MIT, Cole Bemis). The LICENSE lists
 * Feather's names (`alert-triangle`, `trash-2`, `more-horizontal`); each is resolved to Lucide's
 * current canonical name through the alias table, then intersected with the curated list. NOTICE
 * prints the result, and a test holds NOTICE to it.
 */
export function featherDerived(icons = loadList().icons) {
  const licence = readFileSync(join(lucideDir, 'LICENSE'), 'utf8')
  const m = licence.match(/derived from the Feather project:\s*\n\s*\n([^\n]+)/)
  if (!m) throw new Error('lucide/LICENSE: could not find the list of Feather-derived icons — has its shape changed?')
  const table = aliasTable()
  const derived = new Set(m[1].split(',').map((s) => canonical(s.trim(), table)).filter(Boolean))
  return icons.filter((n) => derived.has(n)).sort()
}
