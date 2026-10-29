# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **The Calibrated Confidence Gate is public, as a proposal** (21 rules, 17 with proofs). It owns the
  Confidence band taxonomy and decides, through `gateBand(reading, now)`, which band the kit may act
  on: a stated band counts only once at least 30 person-reviewed conclusions for the same agent
  version, in a window no older than 30 days, confirm it. Calibration is shown as counts with dates,
  never a percentage. **Breaking change to the Verdict Card proposal:** `confidence` is now a
  `ConfidenceReading`, Accept follows the Gate's band, and the card drops to 28 rules (22 with
  proofs). The Autonomy Ladder documents `RouteInput.confidence` as the Gate's band.
- **Icon — Experimental** (`decisions/003-icons-lucide-curated`). Fifty curated
  [Lucide](https://lucide.dev) 1.63.0 glyphs (ISC; 25 of them Feather-derived, MIT) compiled at
  build time into zero-dependency React in the core entry: `lucide` is a pinned devDependency,
  nothing from it is imported at runtime, and `dependencies` stays `{}` — `verify-pack.mjs`
  still walks the core module graph and finds only React. `<Icon name size tone label>`: `name`
  is the closed `IconName` union (exported with `ICON_NAMES`), `size` regular | small | large on
  the new `--vela-icon-size*` tokens (16, 12, 20), `tone` default | muted | inherit on
  `--vela-icon-strong` / `--vela-icon-default` / `currentColor`, and the stroke on
  `--vela-icon-stroke` (2 in the 24 grid: 1px at small, 1.33px at regular, 1.67px at large).
  With `label` it is `role="img"`, without one `aria-hidden`; never focusable, never
  interactive. Twelve rules, four of them compiler with ten fixtures (an invented name, a Lucide
  glyph outside the set, an alias such as `trash-2`, a missing name, `size="medium"`,
  `size={16}`, `tone="critical"`, `tone="high"`, `onClick`, `tabIndex`). Three new `PAIRS`.
  Core JS grows from 3,675 B to 7,753 B gzip (10 → 63 modules); the glyphs are reached only
  through `Icon`.
- **The icon build.** `scripts/icons.list.json` is the set; `npm run icons:build` writes
  `src/icons/generated/*.tsx`, `src/icons/names.ts` and the Figma builder
  `scripts/figma/components/icon.figma.js` (one `Glyph` variant per name, box on `icon/size`,
  stroke on `icon/strong`); `npm run icons:check` fails on any difference from what is committed
  and runs in `verify`. It refuses a Lucide alias (`filter`, `trash-2`, `history` are `funnel`,
  `trash`, `rotate-ccw-clock` in Lucide 1.x), an unknown name, or an installed Lucide other than
  the reviewed version. A test holds `NOTICE`'s Feather list to Lucide's LICENSE. The mock
  Plugin API models `createNodeFromSvg` and `flatten`; the builder has not been run in the
  library yet. A playground page shows every glyph at the chosen size and tone.
- **The first three agentic specs are public, as proposals.** `guidelines/proposals/` holds the
  pressure-tested specs for the Verdict Card (29 rules, 23 with proofs), the Action Impact Card
  (30, 22) and the Autonomy Ladder (28, 22), with four new closed taxonomies: Verdict, Confidence
  band, Reversibility tier and Autonomy rung. Nothing in them is built; the folder's README and
  each file's first line say so, and it is left out of the npm package so a consumer's agent
  cannot mistake a proposal for an export.
- **`guidelines/figma-map.json`: what to write for each Figma set, on every plan.** Compiled from
  the specs by `npm run figma:map` (the description sync with `--map`): each set's node id and
  link, the import, the export to write (`Tabs.Trigger` for the Tab set), every Figma property's
  prop, and the spec's example. It does the job Code Connect does on an Organization plan;
  Vela's library is on Professional, where Code Connect is not available. `AGENTS.md` and
  `llms.txt` tell an agent to use it instead of the markup Figma generates. A test fails when it
  is stale. Measured against the Figma thread's "before" on Button node 7:7: without it, the
  design context gives a `<div>` lookalike with no import and raw fallback values.
- **The library's Changelog and Status pages are compiled from the repository.**
  `npm run figma:build:pages` prints a Plugin API script per page (each under 50 KB):
  `scripts/figma/pages/changelog.figma.js` draws one card per released version, newest first —
  the date, whether it is on npm (read from the committed `scripts/figma/pages/published.json`,
  or a `--published` list, or the registry with `--npm`), the bold lead-in of every bullet word
  for word, and a link to the full entry; `status.figma.js` draws GOVERNANCE.md's four labels as
  neutral outlined chips and one row per component — label from the spec's Status line, Figma
  set, React export, Since, spec link. Unlike the component builders they are idempotent: each
  finds its page frame by name and rebuilds it in place, so the frame keeps its id. Both end
  with a stamp naming the commit they were read from. `scripts/figma/check-pages.mjs` runs them
  in the mock Plugin API against the reviewer rules (plus no components on a doc page) in
  `npm test`; `RELEASING.md` step 7 rebuilds them before the library is published.
- **Checkbox (with Checkbox.Group) — Experimental, `@omkarux/vela/headless` only.** The first
  component born on Base UI rather than migrated to it (`checkbox.md`; Base UI 1.9 `Checkbox` +
  `CheckboxGroup`, by per-component subpath). A box that records intent until a Save — the spec
  settles Checkbox vs Toggle by that button. Closed props: `label` a required string, `checked`
  or `defaultChecked`, `size` `regular | tiny`, `error` a message, `indeterminate` rendered as
  `aria-checked="mixed"` with a dash; a Group with a required `label`, `value` or `defaultValue`,
  `orientation` `vertical | horizontal`, and a named error for a box in a Group with no `value`.
  The root is a native `<button>` through Base UI's `render` (native `disabled`, the global focus
  ring); the tick and the dash are inline SVG at `currentColor`. Seven compiler fixtures (six rules), three
  runtime rules with unit tests, a Figma builder (six variants, no waiver) and a playground page.
