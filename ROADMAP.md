# Roadmap

Where Vela is going, in the order it will go there. Decision record 002 (`decisions/`) holds
the reasoning; this page holds the plan. Phases are effort at full-time pace, not dates. A phase
closes when its exit criteria pass, not when its time is up.

## The direction

From a six-component, zero-dependency design system to the open, agent-ready design system for
security products: one that AI coding tools build screens from, that analysts review agents
through, and that measures whether either worked.

Decisions that hold through every phase:

- Extend Vela; don't restart.
- React first, framework-agnostic later. The token file and the spec format stay the single
  source, so a second implementation can be generated, not rewritten.
- Base UI for behaviour, Vela CSS tokens for the look. No Tailwind.
- Two entry points, one playground: `@omkarux/vela` stays zero-dependency; behaviour-heavy
  components ship from `@omkarux/vela/headless` with Base UI (MIT) as an optional peer.
- Differentiator: a security-console agentic set — the components for the moment a person
  reviews, gates, overrides or audits an AI agent — plus the general agent components it needs.
- Responsive by contract: every spec states its responsive behaviour; every component section is
  screenshotted at four console widths.
- Everything public, at zero spend. GitHub Pages serves the docs and the registry.

## Phase 0 — Foundation hardening (in progress)

Make every public claim true and every input machine-strict.

Done: strict DTCG 2025.10 token source with a dark overlay and resolver, validated with
Terrazzo in CI; `DESIGN.md` as the single rules document; the Risk taxonomy as a component;
a CSS lint with no waivers; the project files a public library carries; decision records
indexed; a "Responsive behaviour" section in every spec; visual CI at four widths.

Open: docs-site routes (this page among them); Figma library hygiene (changelog, status,
deprecated, patterns and sandbox pages; no foreign libraries subscribed); the Risk Pill
Figma set; density and breakpoint tokens, deferred until the first container-query component
needs them.

## Phase 1 — Headless behaviour layer

The enterprise set a security console cannot do without, with keyboard, focus and ARIA
behaviour from Base UI and every pixel from Vela tokens: Checkbox, Radio Group, Select,
Combobox, Menu, Dialog, Popover, Tooltip, Toast, Switch, Text Area, Icon Button, Table
primitives — the list `guidelines/overview.md` already names as not in the kit. Lucide as the
icon source. A Freshness Indicator, widget Empty / No-data / Loading / Error states with a
required next action, and a Side Inspector Panel. Tabs migrates first as the proving case.
axe-core joins the Playwright suite.

Exit: every new component has a spec, tests, contrast pairs, a Figma set and a page; the core
entry still reports zero dependencies.

## Phase 2 — Agentic security components

New closed taxonomies — Verdict, Confidence band, Autonomy rung, Reversibility tier — treated
exactly like Severity, Risk and Status. Components, in priority order: Verdict Card, Action
Impact card (blast radius as a count, reversibility, rollback path), Autonomy Ladder with a
reach map, Approval Queue with a fail-closed timer, Calibrated Confidence Gate, Evidence Locker
with trusted/untrusted labels, Agent Provenance badge, Override & Teach panel, Agent Action
Ledger, Stop control with safe-state semantics, Awareness Clock (NIS2 24 h, DORA 4 h), Hand-off
card. Each spec cites the standard or research it answers. One worked console page composes
the set, synthetic data only, rendered to text without loss.

The specs are published as they pass review, before any code: see
[`guidelines/proposals/`](guidelines/proposals/README.md). Verdict Card, Action Impact Card and
Autonomy Ladder and Approval Queue are pressure-tested and published.

## Phase 2b — Console data and policy patterns

The patterns every security console repeats, rebuilt from measured lessons: a Filter Bar and
Query Builder on one grammar; Saved Views with provenance; a Stacked Distribution Bar family;
a Score Badge with its explanation and calibration; a Row State cell with a rule-hit chip; a
Reference Picker with "where used"; a Rule Builder with a dry-run impact card; a Multi-Location
Status Grid; a Review Queue and Bulk Edit sheet.

## Phase 3 — Agent delivery

A shadcn-compatible registry of universal items served from the docs site (`/r/{name}.json`,
namespace `@omkarux`, plain CSS, no Tailwind); a `prompt.md` per component; the shadcn MCP
server reading the registry, then a small Vela MCP; Code Connect mappings; the Figma library on
Figma Community under CC BY 4.0 with an MIT notice; the token sync packaged as a Figma plugin;
`spec.json` per component and a components manifest as the language-neutral contract.

## Phase 4 — Evals and drift harness

Measure whether agents build on-system from Vela, publish the number, and keep measuring.
Fixed briefs run through coding agents against the package, the package plus `DESIGN.md`, and
the registry plus MCP; token adherence, closed-prop compliance, taxonomy crossing, accessibility
and responsiveness scored; a drift report per release. Runs beside Phase 1.

## Phase 5 — Framework-agnostic delivery

A second implementation generated from `spec.json` and the token file — Web Components or a
shared state-machine core — chosen after one spike per option. Flutter and MUI bridges kept
green.

## What this roadmap does not do

No Tailwind, no CSS-in-JS. No data grid, charts library or rich text editor. No copying of any
other kit. No claim ahead of a page that proves it.
