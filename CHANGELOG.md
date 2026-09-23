# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **A press no longer swallows clicks near a button's edge.** `:active` scales the button to
  0.97 about its centre, which pulls both edges inward while the pointer is down — 1.5px a side
  at 102px wide, 4.8px at 320px. A press that landed 2px inside an edge came back up where the
  button no longer was, so the click retargeted to the parent and was lost. Measured, not
  theorised: in a browser, **0 of 2 edge presses on a 320px button fired**. The fix is a
  counter-scaled `::after` (0.97 × 1.0309278 = 1) that holds the original border box for the
  length of the press. Pure CSS and no handler, so every target and every framework port gets
  it. Now `tests/e2e/playground.spec.ts` asserts it, under the new `browser` enforcement level.
  The suite could not have caught this before: `.click()` dispatches pointerdown and pointerup
  in one tick, so the press never advances.

### Added
- **`--vela-duration-instant` (70ms)** — a third motion duration, for a press landing. Under the
  ~85ms where a delay begins to read as lag. Reaches all five targets: CSS, Flutter (`VelaMotion
  .durationInstant`), the MUI theme, Figma's Motion collection and the docs.
- **A `browser` enforcement level in the rule-coverage gate.** A rule enforced by the
  implementation but provable only in a real browser, because it depends on layout or
  hit-testing. The press rule is the first: jsdom does no hit-testing, and a screenshot cannot
  tell a fired click from a swallowed one, so neither `runtime` nor a visual baseline could
  prove it. `check-rules.mjs` now requires a Playwright spec carrying the rule id.

### Changed
- **The press is asymmetric.** In at `--vela-duration-instant` (70ms), out at
  `--vela-duration-base` (180ms) — previously 120ms both ways. Arrival is information and wants
  to be immediate; release is resolution and can settle. This extends motion rule 2, which
  already asymmetric-timed hover, to the press.
- **A keyboard press is acknowledged.** `:focus-visible` excludes keyboard activation from the
  scale, which left Space and Enter as the one input that got no feedback at all. The focus ring
  now collapses onto the edge (`outline-offset: 0`) — a state change with no duration, so
  "from the keyboard, nothing animates" still holds.

### Changed
- **The Button playground stops offering a control that does nothing.** `type` moved from the
  props panel to "Also in the API": `submit` only means something inside a `<form>`, which the
  playground does not have, so the control was a switch with no consequence on the stage. New
  registry field `noControl` for exactly that case — documented, not demonstrated. Demo only.

## [0.11.0] — 2026-09-22

### Changed — breaking (types only)

- **`Tabs` and `Toggle` now type-enforce "controlled or uncontrolled, never both."** `TabsProps`
  and `ToggleProps` are discriminated unions instead of flat interfaces:
  - `<Tabs value=… defaultValue=…>` and `<Toggle checked defaultChecked>` are **type errors**. They
    always were defects — the guidelines have forbidden them since 0.9.0 — but the types allowed them.
  - **`Tabs` no longer requires `defaultValue`.** It was declared required, so a purely controlled
    `<Tabs value=… onValueChange=…>` did not compile: the type forced the very state the spec
    forbids. Controlled usage now type-checks, and `defaultValue` is required only when `value` is absent.
  - Runtime behaviour is unchanged in both components. Nothing to migrate unless your code passed
    both props, in which case delete the one you were not reading.

### Added
- **How it is made** page (`#/how`): the token file, its five generated targets with a link to each, and
  the automated-check count. The count is generated from the test runners (`npm run checks`) and diffed in
  `verify`, like the generated CSS, so the page cannot go stale.
- Links to the public Figma library file: the site's top bar, every component page (header and
  Figma tab), the README and `llms.txt`. The registry can carry a per-component node id for a deep link.
- **Every documented rule now has to carry a proof.** Each bullet under `## Hard constraints`
  is tagged `[[rule: id | compiler|runtime|convention]]`, and `npm run rules:check` fails the
  build when a `compiler` rule has no fixture in `verify-pack.mjs` (or has one the types do not
  reject), when a `runtime` rule has no unit test naming it, when a fixture names no rule, or
  when a new bullet arrives untagged. It caught two: `Tabs` and `Toggle` documented "controlled
  and uncontrolled are exclusive" and the types allowed both — `TabsProps` went further and
  *required* `defaultValue`, so a controlled `<Tabs>` was a type error. Both are discriminated
  unions now; the alert's decorative-icon rule got the test it never had.

### Changed
- **The Figma motion tokens use Figma's own types.** `duration/fast` and `duration/base` are now
  **TIMING** variables (Figma keeps timing in seconds: 0.12 and 0.18) and `easing/standard` an **EASING**
  variable holding the cubic-bezier, replacing the FLOAT-milliseconds and STRING stand-ins of 0.10.0.
  A Figma Motion timeline can bind them; a prototype transition still cannot, and `motion.md` now says
  so plainly instead of promising a stamp the builder never made. The sync recreates a variable whose
  type changed (a resolved type cannot be edited) and the drift check reads timing in seconds and the
  bezier as four numbers, within float32 tolerance.

## [0.10.0] — 2026-09-13

### Added
- **The demo is a site, and it is public.** A collapsible left nav (Overview · Foundations · Components ·
  Demos, generated from the guideline files and the component registry, with a filter), hash routes so
  every page has a link, foundation docs rendered from their markdown, and a re-laid component page: stage
  with a light-and-dark / light / dark switch and reduced motion, a sticky props panel, and the contract
  below with a Copy button. Deployed to GitHub Pages from `main` after every gate passes:
  https://omkarpkh.github.io/vela/. Behavioural tests cover the constraints, the navigation and the filter.
