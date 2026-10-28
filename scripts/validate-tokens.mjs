/**
 * DTCG conformance gate for the token source.
 *
 *   npm run tokens:validate
 *
 * Two independent checks, both of which must pass, and a warning is a failure:
 *
 *   1. @terrazzo/parser (MIT), the reference-grade implementation of the 2025.10 Format, Color and
 *      Resolver modules, parses tokens/vela.resolver.json — which loads the base set and the dark
 *      overlay — and then the base file on its own. Its logger is captured so that a warning (for
 *      example "string colors will be deprecated") fails the run instead of scrolling past.
 *   2. Vela's own strictness, which is tighter than the spec: every colour is an sRGB object whose
 *      `hex` fallback agrees with its components; every alias is a full path that exists; every
 *      duration and dimension is an object; the only $extensions key is the reverse-domain vendor
 *      key; the overlay holds only semantic colours that actually change; the resolver's version is
 *      the one the published JSON Schema requires. These are the rules the generators rely on.
 *
 * Exit 0 with a one-line summary, or 1 with every problem listed. No network: the parser does not
 * fetch the $schema URLs, and the resolver's $ref sources are local files.
 *
 * Not used: the Anima design-tokens-validator (@animaapp/design-tokens-validator 0.0.2, archived
 * May 2026) implements the 2023 draft — hex-string colours, "<n>ms" durations — and rejects every
 * 2025.10 value shape, so it cannot judge this file.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse, defineConfig } from '@terrazzo/parser'
import { loadTokenSet, VENDOR, isAlias, aliasPath, hexOf, msOf, pxOf, RESOLVER_FILE } from './tokens-core.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const fail = (msg) => problems.push(msg)

// ---------- 1. Terrazzo ----------
class CollectingLogger {
  level = 'warn'
  errorCount = 0
  warnCount = 0
  constructor(label) { this.label = label }
  error(...entries) { for (const e of entries) { this.errorCount++; fail(`[terrazzo ${this.label}] error: ${firstLine(e.message)}`) } }
  warn(...entries) { for (const e of entries) { this.warnCount++; fail(`[terrazzo ${this.label}] warning: ${firstLine(e.message)}`) } }
  info() {}
  debug() {}
  setLevel() {}
  stats() { return { errorCount: this.errorCount, warnCount: this.warnCount } }
}
const firstLine = (s) => String(s).split('\n')[0]

async function terrazzo(relative, label) {
  const filename = pathToFileURL(join(root, relative))
  const logger = new CollectingLogger(label)
  const config = defineConfig({}, { cwd: new URL('./', filename) })
  try {
    const result = await parse([{ filename, src: readFileSync(filename, 'utf8') }], { config, logger, continueOnError: true })
    return result
  } catch (e) {
    // the parser throws after logging when it cannot continue; the log lines are already recorded
    if (!problems.some((p) => p.startsWith(`[terrazzo ${label}]`))) fail(`[terrazzo ${label}] ${firstLine(e.message)}`)
    return null
  }
}

const viaResolver = await terrazzo(RESOLVER_FILE, 'resolver')
const baseAlone = await terrazzo('tokens/vela.tokens.json', 'base')

// ---------- 2. Vela's own strictness ----------
let set = null
try { set = loadTokenSet(root) } catch (e) { fail(`[core] ${e.message}`) }

const resolver = JSON.parse(readFileSync(join(root, RESOLVER_FILE), 'utf8'))
if (resolver.version !== '2025.10') fail(`[resolver] version must be "2025.10" (the published JSON Schema's const; the spec prose is inconsistent), got ${JSON.stringify(resolver.version)}`)
if (resolver.$schema !== 'https://www.designtokens.org/schemas/2025.10/resolver.json') fail(`[resolver] $schema should be the published resolver schema, got ${resolver.$schema}`)
const theme = resolver.modifiers?.theme
if (!theme) fail('[resolver] no `theme` modifier')
else {
  if (theme.default !== 'light') fail(`[resolver] theme.default must be "light", got ${JSON.stringify(theme.default)}`)
  const ctx = Object.keys(theme.contexts ?? {})
  if (ctx.join(',') !== 'light,dark') fail(`[resolver] theme contexts must be exactly light, dark — got ${ctx.join(', ')}`)
  if ((theme.contexts?.light ?? []).length !== 0) fail('[resolver] the light context overlays nothing: light IS the base set')
}

// Per-token checks run over the raw JSON, not the loaded set, so every fault is listed even
// when one of them stops tokens-core from loading at all.
const baseDoc = JSON.parse(readFileSync(join(root, 'tokens/vela.tokens.json'), 'utf8'))
for (const file of ['tokens/vela.tokens.json', 'tokens/vela.dark.tokens.json']) {
  const doc = JSON.parse(readFileSync(join(root, file), 'utf8'))
  if (doc.$schema !== 'https://www.designtokens.org/schemas/2025.10/format.json') fail(`[${file}] $schema should be the published format schema, got ${doc.$schema}`)
}
const rawPaths = new Set()
for (const [group, tokens] of Object.entries(baseDoc)) if (!group.startsWith('$')) for (const name of Object.keys(tokens)) rawPaths.add(`${group}.${name}`)
for (const [group, tokens] of Object.entries(baseDoc)) {
  if (group.startsWith('$')) continue
  for (const [name, t] of Object.entries(tokens)) {
    const where = `[${group}.${name}]`
    const v = t.$value
    const type = t.$type ?? tokens.$type
    if (!type && !isAlias(v)) fail(`${where} no $type`)
    if (isAlias(v)) {
      const target = aliasPath(v)
      if (!target.includes('.')) fail(`${where} alias ${v} is not a full path (e.g. {primitives.grey-700})`)
      else if (!rawPaths.has(target)) fail(`${where} alias ${v} points at nothing`)
      else if (type && baseDoc[target.split('.')[0]][target.split('.')[1]].$type !== type) fail(`${where} aliases a token of another $type`)
      if (group === 'primitives') fail(`${where} a primitive must hold a raw value, not an alias`)
    } else {
      if (group === 'color') fail(`${where} a semantic colour must alias, never hold a raw value`)
      try {
        if (type === 'color') { hexOf(v, `${group}.${name}`); if (v.hex === undefined) fail(`${where} colour has no hex fallback (Vela requires one so humans can read the file)`) }
        else if (type === 'duration') msOf(v, `${group}.${name}`)
        else if (type === 'dimension') pxOf(v, `${group}.${name}`)
        else if (type === 'cubicBezier' && !(Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number'))) fail(`${where} cubicBezier must be four numbers`)
        else if (type === 'number' && typeof v !== 'number') fail(`${where} number must be a JSON number`)
        else if (type === 'fontFamily' && !(typeof v === 'string' || Array.isArray(v))) fail(`${where} fontFamily must be a string or an array of strings`)
      } catch (e) { fail(`${where} ${e.message}`) }
    }
    const ext = t.$extensions ?? {}
    for (const k of Object.keys(ext)) if (k !== VENDOR) fail(`${where} $extensions key "${k}" — vendor data belongs under "${VENDOR}"`)
    for (const k of Object.keys(ext[VENDOR] ?? {})) if (!['figma', 'raw'].includes(k)) fail(`${where} unknown vendor extension key "${k}" (dark values live in tokens/vela.dark.tokens.json)`)
    if (['color', 'dimension', 'number', 'duration', 'cubicBezier'].includes(type) && !ext[VENDOR]?.figma) fail(`${where} has no Figma variable name`)
    if (![true, false, undefined].includes(t.$deprecated) && typeof t.$deprecated !== 'string') fail(`${where} $deprecated must be true, false or a string`)
  }
}

if (set) {
  // the overlay: semantic colours only, every one a real change
  const overlay = JSON.parse(readFileSync(join(root, 'tokens/vela.dark.tokens.json'), 'utf8'))
  for (const [group, tokens] of Object.entries(overlay)) {
    if (group.startsWith('$')) continue
    if (group !== 'color') fail(`[dark overlay] group "${group}" — the overlay re-points semantic colours only`)
    for (const [name, t] of Object.entries(tokens)) {
      if (name.startsWith('$')) continue
      const b = set.all[name]
      if (!b || b.group !== 'color') { fail(`[dark overlay] ${name} is not a semantic colour in the base set`); continue }
      if (JSON.stringify(t.$value) === JSON.stringify(b.$value)) fail(`[dark overlay] ${name} repeats its light value; drop it`)
      for (const k of Object.keys(t)) if (k !== '$value') fail(`[dark overlay] ${name}.${k} — an overlay token carries only $value; type, description and Figma name come from the base`)
    }
  }
  // Terrazzo and the core must agree on every resolved colour, in both contexts
  if (viaResolver?.resolver) {
    for (const ctx of ['light', 'dark']) {
      const tz = viaResolver.resolver.apply({ theme: ctx })
      for (const name of set.order) {
        const t = set.all[name]
        if (t.$type !== 'color') continue
        const theirs = tz[t.path]?.$value?.hex
        const ours = hexOf(set.resolved(name, ctx), name)
        if (theirs !== ours) fail(`[cross-check] ${t.path} (${ctx}): terrazzo resolves ${theirs}, tokens-core resolves ${ours}`)
      }
    }
  }
  if (viaResolver && Object.keys(viaResolver.tokens).length !== set.order.length) fail(`[cross-check] terrazzo sees ${Object.keys(viaResolver.tokens).length} tokens, tokens-core ${set.order.length}`)
  if (baseAlone && Object.keys(baseAlone.tokens).length !== set.order.length) fail(`[cross-check] the base file alone parses to ${Object.keys(baseAlone.tokens).length} tokens, expected ${set.order.length}`)
}

if (problems.length) {
  console.error(`\ntokens:validate  ${problems.length} problem(s)\n`)
  for (const p of problems) console.error('  ' + p)
  console.error()
  process.exit(1)
}
const n = set.order.length
const dark = Object.keys(JSON.parse(readFileSync(join(root, 'tokens/vela.dark.tokens.json'), 'utf8')).color).filter((k) => !k.startsWith('$')).length
console.log(`tokens:validate  DTCG 2025.10 ✓  ${n} tokens, ${dark} dark overrides — @terrazzo/parser: 0 errors, 0 warnings on ${RESOLVER_FILE} and on tokens/vela.tokens.json; Vela strictness: clean`)
