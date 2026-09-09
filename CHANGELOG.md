# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Contrast audit** (`npm run contrast`) covering 78 pairs across both themes, backed by
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
