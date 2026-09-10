/**
 * tokens/vela.tokens.json is THE source of truth.
 * This script emits src/styles/tokens.light.css and tokens.dark.body.css from it,
 * preserving the hand-written comments in the current files (kept in
 * tokens/layout.txt as the template). The Figma library is generated from the
 * same JSON by scripts/sync-figma.mjs. One edit, both targets.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const doc = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))

const all = {}
for (const [group, tokens] of Object.entries(doc)) {
  if (group.startsWith('$')) continue
  for (const [name, t] of Object.entries(tokens)) all[name] = { ...t, group }
}

const cssValue = (t, mode) => {
  let v = t.$value
  if (mode === 'dark' && t.$extensions?.vela?.dark) v = t.$extensions.vela.dark
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return `var(--vela-${v.slice(1, -1)})`
  if (t.$type === 'dimension') return `${v.value}${v.unit}`
  if (t.$type === 'fontFamily') return typeof v === 'string' ? v : v.join(', ')
  if (t.$type === 'cubicBezier') return `cubic-bezier(${v.join(', ')})`
  return String(v)
}

// The layout template keeps every comment and blank line of the hand-authored
// file; each `@name` line becomes the token's declaration.
const render = (templateFile, mode) =>
  readFileSync(join(root, 'tokens', templateFile), 'utf8').replace(
    /^(\s*)@([a-z0-9-]+)(.*)$/gm,
    (_, indent, name, tail) => {
      const t = all[name]
      if (!t) throw new Error(`layout references unknown token: ${name}`)
      return `${indent}--vela-${name}: ${cssValue(t, mode)};${tail}`
    },
  )

writeFileSync(join(root, 'src/styles/tokens.light.css'), render('layout.light.txt', 'light'))
writeFileSync(join(root, 'src/styles/tokens.dark.body.css'), render('layout.dark.txt', 'dark'))
console.log(`build:tokens  ${Object.keys(all).length} tokens → tokens.light.css + tokens.dark.body.css`)
