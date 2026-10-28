/**
 * tokens/vela.tokens.json is THE source of truth.
 * This script emits src/styles/tokens.light.css and tokens.dark.body.css from it,
 * preserving the hand-written comments in the current files (kept in
 * tokens/layout.*.txt as the template). The Figma library is generated from the
 * same JSON by scripts/sync-figma.mjs. One edit, both targets.
 *
 * The dark values come from tokens/vela.dark.tokens.json through tokens/vela.resolver.json
 * (DTCG Resolver module); scripts/tokens-core.mjs does the reading and the alias walk.
 * A `$deprecated` token still emits — with a `/* deprecated *\/` note after its declaration —
 * because removing the custom property is what would break a consumer.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadTokenSet, isAlias, aliasPath, cssColor, pxOf, msOf, cubicBezierOf, fontFamilyCss, deprecationNote } from './tokens-core.mjs'

/** One token's CSS value for a mode: an alias becomes var(--vela-<short name>), as the browser resolves it. */
export const cssValue = (set, name, mode) => {
  const t = set.all[name]
  const v = set.valueOf(name, mode)
  if (isAlias(v)) return `var(--vela-${set.byPath[aliasPath(v)].name})`
  switch (t.$type) {
    case 'color': return cssColor(v, name)
    case 'dimension': return `${pxOf(v, name)}px`
    case 'duration': return `${msOf(v, name)}ms`
    case 'cubicBezier': return `cubic-bezier(${cubicBezierOf(v, name).join(', ')})`
    case 'fontFamily': return fontFamilyCss(v)
    case 'number': return String(v)
    default: throw new Error(`${name}: no CSS serialisation for $type ${t.$type}`)
  }
}

// The layout template keeps every comment and blank line of the hand-authored
// file; each `@name` line becomes the token's declaration.
export const renderCss = (set, template, mode) =>
  template.replace(/^(\s*)@([a-z0-9-]+)(.*)$/gm, (_, indent, name, tail) => {
    const t = set.all[name]
    if (!t) throw new Error(`layout references unknown token: ${name}`)
    const note = deprecationNote(t)
    return `${indent}--vela-${name}: ${cssValue(set, name, mode)};${note ? ` /* ${note} */` : ''}${tail}`
  })

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const set = loadTokenSet(root)
  const template = (file) => readFileSync(join(root, 'tokens', file), 'utf8')
  writeFileSync(join(root, 'src/styles/tokens.light.css'), renderCss(set, template('layout.light.txt'), 'light'))
  writeFileSync(join(root, 'src/styles/tokens.dark.body.css'), renderCss(set, template('layout.dark.txt'), 'dark'))
  console.log(`build:tokens  ${set.order.length} tokens → tokens.light.css + tokens.dark.body.css`)
}
