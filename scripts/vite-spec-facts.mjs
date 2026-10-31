/**
 * `import facts from 'guidelines/components/button.md?facts'` (playground spec, B8).
 *
 * The nav, the search and the Status page need a few facts from every spec, on every page: its
 * title, its first paragraph, its **Status:** line, its "When to use" section and its rule tags.
 * Importing every spec whole put about 230 kB of markdown in the site's first chunk. This plugin
 * cuts each spec down to those parts at build time, still as markdown, so the same parsers read
 * it (status.ts, search.ts, facts.ts), and nothing is hand-copied. A component page still loads
 * its full spec, in its own chunk.
 */
import { readFileSync } from 'node:fs'

const SUFFIX = '?facts'

/** The parts of a spec the shell reads, in order. Exported for the unit test. */
export function specFacts(md) {
  const lines = md.split('\n')
  const out = []
  const title = lines.find((l) => /^# /.test(l))
  if (title) out.push(title, '')
  // The first paragraph after the title: the summary.
  const body = md.replace(/^[\s\S]*?^# [^\n]*\n+/m, '')
  const first = body.split(/\n\n/)[0]
  if (first && !first.startsWith('#')) out.push(first.trim(), '')
  // The **Status:** paragraph, as statusOf reads it (it ends at a blank line).
  const status = md.match(/^\*\*Status:\*\*[\s\S]*?\n\n/m)
  if (status) out.push(status[0].trimEnd(), '')
  // "When to use", up to the next section.
  const when = md.match(/^## When to use[^\n]*\n[\s\S]*?(?=^## )/m)
  if (when) out.push(when[0].trimEnd(), '')
  // Every rule tag, one per line, so ids and levels can be counted and searched.
  const tags = [...md.matchAll(/\[\[rule:[^\]]*\]\]/g)].map((m) => `- ${m[0]}`)
  if (tags.length) out.push('## Rules', ...tags, '')
  out.push('## End', '')
  return out.join('\n')
}

/** @returns {import('vite').Plugin} */
export function specFactsPlugin() {
  return {
    name: 'vela-spec-facts',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith(SUFFIX)) return null
      const r = await this.resolve(source.slice(0, -SUFFIX.length), importer, { skipSelf: true })
      return r ? `${r.id}${SUFFIX}` : null
    },
    load(id) {
      if (!id.endsWith(SUFFIX)) return null
      const file = id.slice(0, -SUFFIX.length)
      this.addWatchFile(file)
      return `export default ${JSON.stringify(specFacts(readFileSync(file, 'utf8')))}`
    },
  }
}
