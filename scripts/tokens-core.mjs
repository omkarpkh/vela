/**
 * The one reader of the token source. Every generator (CSS, Dart, MUI, the Figma scripts) and
 * the drift check go through this, so the DTCG 2025.10 shape is interpreted in exactly one place:
 *
 *   tokens/vela.resolver.json   Resolver module — which files combine, and in what order
 *   tokens/vela.tokens.json     the base set: every token with its light value
 *   tokens/vela.dark.tokens.json  the `dark` context of the `theme` modifier: only the semantic
 *                               colours that change, each carrying only its $value
 *
 * Format rules this module enforces while reading (the strict 2025.10 form; a legacy value is an
 * error, never silently accepted):
 *   colour     { colorSpace: "srgb", components: [r, g, b], alpha?, hex? } — components are 0–1,
 *              `hex` when present must agree with them
 *   duration   { value, unit: "ms" | "s" }
 *   dimension  { value, unit: "px" | "rem" }
 *   alias      "{group.name}" — a full path from the document root; the target must exist
 *   $extensions["com.omkarux.vela"]  the vendor data: `figma` (variable name), `raw`
 *   $deprecated  true | "reason" | false, inherited from the group unless the token says false
 *
 * A token's SHORT name (the last path segment) is what the CSS custom property, the Dart field
 * and the Figma code syntax carry, so short names are required to be unique across groups.
 *
 * `loadTokenSet(root)` reads the files; `createTokenSet({ base, overlays })` builds the same
 * thing from in-memory documents, which is what the tests use to exercise a deprecated token
 * without one existing in the source.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const VENDOR = 'com.omkarux.vela'
export const RESOLVER_FILE = 'tokens/vela.resolver.json'

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
export const isAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v)
export const aliasPath = (v) => v.slice(1, -1)

/** Walk a token document; call fn(path[], token, inheritedGroupProps) for every object with $value. */
function walk(doc, fn, path = [], inherited = {}) {
  for (const [k, v] of Object.entries(doc)) {
    if (k.startsWith('$')) continue
    if (/[{}.]/.test(k)) throw new Error(`"${[...path, k].join('/')}": token and group names must not contain "{", "}" or "."`)
    if (!isObj(v)) throw new Error(`"${[...path, k].join('.')}" is neither a token nor a group`)
    if ('$value' in v) fn([...path, k], v, inherited)
    else {
      const next = { ...inherited }
      if ('$type' in v) next.$type = v.$type
      if ('$deprecated' in v) next.$deprecated = v.$deprecated
      walk(v, fn, [...path, k], next)
    }
  }
}

// ---------- value readers ----------
const clamp01 = (n, what) => {
  if (typeof n !== 'number' || !(n >= 0 && n <= 1)) throw new Error(`${what}: expected a number in [0, 1], got ${JSON.stringify(n)}`)
  return n
}
const byte = (c) => Math.round(c * 255).toString(16).padStart(2, '0')