- **Radio Group — Experimental, `@omkarux/vela/headless` only** (`radio-group.md`; Base UI 1.9
  `RadioGroup` + `Radio`). Two to five visible options, one answer, committed by a Save; the spec
  sends six or more to a Select List, which is not in the kit. `RadioGroup` takes a required
  `label`, `value` or `defaultValue` (closed to `string`), `orientation`, `error` as a message and
  `name`; `RadioGroup.Radio` a required `value` and `label`, `disabled` and `description`. Roving
  tabindex, arrow keys that move focus and selection in both axes and skip a natively disabled
  radio, Space selects, Enter does not. Seven compiler fixtures (six rules), three runtime rules
  with unit tests, a Figma builder for a single Radio (two variants, the circle an ellipse so
  `radius/full` keeps its scope) and a playground page.
- **The check family of tokens.** `control-check-bg-checked` (primary-500; dark primary-450,
  because white on 400 is 3.18:1 and on 450 4.74:1) and `control-check-mark`, shared by the
  checked box and the selected radio, and four geometry tokens: `control-checkbox-size` (16),
  `-size-tiny` (12), `control-radio-size` (16), `control-radio-dot` (6). Four new `PAIRS` pass in
  both themes, including the Input error border, asserted for the first time. The CSS lint now
  walks `src/headless` as well as `src/components`; `Checkbox.css` and `RadioGroup.css` ship in
  `dist/vela.css` and carry no waiver. Rule count: 25 of 52 rules are now enforced by the compiler.
- **A second entry point, `@omkarux/vela/headless` — Experimental** (`GOVERNANCE.md`: may change
  in a minor without a deprecation window). Its first component is Tabs on Base UI 1.9
  (`@base-ui/react`, MIT), listed as an *optional* peer dependency; `@omkarux/vela` is unchanged
  and `npm run verify` now asserts, against the built module graph, that the core entry imports
  nothing but React. Same spec, same `Tabs.css`, same unit tests (`Tabs.test.tsx` runs every
  case against both implementations) and the same compiler fixtures, which the pack gate now
  also runs against the headless export. Where Base UI's defaults differ from the spec — manual
  activation, focusable-while-disabled tabs, `aria-controls` only on the active tab — the
  headless Tabs maps to the spec and `tabs.md` records each difference under a new
  "Implementations" section. The playground's Tabs page gets an *Implementation* control
  (core | headless) and every component page an import line with "Dependencies: …", read from a
  `**Dependencies:**` line in the spec (default `none`).
- **The docs site carries the project record.** New routes: `#/status` (every component's
  lifecycle label, read from the `**Status:**` line in its spec, so site and spec cannot
  disagree), `#/changelog`, `#/roadmap`, `#/contributing` and `#/accessibility`, each rendered
  from the markdown the repository ships. `ROADMAP.md` is the public plan; `ACCESSIBILITY.md`
  says what is asserted by a machine, what a person checks per release, and what is not yet
  checked, each with its method.
- **Risk Pill** — the Risk taxonomy becomes a component. Three levels (`low`, `medium`,
  `high`), two sizes, closed props with compiler fixtures (`risk-closed-set`,
  `risk-pill-sizes-closed`), a Figma builder and a playground page. Status: Experimental until
  its Figma set is published.
