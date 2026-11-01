/**
 * `import { PAIRS, RELEASE } from 'virtual:vela-site-facts'` — the numbers the site's Overview
 * states that the browser cannot count for itself, counted at build time from the files that hold
 * them, so no page types a number by hand (the Overview brief, section 3).
 *
 *   PAIRS          PAIRS.length in scripts/contrast-core.mjs: the contrast pairs `npm test` asserts
 *                  in both themes. That module reads the token files from disk, so the browser
 *                  can't import it; the count can.
 *   PAIRS_LINE     the line `export const PAIRS` starts on, for the link to the list.
 *   DEPENDENCIES   how many runtime dependencies package.json declares (`dependencies`; 0 if absent).
 *   RELEASE        the version in package.json, its release date from CHANGELOG.md's heading
 *                  (`## [X.Y.Z] — YYYY-MM-DD`), and the three lines under that section's
 *                  `**Highlights:**` (RELEASING.md, step 3). Empty when the section or its
 *                  highlights are missing; src/styles/site-overview.test.tsx fails the build then.
 *   MOOD_SEED      the release seed of package.json's version as the mood stills' names carry it
 *                  (`seedLabel(markSeed(version))`, scripts/brand/mark-seed.mjs: "0.15" for 0.15.x),
 *                  so the Overview asks for the stills of the version it was built from.
 *
 * Everything else the Overview counts (rules, components, proposals, checks) is already in the
 * site's first chunk, read from the same sources as the nav, so it is counted there.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PAIRS } from './contrast-core.mjs'
import { markSeed, seedLabel } from './brand/mark-seed.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const ID = 'virtual:vela-site-facts'
const RESOLVED = `\0${ID}`
const WATCHED = ['CHANGELOG.md', 'package.json', 'scripts/contrast-core.mjs']

/** Markdown inline syntax off a line: bold, code ticks and link targets. */
const plain = (s) => s.replace(/\*\*/g, '').replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim()

/**
 * One release's facts from CHANGELOG.md. The section runs from its `## [version]` heading to the
 * next `## `; its highlights are the bullets after a `**Highlights:**` line, up to the first line
 * that is neither a bullet, its indented continuation, nor blank. Exported for the unit test.
 */
export function releaseFacts(md, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const section = md.match(new RegExp(`^## \\[${escaped}\\](?:\\s*[—-]\\s*(\\d{4}-\\d{2}-\\d{2}))?[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))
  if (!section) return { version, date: null, highlights: [] }
  const highlights = []
  const lines = section[2].split('\n')
  const at = lines.findIndex((l) => /^\*\*Highlights:\*\*\s*$/.test(l.trim()))
  if (at >= 0) {
    for (const line of lines.slice(at + 1)) {
      if (/^- /.test(line)) highlights.push(line.slice(2))
      else if (/^\s+\S/.test(line) && highlights.length) highlights[highlights.length - 1] += ' ' + line.trim()
      else if (line.trim() === '' && highlights.length === 0) continue
      else break
    }
  }
  return { version, date: section[1] ?? null, highlights: highlights.map(plain) }
}

/** The values the module exports. Exported for the unit test, which reads the same files. */
export function siteFacts() {
  const pkg = JSON.parse(read('package.json'))
  const contrast = read('scripts/contrast-core.mjs')
  return {
    PAIRS: PAIRS.length,
    PAIRS_LINE: contrast.slice(0, contrast.indexOf('export const PAIRS')).split('\n').length,
    DEPENDENCIES: Object.keys(pkg.dependencies ?? {}).length,
    RELEASE: releaseFacts(read('CHANGELOG.md'), pkg.version),
    MOOD_SEED: seedLabel(markSeed(pkg.version)),
  }
}

/** @returns {import('vite').Plugin} */
export function siteFactsPlugin() {
  return {
    name: 'vela-site-facts',
    resolveId: (source) => (source === ID ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null
      for (const f of WATCHED) this.addWatchFile(join(root, f))
      // PAIRS is re-read from disk on each load: contrast-core.mjs is imported once per process,
      // so in dev a new pair shows after a restart. Every build is a fresh process.
      return Object.entries(siteFacts()).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)}`).join('\n')
    },
  }
}
