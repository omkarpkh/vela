/**
 * Every number and list the Overview states, counted from the files that hold them (the Overview
 * brief, section 3: no hand-typed numbers). The page marks each value it shows from here with
 * `data-generated`, and src/styles/site-overview.test.tsx fails if any other digit appears.
 *
 *   rules      every `[[rule: id | level]]` tag in the built specs, as the nav and the Rules tab
 *              count them (rulesOf over the catalog); the same 212 `npm run rules:check` prints,
 *              which a unit test checks. Automated: compiler, runtime and browser; review: convention.
 *   checks     demo/checks.json `total`, written by `npm run checks` and diffed in `verify`.
 *   pairs      PAIRS.length in scripts/contrast-core.mjs, counted at build time.
 *   deps       package.json `dependencies`, counted at build time (0 when there are none).
 *   built      the components in the catalog, one per spec in guidelines/components/.
 *   specified  the proposals in guidelines/proposals/README.md, as the site's PROPOSALS lists them.
 *   taxonomies the kit's own Severity, Status and Risk types: each list below must hold every
 *              value of its type, or this file does not compile.
 *   release    package.json's version, its date and its highlights from CHANGELOG.md.
 *   stamp      the commit and the date the site was built (vite.demo.config.ts), as the Rules tab says them.
 */
import type { Severity, Status, Risk } from '../../src'
import { CATALOG } from '../playground/catalog'
import { PROPOSALS } from '../playground/proposals'
import { rulesOf, dateWords } from '../playground/facts'
import { FOUNDATIONS, PATTERNS } from '../nav'
import { LINKS } from '../links'
import { COMMIT } from '../shell/ErrorBoundary'
import checks from '../checks.json'
import { PAIRS, PAIRS_LINE, DEPENDENCIES, RELEASE } from 'virtual:vela-site-facts'

/**
 * A list that holds every value of `T`: a missing value is a compile error, and so is a value that
 * isn't one of the type's. So the count shown is the type's own size, not a number typed beside it.
 */
const every = <T extends string>() =>
  <const A extends readonly T[]>(values: A & ([T] extends [A[number]] ? unknown : 'is missing a value')) => values

export const SEVERITIES = every<Severity>()(['success', 'info', 'warning', 'minor', 'major', 'critical'])
export const STATUSES = every<Status>()(['unknown', 'healthy', 'warning', 'medium', 'unhealthy'])
export const RISKS = every<Risk>()(['low', 'medium', 'high'])

/**
 * The Status Indicator's own words for each status (its text alternative when it has no label).
 * The page shows them as the visible label, so the word on the page is the word a screen reader
 * hears from a bare dot; a unit test renders the component and holds the two together.
 */
export const STATUS_WORDS: Record<Status, string> = {
  unknown: 'Status unknown',
  healthy: 'Healthy',
  warning: 'Warning',
  medium: 'Degraded',
  unhealthy: 'Unhealthy',
}

const tags = CATALOG.map((e) => rulesOf(e.spec))
const count = (level: string) => tags.reduce((n, r) => n + (r.byLevel.find((l) => l.level === level)?.count ?? 0), 0)

export const RULES = {
  total: tags.reduce((n, r) => n + r.total, 0),
  automated: count('compiler') + count('runtime') + count('browser'),
  review: count('convention'),
}

/** The ref GitHub links open: the built commit when it is one, else main. */
export const REF = /^[0-9a-f]{7,40}$/.test(COMMIT) ? COMMIT : 'main'

/** "Colour, typography, spacing, sizing, radius and motion": the Foundations pages, in nav order. */
const listWords = (words: string[]) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`)
export const FOUNDATIONS_LINE = (() => {
  const line = listWords(FOUNDATIONS.map((f) => f.title.toLowerCase()))
  return line.charAt(0).toUpperCase() + line.slice(1)
})()

export const FACTS = {
  checks: checks.total,
  pairs: PAIRS,
  deps: DEPENDENCIES,
  built: CATALOG.length,
  specified: PROPOSALS.length,
}

export const RELEASED = { version: RELEASE.version, date: dateWords(RELEASE.date ?? undefined), highlights: RELEASE.highlights }

/** "Counted at commit 1a2b3c4, 1 Nov 2026.", from the build; a build that knows neither says so. */
export function stampWords(commit: string, built: string | undefined): string {
  const at = /^[0-9a-f]{7,40}$/.test(commit) ? `commit ${commit}` : 'an unknown commit'
  const day = dateWords(built)
  return `Counted at ${at}${day ? `, ${day}` : ''}.`
}
export const STAMP = stampWords(COMMIT, import.meta.env.VITE_VELA_BUILT)

const GH = (path: string) => `${LINKS.github}/blob/${REF}/${path}`

/** Where each link on the page goes. One place, so the page and its tests agree. */
export const TARGETS = {
  // The site has no list of components but the Status page, which the "not found" page already
  // sends people to as "Browse all components".
  components: '#/status',
  // The site has no index of every rule: each component's Rules tab lists its own, grouped by level,
  // each with its proof. The first component's is the nearest real page.
  rules: `#/components/${CATALOG[0].id}/rules`,
  how: '#/how',
  pairs: GH(`scripts/contrast-core.mjs#L${PAIRS_LINE}`),
  packageJson: GH('package.json'),
  status: '#/status',
  patterns: `#/patterns/${PATTERNS[0].id}`,
  foundations: `#/foundations/${FOUNDATIONS[0].id}`,
  states: '#/states',
  changelog: '#/changelog',
  roadmap: '#/roadmap',
  governance: `${LINKS.github}/blob/main/GOVERNANCE.md`,
  licence: `${LINKS.github}/blob/main/LICENSE`,
} as const
