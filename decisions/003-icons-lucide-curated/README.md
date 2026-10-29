# Icons: a curated Lucide set, compiled into the core

**Decided 29 October 2026. Vela's icons are fifty Lucide 1.63.0 glyphs (ISC), chosen by name in
`scripts/icons.list.json` and compiled at build time into zero-dependency React inside the core
entry, behind one `Icon` component whose `name` is a closed union. `lucide` is a pinned
devDependency only; `dependencies` stays `{}`. Shipped as Experimental: the spec, the component,
the build and its check, the tests and fixtures, a Figma builder and a playground page. Released
in 0.13.0. The Figma set is built in the library file, published with the 0.13.0 library; the
kit's own six inline glyphs have not moved.**

The build is `scripts/build-icons.mjs` (`npm run icons:build`), reading through
`scripts/icons-core.mjs`; `npm run icons:check` rebuilds and diffs, and runs in `verify`.

---

## What started it

Decision 002 named the icon set as open: "Lucide (ISC) is the candidate named in `NOTICE`; nothing
is included yet." The Phase 2 components on the roadmap — Verdict Card, Action Impact card,
Approval Queue, Agent Provenance — each need glyphs the kit cannot draw today: a blocked, flagged,
allowed and unverified verdict; a reversible action; a pending approval; a human and an agent
actor. Until now the kit drew six glyphs by hand in `src/lib/icons.tsx` on a 16-unit grid at a
1.5 stroke, used by Contextual Alert and the Button demo, and the Figma library drew circles,
triangles and octagons "until Vela has an icon set" (`contextual-alert.md`).

Two promises bound the answer. The core entry has zero runtime dependencies, and
`verify-pack.mjs` asserts it against the built module graph. And prop sets are closed: a value not
in the Props table does not exist — which, for an icon, means a glyph name an agent invents must
be a compile error, not a blank box.

## What was considered

Criteria, stated before the options: (1) the core keeps zero runtime dependencies; (2) the set is
closed and the compiler rejects a name outside it; (3) a permissive licence whose notice can
travel in the tarball; (4) stroke glyphs on one grid, with the stroke a token, legible at 12px;
(5) coverage of the security and agentic meanings above without drawing them; (6) the same glyphs
in the Figma library from the same source; (7) what a consumer who never renders an icon pays.

| Option | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| A. Keep drawing by hand (`src/lib/icons.tsx`) | yes | yes | yes | yes, 16 grid | no — every glyph is design work | by hand | nothing |
| B. `lucide-react` as a dependency or peer | **no** | no — any of ~1,900 names | yes | yes | yes | separately | the package, or its install |
| C. **Lucide, curated subset, compiled at build time (shipped)** | yes | yes | yes, ISC + Feather MIT | yes, 24 grid, stroke 2 | yes | generated from the same list | nothing if `Icon` is not imported |
| D. Compile all of Lucide | yes | no — the set means nothing | yes | yes | yes | 1,900 variants | the same, larger when imported |
| E. Another set (Tabler, Heroicons, Phosphor, Material Symbols) | yes, if compiled the same way | yes | yes | varies | not assessed | — | — |
| F. An SVG sprite or icon font | yes | partly | yes | the stroke is not a token in a font | yes | no | a served file |

## The measurements

Single runs, this repository, `npm run build`, gzip level 9 over every module reachable from
`dist/index.js` concatenated (the same walk `verify-pack.mjs` uses):

| | Before (f68d877) | After |
|---|---|---|
| Core entry modules | 10 | 63 |
| Core JS, raw | 12,461 B | 42,253 B |
| Core JS, gzip | 3,675 B | 7,753 B |
| The fifty glyph modules alone, gzip | — | 3,576 B |
| `dist/vela.css`, gzip | 9,999 B | 10,290 B |

The glyph modules are reached only through `Icon` (`sideEffects` is CSS-only and the build keeps
`preserveModules`), so a bundler drops them for a consumer that imports Button and nothing else;
that was not measured in a consumer bundle and is stated from the module graph. The Figma builder
script is 9.6 KB, under the 50 KB the MCP accepts in one call, so it is not split.

Of the fifty, 25 are listed by Lucide's LICENSE as derived from Feather (MIT); `NOTICE` prints them
and `src/icons/icons.test.ts` holds that list to what `icons-core.mjs` computes from the LICENSE and
Lucide's alias table.

## Why the alternatives lost