- **Button motion, feedback only.** Hover colours settle in at `duration-fast` and out at `duration-base`
  (no flicker across a toolbar); a pointer press scales to 0.97 (keyboard activation, busy, disabled and
  text-link excluded); the loading spinner materialises before it spins. Hover rules are gated by
  `@media (hover: hover)`. Resting styles are pixel-identical; every visual baseline passes unchanged.
- **Motion foundation.** `guidelines/foundations/motion.md`: the frequency gate, the three motion tokens,
  six rules; the Button spec gains a Motion section naming what moves, why, and what deliberately does not.
- **Playground (demo).** A third view: controls generated from each spec's Props table, the component
  rendered light and dark side by side (with a reduced-motion switch), and the contract beside it —
  the JSX for the current state, every token the spec names resolved for both themes with its Figma
  name (the row bound for the current variant highlighted), the rules, and the Figma mapping. Nothing
  is listed twice; the spec is parsed. A test holds every spec to the parser's shape and fails if a spec
  names a token that does not exist.
- **Subtree theming.** `data-theme` now works on any element, not only the root: light tokens are
  declared on `:root` and on `[data-theme="light"]`, the explicit dark block on any `[data-theme="dark"]`.
  A dark sidebar in a light app costs one attribute.
- **Motion is its own token group and a Figma collection.** `duration-fast`, `duration-base` and
  `ease-standard` move from `sizing` to `motion` in the source; the Dart target gains `VelaMotion`; the
  Figma sync creates a **Motion** collection (FLOAT milliseconds, STRING curve, no scopes — they
  document, they do not bind) and the read-back drift check covers it. `npm run tokens:figma -- --only
  Motion` limits a sync to one collection.
- **The MUI bridge carries timing.** `transitions.duration` and `transitions.easing` are generated from the
  motion tokens, so an adopted product moves on Vela's clock; its ripple stays, because the kind of feedback
  is component behaviour.

## [0.9.0] — 2026-09-12

### Added
- **Material UI theme bridge — "adopt without rewrite".** `npm run tokens` now also emits
  `bridges/vela.mui-theme.json`: a `ThemeOptions` object per mode (38 colour roles incl. Alert surfaces, 13 type
  variants mapped by usage, radius, two component defaults) with every value resolved from `tokens/vela.tokens.json`. A product
  already built on MUI passes it to `createTheme()` and takes the family look without a component
  being touched. Ships as `@omkarux/vela/mui-theme.json` — plain JSON, so the package still has zero
  runtime dependencies. `$sources` records the token behind every colour; tests re-resolve all of
  them per mode, reject any hex that is not a token value, check the type ramp, and prove
  regeneration is a no-op.
- Demo: a second view, **Adopt without rewrite** — a front-desk screen built on stock Material UI,
  rendered twice from identical component code: default theme on the left, the generated Vela theme
  on the right, in both light and dark. It also shows the limit: Material has one colour vocabulary
  where Vela keeps Severity and Status apart, and that is a component-level change — the reason
  shared components are step two, not step one.

## [0.8.0] — 2026-09-12

### Added
- **Flutter target.** `npm run tokens` now also emits `flutter/lib/vela_tokens.dart` from the same
  `tokens/vela.tokens.json`: primitives as `Color`s, every semantic as a field of a `VelaColors`
  `ThemeExtension` with `light` and `dark` instances, the sizing scale as logical pixels, the type
  ramp as `TextStyle`s (line-height ÷ size, which is what Flutter's `height` takes) and
  `velaThemeData(Brightness)` to seed a `ThemeData`. Ships as `@omkarux/vela/tokens.dart` and as a
  path-installable Dart package in `flutter/`. Tests hold it to the CSS's discipline: every token
  present, every value identical to the JSON, regeneration a no-op; the file is syntax-checked
  whenever a Dart SDK is on the machine. Nothing in the widget layer is generated — the tokens
  travel, the components are built per stack against the same specs.

## [0.7.1] — 2026-09-11

### Fixed
- 46 numeric tokens carried Figma names the library does not use (`text/h1-size` where the library
  has `size/h1`, and the like). Found by the new read-back; corrected in the JSON, and a test now
  holds every collection to its naming convention so the drift check can trust the names.

## [0.7.0] — 2026-09-11

### Added
- **Read-back drift check.** `npm run tokens:figma:read` prints a script that reads every variable
  out of the library, resolved per mode; `npm run tokens:figma:check <file>` diffs the result
  against the JSON and exits 1 on any mismatch. Closes the half of the loop that only pushed.
- Figma component builders live in source (`scripts/figma/components/*.figma.js`, run by
  `npm run figma:build`), version stamps on every generated description, and a spec lint that
  fails the build when a component spec loses a section the sync compiles.

## [0.6.0] — 2026-09-11

### Added
- **Spec → Figma description sync.** `npm run guidelines:figma` compiles each component spec's
  intent, code call, Figma-property→prop mapping, hard rules and source paths into that component
  set's Figma description, so a spec edit lands in Inspect the same way a token edit does. Same
  generated-script route as tokens; idempotent by page + name. What it deliberately does not do:
  add or change variants — a spec that adds a prop is design work in Figma and code both.
- A test asserts every spec keeps the sections the sync compiles (Props with a `tsx` example,
  Hard constraints, Figma mapping naming its page, Anti-patterns), so a spec that drifts in shape
  fails the build rather than silently producing a thinner description.

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
