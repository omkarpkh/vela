/**
 * One-off migration of tokens/vela.tokens.json to the strict DTCG 2025.10 form
 * (Format, Color and Resolver modules — Final Community Group Reports, 28 Oct 2025).
 *
 * What it changes, and nothing else:
 *   colour $value     "#rrggbb"            → { colorSpace: "srgb", components: [r, g, b], hex: "#rrggbb" }
 *   duration $value   "120ms"              → { value: 120, unit: "ms" }
 *   aliases           "{grey-700}"         → "{primitives.grey-700}"   (full path from the document root)
 *   $extensions.vela                       → $extensions["com.omkarux.vela"]  (reverse-domain vendor key)
 *   $extensions.vela.dark                  → removed; the dark values that DIFFER from light become
 *                                            tokens/vela.dark.tokens.json, an overlay the resolver applies
 *   $schema                                → the published JSON Schema for the 2025.10 format
 * Every $description, every group, every key order and every Figma name is preserved.
 *
 * It also writes tokens/vela.resolver.json (Resolver module): one set (the base file) and one
 * `theme` modifier with `light` (default, nothing overlaid) and `dark` contexts.
 *
 * Idempotent: run against an already-migrated file it exits 0 and writes nothing. Kept in the
 * repository as the record of how the file got its shape; it is not part of any npm script.
 *
 *   node scripts/migrate-tokens-2025.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'tokens')
const BASE = 'vela.tokens.json', DARK = 'vela.dark.tokens.json', RESOLVER = 'vela.resolver.json'
const VENDOR = 'com.omkarux.vela'
const FORMAT_SCHEMA = 'https://www.designtokens.org/schemas/2025.10/format.json'
const RESOLVER_SCHEMA = 'https://www.designtokens.org/schemas/2025.10/resolver.json'

const doc = JSON.parse(readFileSync(join(dir, BASE), 'utf8'))
const groups = Object.entries(doc).filter(([k]) => !k.startsWith('$'))

// Already in the strict form? Then there is nothing to do.
const legacy = groups.some(([, tokens]) => Object.values(tokens).some((t) => t.$extensions?.vela || typeof t.$value === 'string' && /^#|ms$/.test(t.$value)))
if (!legacy) { console.log('migrate-tokens-2025: tokens/vela.tokens.json is already in the 2025.10 form — nothing to do'); process.exit(0) }

// name → full path. Token names are unique across groups (the CSS custom properties rely on it).
const pathOf = {}
for (const [group, tokens] of groups)
  for (const name of Object.keys(tokens)) {
    if (pathOf[name]) throw new Error(`token name "${name}" appears in both ${pathOf[name].split('.')[0]} and ${group}`)
    pathOf[name] = `${group}.${name}`
  }

const isAlias = (v) => typeof v === 'string' && /^\{.+\}$/.test(v)
const fullAlias = (v) => {
  const target = v.slice(1, -1)
  if (target.includes('.')) return v // already a path
  if (!pathOf[target]) throw new Error(`alias {${target}} points at no token`)
  return `{${pathOf[target]}}`
}
const colorObject = (hex) => {
  const m = /^#([0-9a-f]{6})$/.exec(hex)
  if (!m) throw new Error(`expected a 6-digit lowercase hex colour, got ${hex}`)
  const n = parseInt(m[1], 16)
  // Exact n/255 doubles: JSON.stringify emits the shortest round-tripping form, and
  // Math.round(c * 255) recovers the byte, so `hex` and `components` can never disagree.
  const components = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255)
  return { colorSpace: 'srgb', components, hex }
}
const durationObject = (s) => {
  const m = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(s)
  if (!m) throw new Error(`expected <n>ms or <n>s, got ${s}`)
  return { value: Number(m[1]), unit: m[2] }
}

const dark = {}
const out = {}
for (const [k, v] of Object.entries(doc)) {
  if (k === '$schema') { out.$schema = FORMAT_SCHEMA; continue }
  if (k.startsWith('$')) { out[k] = v; continue }
  out[k] = {}
  for (const [name, t] of Object.entries(v)) {
    const token = {}
    for (const [key, val] of Object.entries(t)) {
      if (key === '$value') {
        if (isAlias(val)) token.$value = fullAlias(val)
        else if (t.$type === 'color') token.$value = colorObject(val)
        else if (t.$type === 'duration') token.$value = durationObject(val)
        else token.$value = val
      } else if (key === '$extensions') {
        const { vela, ...others } = val
        if (!vela) { token.$extensions = val; continue }
        const { dark: darkValue, ...rest } = vela
        if (darkValue !== undefined) {
          if (t.$type !== 'color') throw new Error(`${name}: a dark value on a non-colour token`)
          const light = isAlias(t.$value) ? fullAlias(t.$value) : t.$value
          const d = isAlias(darkValue) ? fullAlias(darkValue) : colorObject(darkValue)
          if (JSON.stringify(d) !== JSON.stringify(light)) dark[name] = { $value: d }
        }
        token.$extensions = { ...others, [VENDOR]: rest }
      } else token[key] = val
    }
    out[k][name] = token
  }
}
out.$description = `${doc.$description} Dark mode is an overlay: ${DARK} re-points the semantic colours that change, and ${RESOLVER} (DTCG Resolver module) says how the two combine. Conforms to the DTCG Format, Color and Resolver modules 2025.10; \`npm run tokens:validate\` checks it.`

const overlay = {
  $schema: FORMAT_SCHEMA,
  $description: `Vela dark theme. An OVERLAY, not a theme: only the semantic colours whose alias differs from the light value in ${BASE} appear here, and each carries only its dark $value — type, description and Figma name come from the base token. Applied by ${RESOLVER} as the \`dark\` context of the \`theme\` modifier; a token absent here keeps its light value. Not one primitive is redefined: dark mode is the semantic layer re-pointed onto the same scale.`,
  color: { $type: 'color', ...dark },
}

const resolver = {
  $schema: RESOLVER_SCHEMA,
  name: 'Vela',
  // The Resolver module's prose gives two different version strings (2025-10-01 in §4.1, 2025-11-01 in
  // §4.1.2). The published JSON Schema at RESOLVER_SCHEMA (`"const": "2025.10"`) and @terrazzo/parser
  // both require "2025.10", so that is what this file carries.
  version: '2025.10',
  description:
    'How the Vela token files combine. Resolution order: the base set (every token, light values) then the `theme` ' +
    'modifier — `light` (the default) overlays nothing; `dark` overlays vela.dark.tokens.json, which re-points only the ' +
    'semantic colours that change. The spec prose disagrees with itself on `version` (2025-10-01 vs 2025-11-01); the ' +
    'published JSON Schema and Terrazzo both require "2025.10", which is used here.',
  sets: {
    base: {
      description: 'Every Vela token with its light value: primitives, semantic colour, sizing, typography and motion.',
      sources: [{ $ref: BASE }],
    },
  },
  modifiers: {
    theme: {
      description: 'Light is the base; dark re-points the semantic colour layer onto other primitives.',
      default: 'light',
      contexts: { light: [], dark: [{ $ref: DARK }] },
    },
  },
  resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/theme' }],
}

const write = (file, data) => writeFileSync(join(dir, file), JSON.stringify(data, null, 2) + '\n')
write(BASE, out)
write(DARK, overlay)
write(RESOLVER, resolver)
const count = groups.reduce((n, [, t]) => n + Object.keys(t).length, 0)
console.log(`migrate-tokens-2025: ${count} tokens rewritten → ${BASE}; ${Object.keys(dark).length} dark overrides → ${DARK}; ${RESOLVER} written`)