- **DESIGN.md** is the one global-rules document (tokens, the three taxonomies, closed props,
  states, motion, theming, responsive and density, accessibility, anti-patterns, the
  not-in-kit list, how to add a component). `AGENTS.md` is now a router to it.
- **Every spec states its responsive behaviour.** A "Responsive behaviour" section in all
  seven specs, required by the heading test: what flexes, what is fixed, what wraps, what
  scrolls, and the gaps named (Tabs has no off-edge cue; breakpoint and density tokens do not
  exist yet).
- **Visual CI at four widths.** The component sections are screenshotted at 1440 (the full
  suite), 1280, 1920 and 400 — 68 screenshots, was 18. Only the CI runner writes the Linux
  baselines: the pull-request job writes missing ones and commits them for review; the
  "Visual baselines" workflow regenerates all of them on request. On CI the gate itself never
  writes a baseline, so a missing screenshot fails instead of passing on a retry.
- **Tokens conform to DTCG 2025.10** (Format, Color and Resolver modules, Final CG Reports,
  28 Oct 2025): colours as `{colorSpace, components, hex}` objects, durations as
  `{value, unit}`, aliases as full paths, vendor data under `com.omkarux.vela`, dark mode as a
  resolver overlay (`tokens/vela.dark.tokens.json`, `tokens/vela.resolver.json`) instead of a
  vendor extension. Every generated target is byte-identical to before. `npm run
  tokens:validate` parses both files with `@terrazzo/parser` and fails on a warning; it runs
  in `npm test` and as its own CI step.
- **Twelve geometry tokens** replace every bare number in component CSS: `stroke-2`,
  `field-mark-gap`, the seven Toggle track and knob dimensions (knob travel is derived from
  them), the two Status Indicator dots, and `blur-materialize`. A CSS lint (`npm run
  css:check`, in `npm test`) fails on a raw colour or a bare length in `src/components`
  unless waived inline with a reason; no stylesheet carries a waiver.
- **The project files a public library carries.** `CONTRIBUTING.md` (the one path in: spec,
  tokens, tests, Figma, changelog, PR), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1),
  `SECURITY.md` (private reporting by email; one maintainer, so 7 days to acknowledge and 30 to
  assess, no bounty), `SUPPORT.md`, `GOVERNANCE.md` (single maintainer; the component lifecycle
  labels Approved, Known bugs, Experimental and Retired, with "Main components — do not touch"
  on the Figma sources; what counts as breaking), `VERSIONING.md` (semver for a design system:
  token, prop, taxonomy, class and Figma renames are breaking; a two-minor deprecation window;
  `$deprecated` on tokens and `@deprecated` on exports with a dev-only warning), `RELEASING.md`
  (the checklist, tag-driven), `NOTICE` (Open Sans and Oswald under OFL 1.1, the Covenant under
  CC BY 4.0, and Base UI and Lucide listed as planned and not yet included) and
  `LICENSE-DESIGN.md` (the Figma library under CC BY 4.0 and additionally MIT; the Figma
  Community listing is planned, not yet live; attribution "Vela by Omkar Khadamkar (omkarux.com)"). GitHub issue forms for a bug, a
  component request (it asks for the closest existing component and why it does not fit) and a
  token request, a PR template that mirrors `CONTRIBUTING.md`, and a contact config pointing
  questions at Discussions.
- **Decision records have an index and a template.** `decisions/README.md` numbers the existing
  press-feedback record 001 without renaming its folder, and `decisions/TEMPLATE.md` carries its
  headings. `decisions/002-agent-ready-direction` records the 28 October decisions: extend rather
  than restart; React first, then the framework-agnostic contract; Base UI for behaviour under
  Vela's CSS and tokens, no Tailwind; a second entry point `@omkarux/vela/headless` with Base UI
  as an optional peer while `@omkarux/vela` stays zero-dependency; a security-console agentic
  component set as the differentiator; zero spend; approval gates on `main`, npm and the Figma
  library. The rejected options and their reasons are in the record.
- CI's `verify` job now runs `npm run tokens:check` and `npm run checks:check` after the
  typecheck, in the order the local `npm run verify` runs them. Until now a hand-edited generated
  file or a stale `demo/checks.json` failed locally and passed in CI.

