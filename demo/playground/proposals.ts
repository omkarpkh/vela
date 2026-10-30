/**
 * The Proposal pages' data (playground spec, section 7, "Proposal"; P1 request, item 3), read from
 * the same files the repository ships: guidelines/proposals/README.md is the index, and each spec
 * is loaded only when its page opens, so eight long specs do not ride in the main bundle.
 *
 * A proposal is a written spec, not a built component: its page has no stage, no controls, no
 * snippet and no install. It carries the spec's summary, its Responsive behaviour table, its Props
 * tables (read-only), and what it waits on, all read from the spec.
 */
import readme from '../../guidelines/proposals/README.md?raw'

export interface Proposal {
  id: string
  name: string
  file: string
  /** "What it is", from the README's table. */
  what: string
  /** A pull request or discussion to follow, where one exists. None does yet. */
  discuss?: string
  /** The Figma set's node id, where one exists. None does yet. */
  figma?: string
}

// | [Verdict Card](verdict-card.md) | One agent verdict on one case, … | 28 (22) | pressure-tested |
export const PROPOSALS: Proposal[] = [...readme.matchAll(/^\|\s*\[([^\]]+)\]\(([\w-]+)\.md\)\s*\|\s*([^|]+?)\s*\|/gm)].map((m) => ({
  id: m[2],
  name: m[1],
  file: `${m[2]}.md`,
  what: m[3],
}))

const LOADERS = import.meta.glob<string>(['../../guidelines/proposals/*.md', '!../../guidelines/proposals/README.md'], { query: '?raw', import: 'default' })

export function loadProposal(id: string): Promise<string> | undefined {
  return LOADERS[`../../guidelines/proposals/${id}.md`]?.()
}
