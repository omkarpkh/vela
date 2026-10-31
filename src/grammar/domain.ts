/**
 * Domains (filter-grammar.md, `grammar-domain-boundary`): one host name, normalised to lower case,
 * punycode and no trailing dot, and matched on label boundaries.
 *
 * The ASCII form comes from `new URL('http://' + host).hostname`, which does the IDNA mapping the
 * same way in Node and in the browser. The Unicode form, for the readback, comes from the RFC 3492
 * decoder below, written here: the core imports nothing.
 */
import { hasHidden, shownShort } from './hidden'

export type DomainResult = { ok: true; ascii: string } | { ok: false; message: string }

const LABEL = /^[a-z0-9_-]+$/
const IPV4ISH = /^\d+\.\d+\.\d+\.\d+$/

/** A host name as the grammar stores it, or the plain words for why it isn't one. */
export function normaliseDomain(raw: string): DomainResult {
  const at = `\`${shownShort(raw)}\``
  if (hasHidden(raw)) return { ok: false, message: `${at} has a hidden character, which a host name can't contain.` }
  if (raw === '') return { ok: false, message: 'A host name can\'t be empty.' }
  for (const c of raw) if (c.charCodeAt(0) < 0x80 && !/[A-Za-z0-9._-]/.test(c)) return { ok: false, message: `${at} is not a host name.` }
  let host: string
  try { host = new URL(`http://${raw}`).hostname } catch { return { ok: false, message: `${at} is not a host name.` } }
  if (host.endsWith('.')) host = host.slice(0, -1)
  if (host.startsWith('[') || IPV4ISH.test(host)) return { ok: false, message: `${at} is an IP address, not a host name.` }
  for (const label of host.split('.')) {
    if (label === '') return { ok: false, message: `${at} has an empty label.` }
    if (label.length > 63) return { ok: false, message: `${at} has a label longer than 63 characters.` }
    if (!LABEL.test(label)) return { ok: false, message: `${at} is not a host name.` }
  }
  if (host.length > 253) return { ok: false, message: `${at} is longer than 253 characters.` }
  return { ok: true, ascii: host }
}

/** `mail.northwind.example` is a subdomain of `northwind.example`; `evilnorthwind.example` is not. */
export const isSubdomainOf = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

/** The Unicode form of an ASCII host name, or `null` when it is the same. */
export function unicodeDomain(ascii: string): string | null {
  const unicode = ascii.split('.').map((l) => (l.startsWith('xn--') ? punycodeDecode(l.slice(4)) ?? l : l)).join('.')
  return unicode === ascii ? null : unicode
}

// ---------- RFC 3492, decoding only ----------
const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128, MAXINT = 0x7fffffff

function adapt(delta: number, points: number, first: boolean): number {
  delta = first ? Math.floor(delta / DAMP) : delta >> 1
  delta += Math.floor(delta / points)
  let k = 0
  while (delta > ((BASE - TMIN) * TMAX) >> 1) { delta = Math.floor(delta / (BASE - TMIN)); k += BASE }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW))
}

function digitOf(c: number): number {
  if (c >= 0x30 && c <= 0x39) return c - 22 // 0–9 are 26–35
  if (c >= 0x41 && c <= 0x5a) return c - 0x41 // A–Z
  if (c >= 0x61 && c <= 0x7a) return c - 0x61 // a–z
  return BASE
}

/** Decodes one label's punycode (without its `xn--`). `null` when it isn't valid punycode. */
export function punycodeDecode(input: string): string | null {
  const out: number[] = []
  const b = Math.max(0, input.lastIndexOf('-'))
  for (let j = 0; j < b; j++) {
    const c = input.charCodeAt(j)
    if (c >= 0x80) return null
    out.push(c)
  }
  let n = INITIAL_N, i = 0, bias = INITIAL_BIAS
  for (let at = b > 0 ? b + 1 : 0; at < input.length;) {
    const oldi = i
    let w = 1
    for (let k = BASE; ; k += BASE) {
      if (at >= input.length) return null
      const digit = digitOf(input.charCodeAt(at++))
      if (digit >= BASE || digit > Math.floor((MAXINT - i) / w)) return null
      i += digit * w
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias
      if (digit < t) break
      if (w > Math.floor(MAXINT / (BASE - t))) return null
      w *= BASE - t
    }
    const points = out.length + 1
    bias = adapt(i - oldi, points, oldi === 0)
    if (Math.floor(i / points) > MAXINT - n) return null
    n += Math.floor(i / points)
    i %= points
    if (n < 0x80 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return null
    out.splice(i++, 0, n)
  }
  return String.fromCodePoint(...out)
}