### Fixed
- **Correction to the 0.3.0 entry, 28 October 2026.** It says Code Connect "requires an
  Organization or Enterprise Figma plan". Figma's Code Connect help page now lists the
  Professional plan too, with a Full or Dev seat, limited to one active library and one active
  framework. The 0.3.0 statement was Figma's position at the time and the entry is left as
  written; this note is the correction. The related statement in 0.5.0, that writing variables
  through the REST API needs an Enterprise plan, still holds: Figma's variables endpoints say
  "available to full members of Enterprise orgs", so the generated-script route stays.
  *Further correction, 29 October 2026:* Professional is listed, but Figma Community Support
  states that on Professional, Code Connect mappings cannot be created through the MCP server
  (forum thread 59258, 23–27 October 2026); the Figma thread's attempt was rejected with "only
  Organization or Enterprise libraries". Mappings can still be made in Figma's Code Connect panel
  by hand, or with the Code Connect CLI if the account's token carries the scope. *Decided,
  29 October 2026:* the library sits on a Figma Professional plan, which does not offer Code
  Connect in practice, and no plan upgrade will be bought for it. Code Connect is not wired. The
  component → export → node mapping is kept as data in the repo, so a later plan or tool can
  publish it without rework.
- **The npm `description` and the README now say the same thing about enforcement.** The README
  and `llms.txt` have said "11 of the 27 rules by the TypeScript compiler, the rest at runtime, in
  a real browser, or by review" since the rule-coverage gate landed; the description said nothing
  about how rules are enforced, which left the registry listing open to being read as "all of
  them". It now carries the same hedged sentence. `homepage` points at the docs site,
  https://omkarpkh.github.io/vela/, instead of the GitHub README.
- **Stale counts in the README.** The Scripts block said `npm test` runs 188 unit tests;
  `demo/checks.json`, which `scripts/count-checks.mjs` writes from the runners' output, says 208
  unit and 238 in all at 0.12.1. The README now quotes the generated numbers and says where they
  come from. The packed size moves from 67.6 kB to 72.3 kB (53 files, unchanged) because
  `README.md` and `CHANGELOG.md` ship in the tarball and both grew in this entry; the row now
  says so.
- **`.claude/launch.json` carried a personal macOS path** in a second launch configuration that
  had nothing to do with Vela. It is removed; the file keeps the one generic entry, which starts
  the demo on port 5174.

### Changed
- README: shields.io badges for CI, the npm version and the licence (static badge URLs, no new
  service), a "Project files" section linking the files above, and a status line stating that
  the lifecycle labels exist and every component is currently Approved.

## [0.12.1] — 2026-10-09

### Fixed
- **The Figma builders now reproduce the library as it was corrected by hand on 9 October**, so a
  rebuild no longer loses those corrections. Contextual Alert: the status shapes live in a centred
  `Status mark / <severity>` box (`icon/20` by `line-height/body`, so the mark sits on the first
  line of text) and are named `Shape / <severity>`; `Content` stacks title and message `space/5`
  apart (was a raw 2); the dismiss is a `Dismiss / Close` text box in Body/Default (was an unstyled
  18px) at `icon/20` × `line-height/body`; the critical variant's dismiss is hidden outright. Button:
  the hidden icon is one union shape, `Glyph / plus`, inside an `Icon` box that is a centred auto
  layout at the icon-size variable (was two loose bars in a frame with no layout). Tab: the count
  uses the new `Tab/Count` and `Tab/Count Large` styles (was `Tab/Default` with a weight override,
  which detaches the style and shipped the count unstyled). The spec's Figma mapping documents the
  layer structure and carries the status-mark note the library shows: "The status mark is a simple
  shape … never by colour alone."
- **The text styles have a source.** `scripts/figma/text-styles.mjs` derives one style per ramp
  size the way the Flutter theme does, plus `Body/Link` and the two tab counts, and
  `npm run styles:figma` creates-or-updates them by name with size, line height, weight and
  tracking bound to the typography variables. Until now the styles were hand-made, which is how a
  count could ship without one.
- **The code draws the same boxes.** `.vela-alert__mark` (`icon-20` × body line height, centred)
  wraps the alert icon, the title keeps `space-5` below it, and the dismiss is `icon-20` × body line
  height in body type with no negative margins; the Button icon slot centres its glyph. The alert's
  mark and text therefore sit where the library puts them; six visual baselines move by a few pixels.

### Fixed
- **`npm run tokens:figma --only <Collection>` wrote empty values.** The alias lookup was built from
  the filtered list, so every Color alias into Primitives became `{}`. Aliases now resolve over every
  token before the filter narrows the output, an unknown alias throws, and a test holds the line.
  The two primitives added in 0.12.0 are also renamed in Figma from `primitives/primary-450` and
  `primitives/red-600` to `primary/450` and `red/600`, beside their siblings.

