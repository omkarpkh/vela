# Contributing

There is one path into Vela. It starts with a specification and ends with a pull request, and
nothing ships that skipped a step. The order matters: the spec is the contract, and the code,
the tests and the Figma set are each one implementation of it.

Read `AGENTS.md` and `guidelines/llms.txt` first. The six non-negotiables there apply to every
change, by a person or an agent. `DESIGN.md` says why the system looks the way it does;
`GOVERNANCE.md` says who decides and how a component moves between lifecycle states.

## Before you start

- **A component:** check `guidelines/overview.md`. If the component exists, extend it. If it is
  in the "not yet specced" list, open a component request first — it asks which existing
  component is the closest match and why it does not fit. Never invent a component.
- **A token:** check `guidelines/tokens.md`. If a semantic token already covers the role, bind
  it. New primitives need a reason a semantic cannot give.
- **A fix:** open an issue with the version, the browser and the smallest reproduction.

## The path

### 1. Spec

Write or edit `guidelines/components/<name>.md`. A test holds every spec to the same shape, so
these headings are required and spelt exactly: `## When to use …`, `## Props` (or
`## Composition` for a compound component), `## Hard constraints`, `## Figma mapping`,
`## Anti-patterns`. The spec needs a ` ```tsx ` example, must name its Figma page as
`` page `Name` ``, and the anti-patterns list needs at least three `- ❌` bullets.

Every bullet under `## Hard constraints` carries a tag: `[[rule: <id> | compiler|runtime|browser|convention]]`.
`npm run rules:check` fails when a `compiler` rule has no fixture in `scripts/verify-pack.mjs`,
a `runtime` rule has no unit test naming it, a `browser` rule has no Playwright spec naming it,
or a bullet has no tag. Understate the level when unsure: a rule enforced only by CSS and a
screenshot is a `convention`.

Prop sets are closed. A new value is a spec change, reviewed as one.

### 2. Tokens

`tokens/vela.tokens.json` is the only place a value is written; `npm run tokens` regenerates
every target and `npm run tokens:check` fails if a generated file was edited by hand.

- Components bind **semantic** tokens only. Never a primitive, never raw hex.
- A new semantic token aliases a primitive. A new primitive holds a raw value and carries a
  Figma name in its collection's convention.
- A new foreground/background pair goes in `PAIRS` in `scripts/contrast-core.mjs`, as
  `[fg, bg, label, 'text' | 'ui']`. Unasserted is unverified: `npm run contrast` reports it and a
  test fails the build if it drops under 4.5:1 (text) or 3:1 (ui) in either theme.
- Numeric tokens carry their unit in the JSON. Never `calc(var(--vela-space-10) * 1px)`.

### 3. Code and tests

One folder per component under `src/components/<Name>/`, exported from `src/index.ts`. Class
names follow `vela-<block>`, `vela-<block>__<part>` and `vela-<block>--<modifier>` (`vela-btn`,
`vela-alert__mark`, `vela-btn--filled`). A class name is public API; see `VERSIONING.md`.

Three kinds of test, and a change usually needs more than one:

- **Unit** (`*.test.tsx`, Vitest + jsdom): behaviour, accessibility, and every `runtime` rule by id.
- **Rule fixtures** (`scripts/verify-pack.mjs`): for a `compiler` rule, a snippet the published
  types must reject, tagged with the rule id. `verify` packs the real tarball, installs it into a
  scratch app and checks the rejection.
- **Browser** (`tests/e2e`, `tests/visual`, Playwright): for a `browser` rule, or when layout,
  hit-testing or paint is what you changed. Visual baselines are per platform; the Linux set
  gates CI. Update them with `npm run test:visual:update` only, and say in the PR what moved.

### 4. Figma

The library is compiled from the contract, not the other way round. The pipeline in
`scripts/figma/` is the route:

```bash
npm run tokens:figma            # variables, create-or-update by name
npm run styles:figma            # text styles bound to those variables
npm run figma:build <name>      # a component set, created once from scripts/figma/components/<name>.figma.js
npm run components:figma:lint   # every builder, run in the mock Plugin API against the reviewer rules; runs in npm test
npm run guidelines:figma        # each spec's summary into its set's description
```

Each script prints a Plugin API script to run inside the library file. Builders create; they
do not update. A variant added to a shipped set is built in place, by a person, after the API
review, then `npm run components:figma:check <name> <live.json>` proves the live set and the
builder agree. The Figma main components are labelled "Main components — do not touch": edit
through the builders and the scripts, not by hand in the canvas.

### 5. Changelog

Add a bullet under `## [Unreleased]` in `CHANGELOG.md`, in the file's style: what changed, why,
and the numbers where there are any. Mark a breaking change `### Changed — breaking`. The rules
for what counts as breaking are in `VERSIONING.md`.

### 6. Pull request

Branch from `main`. Run the gate before you open it:

```bash
npm run verify     # tokens:check + rules:check + typecheck + tests + checks:check + build + pack-and-consume gate
npm run test:e2e   # browser tests against the committed baselines
```

The PR template is a checklist of the steps above. One concern per PR. A PR that adds a
component without its spec, or a token without its pair, is sent back to step 1 or 2, not
reviewed around.

## Local notes

- `npm run dev` serves the demo and playground at `localhost:5174`. `.claude/launch.json` starts
  the same thing for a Claude Code session; keep it generic, no personal paths.
- `npm run checks` counts every automated check into `demo/checks.json`, and `verify` diffs it.
  Add a test, and the count on the site moves with it.
- A Dart SDK is optional. When one is present, `verify` also parses the generated Flutter file.

## Conduct and security

`CODE_OF_CONDUCT.md` applies in every project space. Report a vulnerability as `SECURITY.md`
says, not in a public issue.
