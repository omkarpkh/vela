# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-09-10

### Added
- **A single token source.** `tokens/vela.tokens.json` (W3C Design Tokens 2025.10) now holds every
  value once. `src/styles/tokens.*.css` are generated from it and were proven byte-identical to the
  hand-written files before the switch. `npm run tokens:check` runs in the gate and fails if the
  CSS is edited directly.
- **Figma sync.** `npm run tokens:figma` generates a Plugin API script that creates-or-updates every
  variable in the library by name — values per mode, aliases, scopes, descriptions and the
  `var(--vela-*)` code syntax. Idempotent: 0 created / 223 updated on its first run against the live
  file. This closes the gap where the Figma library was a one-time export that would drift from
  the code. The REST route was not an option: writing variables needs an Enterprise plan.
- The JSON ships in the package as `@omkarux/vela/tokens.json` for other stacks and tools
  (Style Dictionary, Tokens Studio, Terrazzo all read the format).
- 5 tests guard the pipeline: every CSS declaration has a source token and vice versa, no
  dangling alias, primitives hold raw values and semantics hold aliases only, every token carries
  its Figma name, and regenerating the CSS changes nothing.

## [0.4.0] — 2026-09-10

### Added
- **Guidance for using the system on a stack that isn't React.** `guidelines/setup.md` and the
  README now state plainly which layers travel and which don't: the tokens and the specs port
  unchanged, the components do not. `npm i @omkarux/vela` followed by importing only
  `tokens.css` gives an Angular, Vue, Svelte or server-rendered app the full palette, both
  themes and the whole scale with no React in its dependency tree.
- `llms.txt` now tells a coding agent the specs are implementation-independent, so an agent
  generating Angular follows every rule here and translates only the syntax.

### Changed
- Stopped describing this as a "React component kit" in the README, the npm description and
  `llms.txt`. It was accurate about the package and misleading about the method — React is the
  boundary of *this implementation*, not of the approach, and conflating the two undersells the
  contract, which is the part that actually ports.

## [0.3.1] — 2026-09-10

### Fixed
- **The release workflow could never publish.** It triggered only on pushes to `main` and on pull
  requests, while the publish job gated on `refs/tags/v*` — so a tag push matched no trigger and
  the job never ran. Tags are now listed explicitly.
- Trusted publishing requires npm >= 11.5.1; Node 22 ships npm 10.x. The publish job now upgrades
  npm first. Without it npm falls back to looking for a token and fails with `ENEEDAUTH`, which
  reads like a credentials problem rather than a version one.

- **`scripts/verify-pack.mjs` crashed on `npm pack --json`.** It assumed an array and indexed
  `[0].filename` directly, which threw a bare `TypeError` when npm returned a different shape from
  inside a lifecycle script. It now parses defensively and reports the actual output.
- The publish job no longer re-runs the full gate. `prepublishOnly` fired inside `npm publish`,
  repeating work the `verify` job had already done and putting a second failure surface inside the
  publish step — which is what broke the first tagged release. The gate runs once, in `verify`.

This release exists to prove the pipeline end to end. The tarball contents are unchanged from
0.3.0 — but this one was built and published by CI from a git tag, with a provenance attestation
tying it to the commit, rather than by hand from a laptop.

## [0.3.0] — 2026-09-10

### Added
- **A `## Figma mapping` section in every component spec.** The contract now works in both
  directions: each spec states which Figma variant property corresponds to which code prop, and —
  more usefully — which behaviour has **no Figma expression at all** (Tabs' roving tabindex,
  Contextual Alert's live-region politeness, Button's `disabled` state).
- `llms.txt` now points at the companion Figma library and states the relationship plainly: the
  library is *compiled from* this contract, not the source of it.

### Companion Figma library
`Vela Design System` — 223 variables across 4 collections mirroring the CSS architecture 1:1
(Primitives / Color with Light+Dark / Sizing / Typography), 15 text styles, and 6 component sets
totalling 62 variants. Every variable carries its `var(--vela-*)` name as Dev Mode code syntax.

Three token gaps the Figma build surfaced, recorded rather than hidden:
- Toggle track and knob geometry is literal in both CSS and Figma, not tokenised.
- Status Indicator dot diameters (10px / 8px) are likewise literal.
- Code Connect could not be wired: it requires an Organization or Enterprise Figma plan. The
  component API is written into each component's Figma description instead, which surfaces in
  Inspect on any plan.

## [0.2.0] — 2026-09-09

### Changed
- **Re-hued the entire primitive palette** — 52 raw values replaced. Vela now runs a deep
  sea-teal brand (`--vela-primary-500: #0a6c7d`) on a cool slate neutral ramp.

  Nothing else moved. Not one semantic mapping, not one component file, not one test. That is
  the property the two-layer architecture exists to provide, and this release is the proof:
  a complete visual re-skin is a diff confined to the primitive block.

  All 76 contrast pairs passed on the first run of the new palette in both themes.

### Fixed
- Corrected the asserted-pair count in the docs from 78 to 76 (38 pairs × 2 themes).

### Note on versioning
Every colour in the system changed, so this is a minor bump rather than a patch even though no
API changed — under 0.x, a visual break is still a break. Consumers pinned to `0.1.x` keep the
old palette.

## [0.1.0] — 2026-09-09

Initial release.

### Added
- **Components:** Button, Toggle, Input, ContextualAlert, StatusIndicator, Tabs.
- **Tokens:** 239 CSS custom properties in two layers (primitives → semantics), covering
  colour, spacing, sizing, radius and typography.
- **Themes:** light and dark. The OS preference applies by default; `data-theme="light"` or
  `data-theme="dark"` on the root element overrides it in either direction.
- **Taxonomies:** severity (6 levels), risk (3 levels) and status (5 states) as separate,
  non-interchangeable token families, each with a complete role row.
- **Type-enforced constraints:** `ButtonProps` is a discriminated union; `Toggle` requires a
  `label`; `Tabs.List` requires an `aria-label`; every variant/size/severity/status set is
  closed.
- **`guidelines/`** shipped inside the package — per-component specifications with closed
  prop tables, token bindings, hard constraints and anti-patterns, plus `llms.txt` as an
  agent entry point.
- **Contrast audit** (`npm run contrast`) covering 76 pairs across both themes, backed by
  tests so a regression fails CI.
- **Publish gate** (`npm run verify`) that packs the tarball, installs it into a throwaway
  app, and asserts both that valid usage typechecks and that eight documented rule
  violations are rejected by the compiler.

### Accessibility decisions worth recording
- `--vela-btn-destructive-bg` binds `red-700`, not `red-500`: red-500 behind a white label is
  3.93:1 and fails AA.
- `--vela-text-de-emphasized` binds `grey-600`, not `grey-500` (3.04:1 on white).
- `--vela-text-severity-success` and `--vela-text-risk-low` bind `green-800`, not `green-700`.
- Status dots bind `yellow-700` and `orange-600` rather than the 500s to clear 3:1 on white.
- `Button` keeps its label and stays focusable while `loading`, setting `aria-busy` and
  ignoring clicks, rather than swapping the label out or disabling itself.