### Added
- **Builders are linted and diffed without opening Figma.** `scripts/figma/mock-figma.mjs` is a
  small fake of the Plugin API; `scripts/figma/check-components.mjs --lint` runs every builder
  through it and applies the rules a design-system reviewer applies to the file — spacing from the
  scale, every text styled, no placeholder or default layer names, fixed sizes and colours bound,
  auto layout wherever a frame has children — and fails on a violation unless the builder waives
  the rule by name with a reason (Toggle's track and knob, Status Indicator's dot). It runs in
  `npm test`. `--read <name>` prints a read script for the live set in the same shape, and
  `components:figma:check <name> <live.json>` diffs the two, so drift in either direction is a
  command, not a review.

## [0.12.0] — 2026-09-24

### Fixed
- **A press no longer swallows clicks near a button's edge.** `:active` scales the button to
  0.97 about its centre, which pulls both edges inward while the pointer is down — 1.5px a side
  at 102px wide, 4.8px at 320px. A press that landed 2px inside an edge came back up where the
  button no longer was, so the click retargeted to the parent and was lost. Measured, not
  theorised: pressing 2px inside the edge of a 320px button, **every one of 160 presses was lost
  in Chromium and about nine in ten in WebKit** (four runs of 40: 40/40/40/40 against
  36/36/34/37), and none at all after the fix. Confirmed on the shipped
  component with the guard toggled and nothing else changed: 10/30 lost without it, 0/30 with it.
  The same pattern reproduced from Linear's published CSS loses them at the same rate. The fix is a
  counter-scaled `::after` (0.97 × 1.0309278 = 1) that holds the original border box for the
  length of the press. Pure CSS and no handler, so every framework port built on the stylesheet
  gets it. Now `tests/e2e/playground.spec.ts` asserts it, under the new `browser` enforcement level.
  The suite could not have caught this before: `.click()` dispatches pointerdown and pointerup
  in one tick, so the press never advances.

### Fixed
- **Dark-mode button hovers failed WCAG AA against their own labels, and CI had never looked.**
  `--vela-btn-primary-hover-bg` was **3.18:1** against white and `--vela-btn-destructive-hover-bg`
  was **4.08:1**; AA needs 4.5:1. Both now pass with headroom — 4.74:1 and 4.72:1 — via two new
  ramp steps, `primary-450` (#187e91) and `red-600` (#cd4336). The dark hovers had been reaching
  for `primary-400` and `red-500`, which are also the focus ring, link text and severity signals,
  so those keep their values and only the hover bindings moved. The new steps stay clearly
  perceptible as hovers: ΔL* +6.8 and +9.0 from rest, against a 4–7 norm.

  The reason it survived this long is the more useful half: **no hover pair was in `PAIRS`**, so
  "WCAG AA asserted in CI" was true only of buttons sitting still. Four hover pairs are now
  asserted in both themes. Every mouse press begins from hover.

### Added
- **The press pivots on the point you touched, where a pointer can be read.** Vela's position is
  that every target gets the best it can do, so the press now has two layers and the lower one
  stands alone. In CSS the button scales from its centre and the guard above holds its footprint —
  correct wherever the stylesheet runs, no script. Where React is present the scale pivots on the pressed
  pixel instead, so that pixel does not move: **0.06px against the centre scale's 4.80px** on a
  320px button. Apple's [Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
  (WWDC18) is the argument for it: an interface should feel connected to the hand moving it.

  The seam is documented rather than incidental. `guidelines/llms.txt` no longer says a port
  "translates only the syntax" — it says an enhancement is additive by definition, may not touch
  the props, the markup or what the CSS does alone, and that skipping it costs feel and never
  function. A new hard constraint, `button-enhancement-not-load-bearing`, is proved by a browser
  test that strips the JS path and asserts the press is still correct. Material UI takes the same
  trade and does not survive it as cleanly: its ripple silently starts from the centre when the
  press came from a keyboard.

  Implementation notes worth keeping: the pivot cannot be handed to a CSS `:active` rule, because
  the browser paints the scale in the same frame the handler is writing and the loser leaves the
  press pivoting on the *previous* contact point. So the component drives the press itself —
  `vela-btn--js` switches `:active` off, and the pivot and the pressed flag land in one statement.
  It also captures the pointer, without which the scale moves the button out from under the pointer
  and fires `pointerleave`, ending the press because of the press.

- **`--vela-duration-instant` (70ms)** — a third motion duration, for a press landing. Under the
  ~85ms where a delay begins to read as lag. Emitted to CSS, Flutter (`VelaMotion
  .durationInstant`), the docs and the Figma sync script. The MUI theme does not carry it:
  Material's duration slots map to `fast` and `base` only.
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