/** The sRGB colour object → its 6-digit lowercase hex; checks the `hex` fallback agrees. */
export function hexOf(v, what = 'colour') {
  if (typeof v === 'string') throw new Error(`${what}: a colour must be a { colorSpace, components } object, not the string ${JSON.stringify(v)} (DTCG 2025.10)`)
  if (!isObj(v) || v.colorSpace !== 'srgb') throw new Error(`${what}: only colorSpace "srgb" is supported, got ${JSON.stringify(v?.colorSpace)}`)
  if (!Array.isArray(v.components) || v.components.length !== 3) throw new Error(`${what}: srgb needs exactly three components`)
  const hex = '#' + v.components.map((c, i) => byte(clamp01(c, `${what} component ${i}`))).join('')
  if (v.hex !== undefined) {
    if (!/^#[0-9a-f]{6}$/.test(v.hex)) throw new Error(`${what}: hex must be 6-digit lowercase, got ${v.hex}`)
    if (v.hex !== hex) throw new Error(`${what}: hex ${v.hex} does not match components (${hex})`)
  }
  return hex
}
/** Alpha of a colour object, 1 when absent. */
export const alphaOf = (v, what = 'colour') => (v.alpha === undefined ? 1 : clamp01(v.alpha, `${what} alpha`))
/** CSS serialisation: #rrggbb, or #rrggbbaa when translucent. */
export const cssColor = (v, what) => hexOf(v, what) + (alphaOf(v, what) < 1 ? byte(alphaOf(v)) : '')

/** A duration object → milliseconds. */
export function msOf(v, what = 'duration') {
  if (!isObj(v) || typeof v.value !== 'number') throw new Error(`${what}: a duration must be { value, unit }, got ${JSON.stringify(v)} (DTCG 2025.10)`)
  if (v.unit === 'ms') return v.value
  if (v.unit === 's') return v.value * 1000
  throw new Error(`${what}: duration unit must be "ms" or "s", got ${JSON.stringify(v.unit)}`)
}
/** A dimension object → its px value (the only unit Vela uses; rem is valid DTCG but not here). */
export function pxOf(v, what = 'dimension') {
  if (!isObj(v) || typeof v.value !== 'number' || !['px', 'rem'].includes(v.unit)) throw new Error(`${what}: a dimension must be { value, unit: "px" | "rem" }, got ${JSON.stringify(v)}`)
  if (v.unit !== 'px') throw new Error(`${what}: only px dimensions map to CSS px, Figma floats and Flutter logical pixels`)
  return v.value
}
export const cubicBezierOf = (v, what = 'cubicBezier') => {
  if (!Array.isArray(v) || v.length !== 4 || v.some((n) => typeof n !== 'number')) throw new Error(`${what}: a cubicBezier is four numbers`)
  return v
}
/** A fontFamily value → the CSS font stack string. A string is emitted verbatim (`raw`). */
export const fontFamilyCss = (v) => (typeof v === 'string' ? v : v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', '))

// ---------- the set ----------
/**
 * @param base      the base token document
 * @param overlays  { contextName: [document, ...] } — the modifier's contexts, in resolution order
 * @param defaultContext  which context carries no overlay
 */
export function createTokenSet({ base, overlays = {}, defaultContext = 'light', resolver = null }) {
  const byPath = {}
  const all = {}
  const order = []
  walk(base, (path, t, inherited) => {
    const name = path.at(-1)
    const id = path.join('.')
    if (all[name]) throw new Error(`token short name "${name}" is used twice (${all[name].path} and ${id}); CSS, Dart and Figma names need it unique`)
    const type = t.$type ?? inherited.$type
    if (!type && !isAlias(t.$value)) throw new Error(`${id}: no $type on the token or any parent group`)
    const deprecated = t.$deprecated ?? inherited.$deprecated ?? false
    const rec = { ...t, $type: type, path: id, name, group: path[0], deprecated, values: { [defaultContext]: t.$value } }
    byPath[id] = rec
    all[name] = rec
    order.push(name)
  })
  // aliases resolve by full path only
  for (const t of Object.values(all)) {
    if (!isAlias(t.$value)) continue
    const target = aliasPath(t.$value)
    if (!byPath[target]) throw new Error(`${t.path}: alias {${target}} points at no token (aliases are full paths, e.g. {primitives.grey-700})`)
  }
  // alias type = the referenced token's type (Format §5.2.2)
  const typeOf = (t, seen = new Set()) => {
    if (t.$type) return t.$type
    if (seen.has(t.path)) throw new Error(`alias cycle at ${t.path}`)
    seen.add(t.path)
    return typeOf(byPath[aliasPath(t.$value)], seen)
  }
  for (const t of Object.values(all)) t.$type = typeOf(t)

  // overlays: a token may only re-point a base token of the same type; it never adds one
  const contexts = [defaultContext]
  for (const [ctx, docs] of Object.entries(overlays)) {
    if (!contexts.includes(ctx)) contexts.push(ctx)
    for (const doc of docs)
      walk(doc, (path, t, inherited) => {
        const id = path.join('.')
        const b = byPath[id]
        if (!b) throw new Error(`${ctx} overlay: ${id} is not a token in the base set — an overlay re-points, it does not add`)
        const type = t.$type ?? inherited.$type
        if (type && type !== b.$type) throw new Error(`${ctx} overlay: ${id} is ${type} in the overlay and ${b.$type} in the base`)
        if (isAlias(t.$value) && !byPath[aliasPath(t.$value)]) throw new Error(`${ctx} overlay: ${id} aliases {${aliasPath(t.$value)}}, which does not exist`)
        b.values[ctx] = t.$value
      })
  }

  const valueOf = (name, ctx = defaultContext) => {
    const t = all[name]
    if (!t) throw new Error('unknown token ' + name)
    if (!contexts.includes(ctx)) throw new Error(`unknown context "${ctx}" (have ${contexts.join(', ')})`)
    return t.values[ctx] ?? t.values[defaultContext]
  }
  /** Follow aliases to the token that holds a value, per context. Returns its short name. */
  const terminal = (name, ctx = defaultContext, seen = new Set()) => {
    const v = valueOf(name, ctx)
    if (!isAlias(v)) return name
    const target = byPath[aliasPath(v)].name
    if (seen.has(target)) throw new Error('alias cycle at ' + name)
    seen.add(target)
    return terminal(target, ctx, seen)
  }
  /** The resolved raw $value (never an alias) per context. */
  const resolved = (name, ctx = defaultContext) => valueOf(terminal(name, ctx), ctx)
  const vendor = (t) => (typeof t === 'string' ? all[t] : t)?.$extensions?.[VENDOR] ?? {}

  return { base, resolver, contexts, defaultContext, all, byPath, order, valueOf, terminal, resolved, vendor }
}

