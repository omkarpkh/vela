/**
 * The install line, generated at build time from the package's own manifest (playground spec,
 * section 4; P1 request, item 2). It is not hand-written per component, so it cannot drift from
 * what npm will actually do.
 *
 * A core component needs the package alone. A headless component also needs every optional peer:
 * npm installs a package's ordinary peers for you, but never its optional ones
 * (peerDependenciesMeta: { optional: true }), so the command names them, and one line says why.
 */
import { name, peerDependenciesMeta } from '../../package.json'

export type Entry = '@omkarux/vela' | '@omkarux/vela/headless'

/** What a person calls each optional peer in a sentence. */
const SPOKEN: Record<string, string> = { '@base-ui/react': 'Base UI' }

/** The optional peers, read from peerDependenciesMeta. */
export const OPTIONAL_PEERS: string[] = Object.entries(peerDependenciesMeta as Record<string, { optional?: boolean }>)
  .filter(([, meta]) => meta.optional === true)
  .map(([peer]) => peer)

export interface Install {
  command: string
  /** Why the command names more than the package; absent for a core component. */
  note?: string
}

export function installFor(entry: Entry): Install {
  const peers = entry.endsWith('/headless') ? OPTIONAL_PEERS : []
  const command = ['npm i', name, ...peers].join(' ')
  if (peers.length === 0) return { command }
  const spoken = peers.map((p) => SPOKEN[p] ?? p)
  const subject = spoken.length === 1 ? `${spoken[0]} is an optional peer` : `${spoken.join(' and ')} are optional peers`
  return { command, note: `${subject}, and npm doesn't install optional peers for you.` }
}
