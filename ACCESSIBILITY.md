# Accessibility statement

Vela targets WCAG 2.1 AA. This page says which parts of that are asserted by a machine on
every change, which parts are checked by a person, and which parts are not yet checked at
all. A claim without its method is a boast; each line below carries its method.

## Asserted in CI, on every change

| Check | How | Where |
|---|---|---|
| Text and UI contrast | 48 colour pairs resolved from the generated CSS and measured with the WCAG 2.1 formula, 4.5:1 for text and 3:1 for UI, in both themes — 96 assertions. A new colour pair that is not in the list is unverified, and the rule says so. | `scripts/contrast-core.mjs`, `src/styles/contrast.test.ts` |
| Hover states keep contrast | The four button hover pairs are in the same list, because hover once passed only for buttons sitting still. | `scripts/contrast-core.mjs` |
| Dark mode re-points semantics only | A raw colour in the dark overlay fails a test; every dark value is an alias to a primitive the light theme also uses. | `src/styles/tokens.test.ts` |
| Closed prop sets | Seventeen hand-written misuse fixtures must fail to compile against the published type declarations — a label-less toggle or input, an invented size, a severity used as a status or as a risk. | `scripts/verify-pack.mjs` |
| Accessible names | Toggle, Input and the tab list require a label or an `aria-label` at the type level; Status Indicator supplies its own name when the label is hidden. | component specs, rule tags `[[rule: … | compiler]]` |
| Keyboard behaviour | Tabs: one tab stop, arrow keys move, Home and End jump, disabled tabs are skipped. Button: a keyboard press is acknowledged. | `src/components/*/*.test.tsx`, `tests/e2e/playground.spec.ts` |
| Press targets do not move | A browser test presses 2 px inside a button's edge and asserts the click lands; the hit area is guarded against the press scale. | `tests/e2e/playground.spec.ts` |
| Reduced motion | One global rule collapses every transition and animation under `prefers-reduced-motion`; the visual suite runs with reduced motion on. | `src/styles/base.css`, `playwright.config.ts` |
| Focus is visible | One global `:focus-visible` ring, 2 px with a 2 px offset, on every interactive element; no component removes it. | `src/styles/base.css` |
| Layout at console widths | Every component section is screenshotted at 1440, 1280, 1920 and 400 px against committed baselines. | `tests/visual/demo.spec.ts` |

## Checked by a person, per release

- A keyboard-only pass through the playground: every control reachable, every state announced
  by its visible change, nothing trapped.
- A screen-reader pass (VoiceOver on macOS Safari, NVDA on Windows Firefox) over the Overview
  page: component names, states and the tab list's structure read as the spec says.
- The colour-blindness simulators in Chromium DevTools over the Overview page: no meaning carried
  by colour alone (status and severity always carry a label or an icon).

The result and the date go into the changelog entry for that release.

## Not yet checked, and tracked

- **No automated ARIA audit.** axe-core in the Playwright suite is planned for Phase 1 with the
  headless behaviour layer; until then, ARIA roles and relationships are asserted only by the
  unit tests that name them.
- **Tabs have no off-edge cue.** When triggers overflow, the list scrolls but nothing shows that
  more exist. Tracked for the Phase 1 migration.
- **Chromium only in CI.** The visual and behaviour suites run in Chromium. Firefox and WebKit
  are checked by a person, not a machine.
- **Touch targets.** The `tiny` sizes are below 24 px and are for dense desktop tables only; the
  specs say so, and nothing enforces it.

## Browser support

Vela ships CSS and JavaScript at the level the four major engines all support in versions
released from mid-2023 onward (the "Baseline widely available" line): CSS custom properties,
`:focus-visible`, `@media (hover: hover)`, the individual `scale` and `rotate` transform
properties, `prefers-color-scheme` and `prefers-reduced-motion`. Container queries, which the
embeddable components will use from Phase 1, sit on the same line. React 18.3 or 19 is a peer
dependency; nothing else is required at runtime.

## Reporting a problem

Open an issue with the "Bug" template and say which assistive technology or browser was in use.
An accessibility defect in an Approved component is fixed in a patch release; see
`GOVERNANCE.md`.
