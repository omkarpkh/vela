/**
 * IP addresses and CIDR ranges (filter-grammar.md, `grammar-domain-boundary` and
 * `grammar-ranges-valid`). IPv4 is four decimal octets with no leading zeros; IPv6 is RFC 4291
 * text with an optional IPv4 tail and no zone. An IPv4-mapped IPv6 address (`::ffff:10.0.0.5`) is
 * written and matched as IPv4. IPv6 is written as RFC 5952 says: lower case, the longest run of
 * zero groups as `::`.
 */
import { shownShort } from './hidden'

export type Ip = { family: 4 | 6; bytes: number[] }
export type Cidr = { ip: Ip; prefix: number }

function parseV4(s: string): number[] | null {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  const out: number[] = []
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null
    const n = Number(p)
    if (n > 255) return null
    out.push(n)
  }
  return out
}

function parseV6(s: string): number[] | null {
  if (!/^[0-9A-Fa-f:.]+$/.test(s)) return null
  const halves = s.split('::')
  if (halves.length > 2) return null
  const groups = (h: string): number[] | null => {
    if (h === '') return []
    const out: number[] = []
    const parts = h.split(':')
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (i === parts.length - 1 && p.includes('.')) {
        const v4 = parseV4(p)
        if (!v4) return null
        out.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3])
      } else {
        if (!/^[0-9A-Fa-f]{1,4}$/.test(p)) return null
        out.push(parseInt(p, 16))
      }
    }
    return out
  }
  const head = groups(halves[0])
  const tail = halves.length === 2 ? groups(halves[1]) : []
  if (!head || !tail) return null
  // An IPv4 tail may only end the address.
  if (halves.length === 2 && halves[0].includes('.')) return null
  let all: number[]
  if (halves.length === 2) {
    if (head.length + tail.length > 7) return null
    all = [...head, ...Array(8 - head.length - tail.length).fill(0), ...tail]
  } else {
    if (head.length !== 8) return null
    all = head
  }
  return all.flatMap((g) => [g >> 8, g & 0xff])
}

/** An address exactly as written, IPv4-mapped IPv6 still IPv6. */
function parseRaw(s: string): Ip | null {
  const v4 = parseV4(s)
  if (v4) return { family: 4, bytes: v4 }
  const v6 = parseV6(s)
  return v6 ? { family: 6, bytes: v6 } : null
}

const isMapped = (ip: Ip) => ip.family === 6 && ip.bytes.slice(0, 10).every((b) => b === 0) && ip.bytes[10] === 0xff && ip.bytes[11] === 0xff
const unmap = (ip: Ip): Ip => (isMapped(ip) ? { family: 4, bytes: ip.bytes.slice(12) } : ip)

/** An address as the grammar matches it: IPv4-mapped IPv6 as IPv4. */
export const parseIp = (s: string): Ip | null => {
  const ip = parseRaw(s)
  return ip ? unmap(ip) : null
}

export function formatIp(ip: Ip): string {
  if (ip.family === 4) return ip.bytes.join('.')
  const g = Array.from({ length: 8 }, (_, i) => (ip.bytes[2 * i] << 8) | ip.bytes[2 * i + 1])
  let best = -1, bestLen = 0
  for (let i = 0; i < 8;) {
    if (g[i] !== 0) { i++; continue }
    let j = i
    while (j < 8 && g[j] === 0) j++
    if (j - i > bestLen) { best = i; bestLen = j - i }
    i = j
  }
  const hexes = g.map((x) => x.toString(16))
  if (bestLen < 2) return hexes.join(':')
  return `${hexes.slice(0, best).join(':')}::${hexes.slice(best + bestLen).join(':')}`
}

export type IpResult = { ok: true; value: string; ip: Ip } | { ok: false; message: string }
export type CidrResult = { ok: true; value: string; cidr: Cidr } | { ok: false; message: string }

export function normaliseIp(raw: string): IpResult {
  const ip = parseIp(raw)
  return ip ? { ok: true, value: formatIp(ip), ip } : { ok: false, message: `\`${shownShort(raw)}\` is not an IP address.` }
}

function masked(ip: Ip, prefix: number): Ip {
  return { family: ip.family, bytes: ip.bytes.map((b, i) => {
    const bits = Math.max(0, Math.min(8, prefix - 8 * i))
    return b & ((0xff << (8 - bits)) & 0xff)
  }) }
}

const same = (a: Ip, b: Ip) => a.family === b.family && a.bytes.every((x, i) => x === b.bytes[i])

/** A CIDR range, normalised to its network address; `10.0.0.5/8` is an error that names `10.0.0.0/8`. */
export function normaliseCidr(raw: string): CidrResult {
  const bad = { ok: false as const, message: `\`${shownShort(raw)}\` is not a range. Write a network and a prefix length, like 10.0.0.0/8.` }
  const m = raw.match(/^([^/]+)\/(0|[1-9]\d{0,2})$/)
  if (!m) return bad
  const ip = parseRaw(m[1])
  let prefix = Number(m[2])
  if (!ip || prefix > (ip.family === 4 ? 32 : 128)) return bad
  const net = masked(ip, prefix)
  if (!same(net, ip)) return { ok: false, message: `\`${shownShort(raw)}\` is not a network address. Did you mean ${formatIp(net)}/${prefix}?` }
  let cidr: Cidr = { ip: net, prefix }
  // An IPv4-mapped network, /96 or longer, is an IPv4 network.
  if (isMapped(net) && prefix >= 96) { prefix -= 96; cidr = { ip: unmap(net), prefix } }
  return { ok: true, value: `${formatIp(cidr.ip)}/${cidr.prefix}`, cidr }
}

export const inRange = (ip: Ip, cidr: Cidr) => ip.family === cidr.ip.family && same(masked(ip, cidr.prefix), cidr.ip)

export function compareIp(a: Ip, b: Ip): number {
  if (a.family !== b.family) return a.family - b.family
  for (let i = 0; i < a.bytes.length; i++) if (a.bytes[i] !== b.bytes[i]) return a.bytes[i] - b.bytes[i]
  return 0
}