/** Read the resolver and every file it names, relative to the repository root. */
export function loadTokenSet(root) {
  const resolverPath = join(root, RESOLVER_FILE)
  const resolver = JSON.parse(readFileSync(resolverPath, 'utf8'))
  const dir = dirname(resolverPath)
  const load = (source, what) => {
    if (!isObj(source)) throw new Error(`${what}: a source must be an object`)
    if (typeof source.$ref === 'string') {
      if (source.$ref.startsWith('#')) throw new Error(`${what}: in-document $ref ${source.$ref} is not supported here`)
      return JSON.parse(readFileSync(join(dir, source.$ref), 'utf8'))
    }
    return source // inline tokens
  }
  if (resolver.version !== '2025.10') throw new Error(`${RESOLVER_FILE}: version must be "2025.10" (see the header comment in scripts/migrate-tokens-2025.mjs), got ${JSON.stringify(resolver.version)}`)
  const pointer = (ref) => {
    const m = /^#\/(sets|modifiers)\/([^/]+)$/.exec(ref ?? '')
    if (!m) throw new Error(`${RESOLVER_FILE}: resolutionOrder entries must be { "$ref": "#/sets/<name>" | "#/modifiers/<name>" }, got ${JSON.stringify(ref)}`)
    const item = resolver[m[1]]?.[m[2]]
    if (!item) throw new Error(`${RESOLVER_FILE}: ${ref} is not defined`)
    return { kind: m[1], name: m[2], item }
  }
  // Vela's resolver is one set then one modifier; a deeper merge (several sets, several
  // modifiers) is valid DTCG but is not something the generators have a use for yet.
  const entries = (resolver.resolutionOrder ?? []).map((e) => pointer(e.$ref))
  const sets = entries.filter((e) => e.kind === 'sets'), modifiers = entries.filter((e) => e.kind === 'modifiers')
  if (sets.length !== 1 || modifiers.length !== 1 || entries[0].kind !== 'sets') throw new Error(`${RESOLVER_FILE}: expected resolutionOrder = [one set, one modifier]`)
  const sources = sets[0].item.sources ?? []
  if (sources.length !== 1) throw new Error(`${RESOLVER_FILE}: the base set must have exactly one source file`)
  const base = load(sources[0], `set ${sets[0].name}`)
  const mod = modifiers[0].item
  const defaultContext = mod.default ?? Object.keys(mod.contexts)[0]
  const overlays = {}
  for (const [ctx, list] of Object.entries(mod.contexts)) overlays[ctx] = list.map((s, i) => load(s, `modifier ${modifiers[0].name}.${ctx}[${i}]`))
  return createTokenSet({ base, overlays, defaultContext, resolver })
}

/** `/* deprecated *\/`-style note for a token, or '' — one wording for every generator. */
export const deprecationNote = (t) => (t.deprecated === true ? 'deprecated' : typeof t.deprecated === 'string' ? `deprecated: ${t.deprecated}` : '')