**A** fails criterion 5 by construction: every Phase 2 glyph would be drawing work and review, and
the hand-drawn grid (16, stroke 1.5) does not match any set a designer can extend from. **B**
breaks the zero-dependency promise outright and, as a peer, still hands the consumer ~1,900 names
with no closed set — an agent could reach for any of them. **D** keeps the dependency promise but
not the closed set: a list that includes every glyph does not say which glyph means "blocked".
**F** loses per-glyph accessibility control and puts the stroke in a font where a token cannot
reach it. **E** was not assessed glyph by glyph; Lucide was already the candidate in `NOTICE` and on
the roadmap, its licence is the shortest permissive one, its names have an alias table that
survives renames, and it covers the security meanings in the list without a gap. Choosing another
set later is a new record; the build reads one package through one module and could read another.

## What shipped

As the changelog states it:

- **Icon — Experimental.** `<Icon name size tone label>`: `name` is one of `ICON_NAMES` (fifty),
  `size` regular | small | large on `--vela-icon-size*` (16, 12, 20), `tone` default | muted |
  inherit on `--vela-icon-strong` / `--vela-icon-default` / `currentColor`, the stroke on
  `--vela-icon-stroke` (2, in the 24 grid). `label` makes it `role="img"`; without one it is
  `aria-hidden`. Never focusable, never interactive. Exports: `Icon`, `ICON_NAMES`, `IconName`
  (and `IconProps`, `IconSize`, `IconTone`); the glyph components are internal.
- **The build.** `scripts/icons.list.json` → `src/icons/generated/*.tsx`, `src/icons/names.ts` and
  `scripts/figma/components/icon.figma.js`; `icons:check` in `verify`.
- **Twelve rules** in `guidelines/components/icon.md`: four compiler (ten fixtures), five runtime,
  three convention.

Three names in the original brief are aliases in Lucide 1.x and the list uses the canonical names:
`filter` → `funnel`, `trash-2` → `trash`, `history` → `rotate-ccw-clock`. `shield-question-mark`
is canonical. Every other name existed as given.

**The stroke stays at Lucide's 2.** In the 24 grid it renders 1px at 12, 1.33px at 16 and 1.67px at
20 — exactly one device pixel at the smallest size, and close to Open Sans Regular's stem at the
others; 1.5 would render 0.75px at 12 and blur (`foundations/sizing.md`). In Figma, where a stroke
weight is canvas pixels and cannot bind a product of two variables, the builder writes
icon/stroke × icon/size ÷ 24 = 1.33.

## Found on the way past, and fixed

- `README.md` listed six components in "What is actually in here" (Risk Pill was missing) and said
  "All six are currently Approved" while Risk Pill was Experimental. Both now name the eight
  components and the two Experimental ones.
- `src/styles/index.css`, the dev and demo stylesheet entry, lists the component stylesheets by
  hand beside `scripts/build-css.mjs`; the Icon page's e2e caught it one short (the glyph rendered
  at 83px). A test in `css-lint.test.ts` now holds the two lists equal.
- `--vela-icon-strong` and `--vela-icon-default` existed with no consumer and no contrast pair.
  Both now have a component and are in `PAIRS`.

## Still open

- **The Figma set has not been built in the library.** The builder passes the lint in the mock
  Plugin API, which now models `createNodeFromSvg` and `flatten`; how the real API flattens
  Lucide's mixed paths, circles and rects into one stroked vector has not been seen. Run it, then
  `npm run components:figma:check icon <live.json>`.
- **Stroke weight at small and large in Figma.** An instance bound to `icon/size-small` or
  `icon/size-large` keeps 1.33 where the code renders 1 and 1.67.
- **The kit's own glyphs have not moved.** `src/lib/icons.tsx` (CheckCircle, InfoCircle,
  WarningTriangle, CriticalOctagon, Close, Plus — Contextual Alert's marks and dismiss, the
  playground's Button icon) still draws its own 16-grid, 1.5-stroke SVGs; the Contextual Alert and
  Button Figma builders still draw shapes and a union plus. Moving them is a visual change with new
  baselines, and is its own change.
- **`muted` on a container.** 3.07:1 in light mode, under the 3.29:1 floor; recorded as a
  convention, not fixed. A darker `--vela-icon-default`, or a container-specific token, would close
  it.
- **The Overview page still says "7 components · 48 contrast pairs".** It is hardcoded and is a
  visual baseline; it moves with the next baseline update.
- **The Verdict taxonomy.** The four shields are reserved for the Verdict Card and carry their word
  only until that taxonomy is specced.
