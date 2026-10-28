<!-- One concern per PR. The path is in CONTRIBUTING.md; this list follows it in order. Delete the lines that do not apply, and say why if one is skipped. -->

## What and why

<!-- One paragraph. Numbers where there are any. Link the issue or the decision record. -->

## Spec

- [ ] `guidelines/components/*.md` edited first, and the code follows it, not the other way round
- [ ] Every new `## Hard constraints` bullet carries `[[rule: id | compiler|runtime|browser|convention]]`
- [ ] Prop sets stay closed; a new value is listed in the Props table

## Tokens

- [ ] Values changed in `tokens/vela.tokens.json` only; generated files regenerated with `npm run tokens`
- [ ] Components bind semantic tokens only; no primitive, no raw hex
- [ ] Every new foreground/background pair added to `PAIRS` in `scripts/contrast-core.mjs`

## Tests

- [ ] Unit tests for behaviour, and for every `runtime` rule by id
- [ ] A fixture in `scripts/verify-pack.mjs` for every `compiler` rule
- [ ] A Playwright spec for every `browser` rule, or where layout, hit-testing or paint changed
- [ ] Visual baselines updated only with `npm run test:visual:update`, and what moved is stated below

## Figma

- [ ] Token, style or builder changes made through `scripts/figma/`, not by hand in the canvas
- [ ] For a changed set, `npm run components:figma:check <name> <live.json>` is clean, or the diff is explained

## Changelog and versioning

- [ ] Entry under `## [Unreleased]` in `CHANGELOG.md`, in the file's style
- [ ] Breaking changes marked `### Changed — breaking` and following `VERSIONING.md`
- [ ] Deprecations name the release they will be removed in

## Gate

- [ ] `npm run verify` green
- [ ] `npm run test:e2e` green

## Baselines that moved

<!-- Which screenshots, by how many pixels, and why. "None" is a fine answer. -->
