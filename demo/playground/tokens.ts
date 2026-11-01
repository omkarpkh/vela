/**
 * The token file, read for the component page's Tokens tab: every token's type, its value in each
 * theme (the same alias walk the CSS makes, so the tab shows what the browser resolves) and its
 * Figma name. Moved out of Playground.tsx in slice 2 of the playground uplift.
 */
import tokensJson from '../../tokens/vela.tokens.json'
import darkJson from '../../tokens/vela.dark.tokens.json'

export type Mode = 'light' | 'dark'

// DTCG 2025.10: colours are { colorSpace, components, hex } objects, aliases are full paths
// ({primitives.grey-700}), the vendor data sits under the reverse-domain key, and the dark
// values live in tokens/vela.dark.tokens.json — the overlay tokens/vela.resolver.json applies.
const VENDOR = 'com.omkarux.vela'
type Tok = { $type: string; $value: unknown; $extensions?: { [VENDOR]?: { figma?: string } } }
const ALL: Record<string, Tok> = {}
for (const [g, toks] of Object.entries(tokensJson as Record<string, unknown>))
  if (!g.startsWith('$')) for (const [n, t] of Object.entries(toks as Record<string, Tok>)) if (!n.startsWith('$')) ALL[n] = t
const DARK: Record<string, unknown> = {}
for (const [g, toks] of Object.entries(darkJson as Record<string, unknown>))
  if (!g.startsWith('$')) for (const [n, t] of Object.entries(toks as Record<string, { $value?: unknown }>)) if (!n.startsWith('$')) DARK[n] = t.$value

/** Every token, as the CSS names it. */
export const KNOWN = Object.keys(ALL).map((n) => `--vela-${n}`)

const bare = (name: string) => name.replace(/^--vela-/, '')

/** The value the browser resolves for a token in a theme. */
export function resolve(name: string, mode: Mode): string {
  const n = bare(name)
  const t = ALL[n]
  if (!t) return '?'
  const v = mode === 'dark' && n in DARK ? DARK[n] : t.$value
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return resolve(v.slice(1, -1).split('.').pop()!, mode)
  if (t.$type === 'color') { const c = v as { components: number[]; hex?: string }; return c.hex ?? `#${c.components.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}` }
  if (t.$type === 'dimension') { const d = v as { value: number; unit: string }; return `${d.value}${d.unit}` }
  if (t.$type === 'duration') { const d = v as { value: number; unit: string }; return `${d.value}${d.unit}` }
  if (t.$type === 'cubicBezier') return `cubic-bezier(${(v as number[]).join(', ')})`
  return String(v)
}

/** The token's Figma variable name, or "none" when it has none. */
export const figmaOf = (name: string) => ALL[bare(name)]?.$extensions?.[VENDOR]?.figma ?? 'none'
export const typeOf = (name: string) => ALL[bare(name)]?.$type
export const isColor = (name: string) => typeOf(name) === 'color'
export const exists = (name: string) => bare(name) in ALL

/** The Tokens tab's groups, by what a token sets. */
export type TokenKind = 'colour' | 'size' | 'motion' | 'other'
export function kindOf(name: string): TokenKind {
  const t = typeOf(name)
  if (t === 'color') return 'colour'
  if (t === 'duration' || t === 'cubicBezier' || /-(duration|ease|delay)-/.test(name)) return 'motion'
  if (t === 'dimension' && !/-text-|font/.test(name)) return 'size'
  return 'other'
}

/** The five states the Tokens tab can show, and the word a token's name carries for each. */
export const STATES = [
  { value: 'rest', label: 'Rest', word: '' },
  { value: 'hover', label: 'Hover', word: 'hover' },
  { value: 'pressed', label: 'Pressed', word: 'active' },
  { value: 'focus', label: 'Focus', word: 'focus' },
  { value: 'disabled', label: 'Disabled', word: 'disabled' },
] as const
export type TokenState = (typeof STATES)[number]['value']

/**
 * The token a part takes in a state, by the naming rule `--vela-<role>-<context>-<state>`:
 * `--vela-btn-primary-bg` on hover is `--vela-btn-primary-hover-bg`, when that token exists.
 */
export function inState(token: string, state: TokenState): string | null {
  const word = STATES.find((s) => s.value === state)?.word
  if (!word || !token.startsWith('--vela-')) return null
  const parts = token.split('-')
  for (let at = parts.length - 1; at > 2; at--) {
    const candidate = [...parts.slice(0, at), word, ...parts.slice(at)].join('-')
    if (exists(candidate)) return candidate
  }
  const tail = `${token}-${word}`
  return exists(tail) ? tail : null
}
