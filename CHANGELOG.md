# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Icon Button, a new headless component** (`guidelines/components/icon-button.md`; the spec
  thread's draft of 30 Oct 2026 with the repo thread's amendment of 1 Nov 2026, approved by Omkar
  the same day). A button or a link drawn as one glyph people already know, always named by
  `label`: `<IconButton label="Close" icon="x" size="tiny" onClick={close} />`, or a link with
  `href`, and `opensInNewTab` for `target="_blank"`, `rel="noopener noreferrer"` and ", opens in a
  new tab" on the name. Exactly one glyph: one of Icon's fifty, GitHub's or Figma's own mark
  (`brandMark`), or the word "npm" (`word`). Two sizes on the control heights, 24px with a 16px
  glyph and 35px with a 20px one. Its tooltip is Tooltip's new label kind: it shows the name on
  hover and focus and is heard once. A pointer press scales the glyph to 88%, never the box. With a
  brand mark or the word, the glyph is `--vela-brand-mark` in every state, never scales, and has
  no hover or pressed fill, so nothing sits inside Figma's 20px clear space. From
  `@omkarux/vela/headless` only, because the tooltip is Base UI's. Experimental, with no Figma set
  yet: `scripts/figma/components/icon-button.figma.js` (State × Size, 8 variants, an `Icon`
  instance swap and a `Label` text property) is written, passes the builder lint, and has not been
  run.
  - **12 rules, 10 with proofs.** Four compiler rules (`icon-button-label-required`,
    `-glyph-closed`, `-button-or-link`, `-size-closed`): 18 rejections in `scripts/verify-pack.mjs`
    against the `/headless` entry, beside a valid control that must compile (no label;
    `aria-label`, `title`, children; two glyphs, none, a node, an invented name, a third mark or
    word; Figma at `tiny`; `href` with `onClick`, neither, `disabled` or `type` on a link,
    `opensInNewTab` on a button; a third size, a number). Four runtime rules
    (`-named-by-label`, `-tooltip-repeats-name`, `-link-form`, `-disabled-native`): unit tests.
    Two browser rules: `-hit-area`, under Chromium's touch emulation (the box holds its place and
    size, the glyph scales, a mark or the word never scales and gets no fill), and with a mouse
    (no hover fill under a mark, the owner's black in light and white in dark, the tooltip on hover
    and focus); and `-forced-colours`, both forms, under forced-colours emulation. Two conventions.
  - **Tooltip gains `kind: "description" | "label"`.** The default, `description`, is today's
    behaviour, unchanged. A `label` tooltip is `aria-hidden`, never wired by `aria-describedby`,
    and throws a named error when the trigger's accessible name is not its `content`. New rule
    `tooltip-label-kind-matches-name` (runtime), with two unit tests; the existing Tooltip tests
    pass as they were.
  - **A new token, `--vela-target-min`** (24px, aliasing `--vela-control-height-24`; Figma
    `control/target-min`): WCAG 2.2's 2.5.8 minimum target, stated once in `foundations/sizing.md`.
    The Dart and Figma-drift builds now resolve a sizing alias to its value. One new contrast pair,
    "Brand mark on the standard hover fill", 16.18:1 light, 11.14:1 dark, in case a host puts a
    mark on that fill; Icon Button's own glyph pairs were already asserted.
  - Button, Icon and Tooltip now link to `icon-button.md` where they said "an Icon Button, which is
    not in this kit", and Icon Button leaves the "Not yet specced" lists and the site search's
    missing list. A playground page (group Actions), on the axe list in both themes.
    244 rules across 20 specs (was 231), 78 compiler-enforced (was 74). 1458 checks (was 1429):
    1174 unit and contract (was 1150), 211 e2e (was 206); 110 contrast pairs (was 109); 293 tokens
    (was 292).
- **Brand Mark, a new core component** (`guidelines/components/brand-mark.md`; Omkar said "go" on
  1 Nov 2026). Another company's own logo, drawn as its owner drew it, used only to link to that
  company's service, and kept apart from Icon: `<BrandMark name="github" label="GitHub" />`, or
  `decorative` inside a control that already carries the name. Two names, `github` and `figma`; two
  sizes on Icon's size tokens, 16px and 20px, Figma at 20px only; no tone, colour, class or style.
  It is the owner's own black in the light theme and white in the dark, carries no `<title>`, and
  never moves. Figma's mark keeps clear space equal to its height, 20px, as Figma's Brand Book asks
  (Omkar chose to follow it as written, so the marks need not wait for Figma's reply). Experimental,
  with no Figma set yet: `scripts/figma/components/brand-mark.figma.js` is written and passes the
  builder lint, and has not been run. This is the first of the header's brand icons; Icon Button's
  `brandMark` glyph and the site header come in later changes.
  - **The owners' files, checked in unchanged** in `src/brand-marks/`, each with a source note.
    GitHub: Primer Octicons 19.42.0 `mark-github-16.svg` (MIT), taken from the npm tarball, with
    its licence text; Octicons is not a dependency. Figma: its own mono-line icon, the file Omkar
    attached; the 1024 × 1280 canvas is cropped to the mark with the viewBox `212 340 600 600`
    (the path measures x 304–720.156, y 340–940), and the path and its `evenodd` fill rule are
    unchanged. `NOTICE` carries both, GitHub's MIT notice in full.
  - **6 rules, 4 with proofs.** `brand-mark-closed`: one fixture group with seven rejections in
    `scripts/verify-pack.mjs` (a third name, `size="regular"` on Figma, neither or both of `label`
    and `decorative`, `tone`, `className`, `style`) beside a valid control that must compile.
    `brand-mark-owner-drawing` and `brand-mark-named-once`: unit tests, one comparing each
    rendered path's `d` with the owner's file. `brand-mark-never-moves`: a new `css:check` rule,
    `brand-mark-still`, that fails any `transition`, `animation` or `transform` on
    `.vela-brand-mark` or inside it and can't be waived, and a computed-style check on the Brand
    Mark page. Two conventions, for a reviewer: the highest-contrast colour, and only to link to
    its owner.
  - **Two new tokens and two new contrast pairs.** `--vela-brand-mark` (Figma `brand-mark/fill`): the
    new primitive `--vela-black-pure` (#000000) in light, because Vela's `--vela-black` is #191d1f,
    and `--vela-white` in dark. The svg still fills with `currentColor`, and `.vela-brand-mark` sets
    `color` to the token, so forced colours still win. "Brand mark on page" (`--vela-bg-global`, also
    the site header's background) 21.00:1 light, 18.08:1 dark; "Brand mark on container" 18.62:1,
    16.13:1. css:check now counts `--vela-black-pure` as a primitive, so no stylesheet binds it.
  - A playground page (group Data), with Figma's regular size and regular's Figma locked, each with
    the move that gets there. Not on All states, so no visual baseline moves.
    231 rules across 19 specs (was 225), 74 compiler-enforced (was 73). 1429 checks (was 1400):
    1150 unit and contract (was 1124), 204 e2e (was 203); 109 contrast pairs (was 107).
- **Filter Grammar, the first contract: a new area, `guidelines/contracts/`, and `src/grammar/` in
  the core entry** (`guidelines/contracts/filter-grammar.md`, approved by Omkar on 1 Nov 2026). One
  way to say "these records, and not the others" for every surface that filters. A host declares
  its fields once with `defineFields`, each with one of 8 types and who could have set its values;
  `parseQuery` and `validateQuery` check the typed line, a link's `q=` and an agent's object
  against it, with the same errors in plain words, and never guess; each query has one text form
  (`queryToText`) and one readback sentence (`readback`). `evaluate` gives `unknown`, never "no",
  when a record lacks a field, and `leftOutQuery` builds the query that counts those records.
  Domains match on label boundaries, so `is-subdomain-of "northwind.example"` never matches
  `evilnorthwind.example`, and `contains` and `ends-with` on a domain don't compile; hidden
  characters are escaped wherever a value is shown, and ignored when matching an untrusted field.
  Eight functions, one error class and their types, exported from the package root, with no dependencies and no
  React, DOM or Node-only import; the pack gate runs them in plain Node from the installed package.
  13 rules, 11 with proofs: 4 compiler rules with 16 fixtures, and 7 runtime rules proved by 56
  unit tests in `src/grammar/`, among them a seeded property test of 400 queries over all 8 types
  and a brute-force check of `leftOutQuery` over 12,000 generated records. Experimental. The
  site shows the guideline under Foundations. The Override & Teach Panel's amendment follows in its
  own pull request.
- **`npm run rules:check` reads `guidelines/contracts/` as it reads `guidelines/components/`**, with
  the same tags, proofs and proof map, and prints each contract's count. It also no longer stops a
  Hard constraints section at its first capital Z: `\Z` is not an end-of-input anchor in JavaScript,
  and the grammar's `timeZone` was cutting its rules short. No component spec's count changed.
- **Site: a new Overview, the site's home (`#/`)**, approved by Omkar on 1 Nov 2026 from the
  playground thread's drawing. A hero with the name, the claim, the install line with its Copy
  button, and two calls to action (Browse components, the one primary; Open the Figma library);
  *Check it yourself*, five numbers each with the link to its proof; *Built for security
  products*, the three taxonomies shown with their own components and words; *Ways in*, six
  cards; *New in* the current version and *Specified, not built yet*, side by side; and a footer
  to the Roadmap, Governance, the Changelog and the MIT licence. The mark and the background
  behind the hero come in a second pass; the hero keeps an empty slot for the mark.
  - **No number on it is typed by hand.** The rules are counted from the specs' rule tags (the
    same 212 `npm run rules:check` counts), the checks from `demo/checks.json`, the contrast pairs
    from `PAIRS`, the runtime dependencies from `package.json`, the components from the catalog,
    the proposals from `guidelines/proposals/`, the taxonomy sizes from the kit's own types, and
    the version, release date and highlights from `package.json` and this file. A small Vite
    plugin, `scripts/vite-site-facts.mjs`, counts what the browser can't (the pairs, the
    dependencies, the release). Every counted value is marked `data-generated`, and a unit test
    renders the page, takes those away and the install line, and fails on any digit left
    (`src/styles/site-overview.test.tsx`). The stamp names the commit and the day the site was
    built.
  - **Two shell parts, each naming a gap in the kit:** `demo/shell/ActionLink.tsx`, a link with a
    Button's weight (the Button spec sends navigation to a link, and the kit has no link styled as
    an action), and `demo/shell/SeverityTag.tsx`, the Contextual Alert's look on one line (the kit
    has no small severity element, and six alerts would be six live regions). Both draw only pairs
    `PAIRS` already asserts; no pair is new.
  - **Release highlights.** Each release section in this file now opens with a `**Highlights:**`
    list of three, starting with 0.15.0, and the Overview shows them. `RELEASING.md` gains the step
    that writes them, and `npm test` fails while the current version's section has none.
  - e2e: the Overview's headings, every link's target, its Copy button, its layout at its own
    widths and no sideways scroll at 320px; All states renders the gallery; axe runs on both
    pages, in both themes. 1257 checks (was 1233): 991 unit and contract, 193 e2e.
- **Vela's brand groundwork (R31, part one): the pulse tokens, the release seed, the logo contrast
  pairs and a wording lint.** Approved by Omkar on 1 November.
- **Vela's own logo, the Pulse mark, and the mood background, in `brand/`** (R31, approved by
  Omkar on 1 November). The site now has a favicon; nothing else a visitor sees changes yet.
  - `brand/`: the three core masters (16, 24, 32px), the favicon and avatar in their squircle tile,
    the hero for dark and for light, the app icon, and the mood shader `mood-o.frag.glsl`, all
    copied unchanged. `brand/README.md` has the files, colours, geometry and rules. The folder is
    not in the npm package, and `verify-pack` checks that.
  - The favicon: `demo/public/favicon.svg`, a copy of `brand/vela-favicon-16.svg` (a unit test
    holds them byte-identical), linked from `demo/index.html` through the site's base path.
  - `npm run brand:stills` renders the four Overview stills (desktop 1600 × 520 and phone
    720 × 900, light and dark) as 2× PNG masters on SwiftShader, and encodes each as AVIF and WebP
    at 2× and 1× through Pillow (`scripts/brand/encode-stills.py`; Python with Pillow 11 or later,
    not an npm dependency): 16 files in `demo/public/brand/`, named with the release seed, from
    5.7 to 234.4 kB. A unit test holds every file to 250 kB, and another fails if their seed is not
    the package version's; `RELEASING.md` runs the script on a minor or major bump. The masters (4
    to 5.6 MB) are not committed; their hashes match the recipe's.
  - `markSeed(version)` in `scripts/brand/mark-seed.mjs` (not in the package): n = major × 100 +
    minor, lobes = n mod 24 (24 for 0, never under 3), step = lobes / 100. `applySeed` writes a
    seed into the shader as it loads; for 0.15.0 the shader comes back byte-identical, which a
    test checks, so the stored file is never edited.
  - Two tokens for the hero logo only: `--vela-duration-brand-pulse` (900ms) and
    `--vela-delay-brand-pulse-outer` (120ms), in CSS and Dart. They are the one exception to the
    under-300ms rule (`guidelines/foundations/motion.md`, "The brand pulse exception"): hero only,
    once per visit, never under reduced motion, never at 32px or below, never in anything built
    with Vela. A unit test fails if any file under `src/` binds them.
  - Four logo pairs in `PAIRS`, as graphics (3:1), by primitive name: white on primary-500
    (6.08:1), primary-500 on white (6.08:1), primary-500 on grey-50 (5.75:1) and primary-300 on
    grey-900 (7.05:1). The hero's outer ring at 75% opacity is measured as a composite: white over
    primary-500 at 4.17:1, primary-500 over white at 3.61:1.
  - A wording lint (`src/styles/wording.test.ts`): no sentence in the guidelines, the site source,
    `README.md`, `brand/` or `llms.txt` calls the logo a seal, or names the logo, the Pulse mark
    or the mood together with "secure", "security", "trusted", "verified" or "certified".
  - `DESIGN.md`: brand assets are the one place primitives are named directly, because they are
    images, not interface. `NOTICE`: the hash function in `brand/mood-o.frag.glsl` is after Dave
    Hoskins (MIT).
- **Site: the Overview's hero gets Vela's logo and the mood** (the logo states approved by Omkar
  at 09:34 IST and the Overview at 09:45 IST, 1 Nov 2026). Nothing in the npm package changes.
  - **The hero mark**, 128px beside the panel, and 96px above it when the hero stacks at 520px and
    below; never smaller, even at 320px. It is `demo/shell/ProductMark.tsx`, a shell part that
    stands in for Product Mark (spec draft, not in the kit), so it is never exported and the two
    pulse tokens stay out of `src/`. Its props are the spec's closed set as TypeScript unions, and
    `npm run typecheck` holds ten forbidden combinations (`hero` without `on`, `replay` without
    `decorative`, `animate` on `large`, `label` with `decorative`, and more).
  - **Drawn from `brand/`, never redrawn.** Each size imports its master as text and draws it as it
    is; the hero's inner ring, outer ring and dot are wrapped in groups so they can move. Gradient
    and filter ids are unique to each instance. A unit test holds every `d` to its file.
  - **The pulse plays once per visit**: on the first render of the Overview, not on a route change
    back to it, and again after a full reload. Pressing the mark (a button named "Play the pulse",
    with the kit's Tooltip) plays it once more; a press while it plays is ignored. Under reduced
    motion nothing plays on arrival, and a press fades the rings in over `--vela-duration-base`,
    with no scale. Hover and focus take the outer ring from 75% to 100%; held, the mark turns
    primary-600 on light and primary-300 on dark.
  - **The mood stills** are the hero's CSS background: AVIF first, then WebP, at 1× and 2×; the
    desktop still above 520px and the phone still at 520px and below; light or dark with the
    page's theme. Their names carry the release seed, which the site's facts plugin now reads from
    `package.json` (`MOOD_SEED`), so a new minor version asks for its own stills. The text stays on
    the solid panel, and the stills never hold it up. In forced colours they are dropped, and the
    mark draws in `CanvasText`.
  - **Five pairs in `PAIRS`** (107 now), which can now name a colour no token holds by its hex: the
    light hero, primary-500, on the light mood's three tones, #f7f9f9 (5.75:1), #eef2f2 (5.39:1)
    and #dde3e4 (4.69:1); held, primary-600 on #f7f9f9 (8.10:1); and the dark hero, white on
    grey-900 (16.13:1).
  - The site header still shows the name and no mark, so it gets no logo states yet.
  - Tests: 13 unit tests (the masters, the rings, the ids, the names, the pulse's state, the
    stills' URLs and seed) and 1 type test; 7 e2e tests (one pulse on load, none on returning,
    one per press, none overlapping; reduced motion; the replay's states; the sizes at 1440, 500
    and 320; the stills by width and theme, with the text shown while they load; forced colours,
    light and dark). The Overview has no visual baseline, and gets none here. 1394 checks (was
    1362): 1118 unit and contract, 203 e2e.
- **Patterns: a new area, `guidelines/patterns/`, and its first page, Copy** (`copy.md`, with nine
  figures in `copy/`). A pattern records the decisions a component can't make alone: who may read
  a secret, where the "last copied" mark lives, whether a row is clickable, whether the page copies
  what it shows or what it means. Copy was approved by Omkar on 31 October; it is Experimental and
  not built, because the Copy Button and Copyable Value it is carried out by are specified but not
  yet in `guidelines/components/`. The area is left out of the npm package until its components
  ship.
- **`pattern-cites-real-rules`, in `npm run rules:check`.** A pattern's Tests table names component
  rules with their levels, and states the components' totals. The check fails a rule no built
  component defines, a level that disagrees with the spec, and totals that don't add up; a
  component that is only specified is printed as not built yet. Five unit tests prove it fails
  when a pattern drifts (`src/styles/patterns.test.ts`).
- **Proposal: Override & Teach Panel** (`guidelines/proposals/override-and-teach-panel.md`).
  Turns one person's override into a lesson the agent keeps, only on purpose: the panel shows the
  person's words beside the agent's version, which cases the lesson covers, and whether it makes the
  agent stricter or more lenient, as meant and as a replay over already-reviewed verdicts shows. A
  lenient lesson needs an exact match on a value an outsider cannot set, may not overrule settled
  cases, and goes to a second person through the Approval Queue. Every lesson expires. 26 rules, 23
  with proofs planned; its six review answers were confirmed by Omkar on 31 October. Specced, not
  built.

### Changed
- **The site header's GitHub, npm and Figma links are Icon Button links** on a wide screen (Omkar's
  decision of 1 Nov 2026: the marks go live under Figma's Brand Book as written, without waiting for
  Figma's reply). GitHub's mark, npm's word and Figma's mark, each `size="regular"` with
  `opensInNewTab`, named "Vela on GitHub", "Vela on npm" and "Vela in Figma" (each with ", opens in
  a new tab"), with the same addresses as before; the label tooltip shows the name on hover and
  focus. On a phone the three stay written links in the menu, as before. Figma's clear space,
  20px, is kept by the layout: each 20px mark sits in a 35px box with no fill or border at rest or
  on hover (7.5px inside the box), and the three sit `--vela-space-15` apart, so npm's word is at
  least 22.5px from Figma's mark (27.4px measured at 1440px), and Figma is last in the row. No new
  literal in the site CSS. Four e2e tests replace the written-links one: the names, `target` and
  `rel`, and the phone menu; the tooltip on hover and keyboard focus, never a description, with no
  hover fill; the marks' computed colour, black in light, white in dark, and the link colour under
  forced colours; and the distance from Figma's mark to every other visible element in the header,
  at least 20px at four widths. The Overview's link test reads the header's Figma link by its new
  name. 1461 checks (was 1458): 214 e2e (was 211).
- **Who Vela is for, said once and the same everywhere** (Omkar's choice, from the refinement
  stage). The Overview's first line is now "For data-heavy products, built first for security
  consoles. Every rule that can be tested is tested before a change ships." README, DESIGN.md,
  ROADMAP, `llms.txt` and the package description say "a design system for data-heavy products,
  built first for security consoles" in place of "a token-first design system (for security
  products)". The old line shut out teams outside security, and "token-first" told a visitor how
  Vela is made, not who it is for; How it is made still tells that story.
- **Docs: stale facts corrected** (from the omkarux.com site thread's check). README: 290 tokens
  (was 285), the packed size measured again (279.8 kB, 254 files), the counts' note now says they
  describe `main`, and every component's Figma set is published, Dropdown List's included (since
  31 Oct). `llms.txt` says the same. GOVERNANCE.md lists the ten components that carry
  Experimental, instead of saying none carries a label. Flutter's README describes `VelaMotion` as it
  is: every motion token. Button's first line uses a colon, not a dash.
- **Site: the gallery that was the Overview is now All states (`#/states`)**, the last link in
  Start, its own chunk, titled "All states · Vela Design System". Its sections are unchanged, and
  the visual tests open it there: the screenshots are named by the tests' own arguments, so the
  committed baselines keep their names. Its header line now says the theme is set in Appearance,
  not the top bar, and its contrast-pair count is counted (it said 48; there are 98); its eyebrow
  says Start. Search still leaves Start pages out, All states with them.
- **`RELEASING.md`: the changelog step comes before the gate** (now steps 3 and 4), because the
  gate's unit tests read the release's highlights.
- **Proposal, Override & Teach Panel: a lesson's conditions use the Filter Grammar — breaking, to
  the spec only** (`guidelines/proposals/override-and-teach-panel.md`). The proposal is a written
  spec with no code, so no code changes. The five changes the grammar's guideline lists:
  `appliesTo.conditions` is a `PositiveConjunction<F>` over the host's `Fields`, with a new required
  `fields` prop for the `defineFields` schema; a condition no longer carries `fieldTrust`, `source`
  or `writtenBy`, because trust is the field's declared `trust`; `teach-lenient-needs-system-record`
  reads that trust from the schema; the readback is the grammar's `readback` with `markTrust`, so
  the host no longer passes one; and the operators are the grammar's positive ones for each field's
  type, so a `domain` field takes `is-subdomain-of` and never `ends-with`, which the panel used to
  allow on any field. `fromItem` moves out of the condition, which the grammar would reject, into
  `appliesTo.fromItems`, a list of `{ condition, item }` beside the conditions. Open question 6
  is closed for good. Still 26 rules, 23 with proofs; no rule id changed.
- **Filter Grammar: four follow-ups from the spec thread's answers** (`guidelines/contracts/filter-grammar.md`,
  *Details the build settled* and *Case folding*). Not yet released, so nothing breaks for anyone.
  - `leftOutQuery` throws a named class, **`LeftOutNotExpressible`** (it extends `Error`, and
    carries the `field` and `operator`), when the grammar has no words for the negation it needs.
    It is exported from the package root. A missing `now` stays a `TypeError`.
  - **`readback` takes `locale`** (BCP 47, default `"en-GB"`) as an option of its own, beside
    `timeZone`. It moved out of `strings`, which are only words now. The default prints
    "GMT+5:30" for Asia/Kolkata, and `locale: "en-IN"` prints "IST"; the guideline's examples
    that show "IST" say they assume it.
  - **Case folding is exact Unicode simple folding.** The 12 hand-picked mappings are replaced by
    a table generated from Unicode 17.0.0's `CaseFolding.txt` (the version Node 22 ships, checked
    against `process.versions.unicode`): the 198 code points where `toLowerCase` differs from the
    C and S mappings. The data file is vendored unchanged in `scripts/grammar/`, with its licence
    in NOTICE; `scripts/grammar/build-fold-table.mjs` writes `src/grammar/fold-table.ts`; and
    `fold.test.ts` runs all 1,512 C and S entries through the fold and checks every other code
    point folds to itself. Each code point is now folded on its own, so a word-final capital sigma
    no longer depends on `toLowerCase` reading context. U+0130 folds to itself and no longer equals
    "i" plus U+0307; U+0345, U+1C80–U+1C88 and U+FB05 now fold where they didn't. "ß" still
    doesn't match "ss". The table ships as `dist/grammar/fold-table.js`, 3.3 KB (0.9 KB gzipped); with the
    licence in NOTICE and the guideline's new words, the tarball grows by 4.3 KB, to 281.9 KB.
  - The examples read `severity is-one-of [major, critical]`: "High" is a Risk word, and
    Severity's six are success, info, warning, minor, major and critical. The tests' Severity
    field now has those six.
- **Patterns, Copy: paragraphs split to fit the site's 240-character limit** (from the icon thread).
  The opening paragraph is split between its two sentences. The Status paragraph is now a short
  line, with the status rule and the pressure-test note as two bullets under it and a blank line
  before "Carried out by". The section 5 bullet on a blocked copy is now two bullets. No words
  changed. Open question 3 is also shorter (the icon thread's wording), so no paragraph on the page
  is over the limit.
- **Site: the header and every page title say "Vela Design System"**, the full name the Figma
  thread's naming rule asks for once per page (Omkar kept the name on 1 Nov 2026). A phone's header
  shows "Vela"; its page title keeps the full name. The package stays `@omkarux/vela`.
- **Site: the first download drops from 512 kB to 308 kB, under the build's 500 kB warning** (B8).
  The nav, search and Status page read each spec cut to its facts (its title, first paragraph,
  Status line, "When to use" and rule tags), made at build time by a small Vite plugin,
  `scripts/vite-spec-facts.mjs` (`import facts from '…/button.md?facts'`), instead of all 17 specs
  whole. A component page loads its full spec with its own chunk. The cut is still markdown, so the
  same parsers read it, and a test checks it gives the same status, rules, title and "When to use"
  as the whole spec, for every spec. The build no longer warns about chunk size.
- **Figma: the Tabs hover preview, the Seed, has a variant** (R33). `State=hover` at both sizes
  is added to the published Tab set in place by the second extension,
  `scripts/figma/components/tabs.seed-hover.extend.figma.js`; the six variants that were there do
  not move. A hover tab is the default tab with its label and count in `text/default`, as
  `Tabs.css` draws a hovered trigger, and no underline. On its bottom edge is the Seed: an absolute
  frame `stroke/2` tall at the `opacity/preview` layer opacity, a third of the tab wide, never under
  `tab/preview-width-min` (bound as its minimum width) and never wider than the tab, centred. Its
  width is measured when the script runs, because no variable can hold a third of a width; the lint
  waiver says so. Inside it a "Soft ends" alpha mask, black and solid from 30% to 70% as the CSS
  mask is, softens a "Bar" in `border/active`. The Tabs spec's Figma mapping now says the hover
  preview is the `State=hover` variant, and the Tab description follows. The three Seed tokens were
  already in the token sync; nothing was held out.
- **Figma `--extend` also stops on a changed default** of a TEXT or BOOLEAN property (for example
  `Tab: default of "Count" changed from true to false`): instances that never set the property
  would change with it. A fourth fixture proves it. Each run, create and extend, now reports the
  nodes it added with their count (`Usage / Locked (3 nodes)`, an instance counting as one), so the
  library can be checked against the mock after a pass. A builder's own lint leaves the nodes its
  extensions add to each extension's lint, under that extension's waivers. The component dump
  records an absolute child's constraints, a mask, a bound opacity and a minimum width; a live dump
  saved before this needs reading again before it is diffed.
- **Site, slice 6b: the Copy page's second half** (`#/patterns/copy`, sections 5 to 13; playground
  spec, section 12). The page now carries all of `guidelines/patterns/copy.md`, and the note that
  sent readers to GitHub for the rest is gone. Each section leads with a live example:
  - **Secrets:** a masked sample key, fetched only at the press and never in the page before it,
    with a read count; the receipt gives its length; Clipboard blocked and May reveal switches,
    and Show key to copy opens a selected field with this platform's keys, which hides on copy,
    blur, Hide, or when the page is hidden.
  - **Commands:** an agent's command with a real right-to-left mark and curly quotes, made at
    runtime; the mark shows as an escape, two warnings say what is wrong, and the copy is exact
    with one trailing newline removed.
  - **Tables and groups:** 200 rows in the kit's Table, in a stand-in for CopyGroup
    (`demo/shell/CopyGroup.tsx`). The page now has one "Copied" mark, keyed by the value's
    identity, so it follows its value through a sort, and Rotate key turns it into "Changed since
    you copied". Every word the mark can show keeps its place, so nothing moves.
  - **Everyone gets the same story:** Keyboard and Reduced motion switches, a panel showing what a
    screen reader says, and three images captured in Chromium's forced-colours emulation.
  - **Motion:** the keyframe strip at 48 and 16 pixels, and a time scrubber that stops the real CSS
    transitions at any moment, with Play at 1× or 5× slower.
  - **Components, minimum width, tests:** the tables; the stage width control at 160px and 280px
    (it gains optional marks); and a proof link for any rule whose component is built, "not built
    yet" for the rest.

  A value the page doesn't show, like a fetched secret, now has a second try too: an off-screen
  field copied from and removed at once. Inline markdown renders code inside bold, and the Copy page
  reads single-asterisk emphasis. e2e covers each section; the unit tests cover the one mark, the
  right-to-left mark made at runtime, and the 240-character rule over the whole page.
- **Figma: a published set is extended in place, and the code holds it to that** (R18).
  Builders create and never update, because a rebuilt set detaches its instances, but until now a
  change to a published set had no route except by hand. It is now an extension,
  `scripts/figma/components/<builder>.<id>.extend.figma.js`, declaring `// @extends <builder>` and
  one `// @adds <node name>` per node it creates. `npm run figma:build <builder>` runs the builder
  and then its extensions in file-name order, so a fresh build and an extended file make the same
  tree and the drift diff still holds. `-- --extend` prints a script for a file that already has the
  sets: it says "Build <page> first" if they are missing, skips an extension whose nodes are all
  there, refuses one that is half there, and snapshots every node in the sets before and after,
  stopping with a list if any was removed, renamed, re-parented or moved among its siblings, if a
  property or option went away or changed type, or if the default variant changed. New variants go
  in free space with `appendVariant`; nothing that was there moves. The lint runs each extension
  twice in the mock (the first run extends with the snapshot unchanged, the second skips), refuses
  `.remove(`, `combineAsVariants(` and renaming a node it did not make, and applies the reviewer
  rules to what it adds. Three fixtures in `scripts/figma/__fixtures__/` prove the stop: a renamed
  variant, a removed layer, a moved default. The first extension is Dropdown List's Usage / Locked
  frame, moved out of the builder unchanged; the rebuilt tree is the same.
- **Figma lint: an alpha mask may carry an unbound gradient.** `raw-colour` allows a paint that is
  not bound to a variable only on a node with `isMask` whose paint is a gradient with every stop
  black; the stops' alpha may vary, because a mask draws only its alpha. A coloured stop on a mask,
  or the same black gradient on a node that is not a mask, still fails.
- **Figma: `opacity/*` variables are written as percents** (`opacity/scrim` 50, `opacity/preview`
  55). Figma's layer-opacity field runs 0 to 100, so a bound 0.5 reads as 0.5%, not 50%. The sync
  writes each OPACITY-scoped number ×100, its description says "percent in Figma, a fraction in
  CSS", and `tokens:figma:check` reads it back the same way. The CSS is unchanged (0.5 and 0.55).
- **Site, slice 6a: a Patterns section, and the Copy page's first half** (`#/patterns/copy`; playground
  spec, section 12). The nav gains Patterns, between Components and Project, which lists a pattern
  once its content is approved; Copy is the first. The page is its own chunk, loaded only when it is
  opened, and its words are read from `guidelines/patterns/copy.md`, so the two can't drift. It has
  the opening and sections 1 to 4, each led by a live example instead of a static figure: a Hosts
  table where each address can be copied; do, live, beside don't, drawn as a picture that never
  takes focus; one large control with a state scrubber (rest to failed) and a 5× slower speed; the
  words table, where each row's Show me puts a live control in that moment; and a value whose
  switches play out a blocked clipboard, an embedded app and each platform, saying "Simulated" while
  they are on and never touching the browser's settings. A blocked copy really fails, leaves the text
  selected and says how to copy it on that platform, in the Copy Button spec's own words. The
  examples are the icon thread's lab build of the copy-to-tick morph, ported as a shell part
  (`demo/shell/CopyMorph.tsx`), labelled "Experimental, not yet in the kit": CSS transitions on Vela's
  motion tokens, nothing animates from the keyboard, and under reduced motion (the system's or the
  page's own switch) the tick lands in one frame with no lean while the 1.5s hold stays. Sample
  secrets use an invented `vela_sample_` format, and hidden characters are made at runtime, never
  typed into the source. Two copy.md paragraphs are longer than the playground's 240 characters (the
  opening's first and the Status line); the page shows each as two, split between sentences, and the
  words are unchanged. Sections 5 to 13 follow in slice 6b. Unit tests hold the 240-character rule
  and the absence of hidden characters; e2e covers the nav, the switches, focus, a blocked copy, the
  single announcement, that nothing moves when the word Copied arrives (its place is kept while it
  is hidden), and the chunk; axe now runs on the page in both themes.
- **The pattern checker's fixtures get the same 30s allowance as the real-pattern check**
  (`src/styles/patterns.test.ts`). Each runs the rule checker in a child process, which can pass 5s
  on a loaded runner.
- **The Figma library is on Figma Community** ([Vela Design System](https://www.figma.com/community/file/1698367695704645041/vela-design-system), listed by Omkar on 31
  October 2026, shown as "Licensed under CC BY 4.0"). `LICENSE-DESIGN.md` and the README no longer
  say the listing is planned, and `RELEASING.md` step 9 adds the listing's own update after each
  library publish, because a listing doesn't follow the library by itself.
- **Site, slice 4: the Rules tab reads the proof map** (playground spec, section 8).
  `npm run rules:check -- --write <dir>` (and `npm run proofs`, which `dev` and `demo:build` run)
  writes one JSON file per component: each rule's level and sentence, the file and line of its
  proof, and for a compiler rule its fixture and the compiler's own error. The page fetches its own
  file. The tab groups rules by level ("Enforced by the compiler", "Checked at runtime", "Proved in a
  real browser", "Conventions") with a Show filter; each rule has its tag (a label), its id and a
  separate action: "Try to break it" shows the fixture and "What the compiler says if this rule is
  broken (TypeScript 5.9.3)", and "Open proof" links to the test at the commit the page was built
  from. A line above says which build that is. The map is generated, never committed. A unit test
  checks that every proof line names its rule.
- **Site: the Tabs stage shows ten tabs, and its width note no longer claims the "more" control.**
  The example is the playground thread's ten security views (Overview, Alerts, Assets, Identities,
  Policies, Devices, Reports, Audit log disabled, Sessions, Integrations), so the stage width control
  has a full row to narrow. The note under the toolbar said the "more" control is in the headless
  Tabs; it is designed but not built, and both implementations scroll the row today. The note now
  says that. A component that responds to its container no longer widens the stage to fit its
  content, so the width control's range is the stage's own width.
- **Site, slice 2b: the stage width control** (playground spec, section 5, "Stage width"). On a
  component whose layout follows its container's width, Tabs first, the stage toolbar gains a
  Container width field and slider (the arrows move 10px, Page Up and Page Down 50px, Home and End
  go to the ends), and a pointer can drag the frame's edge, never as the only way. Only the frame
  narrows, with a hairline and its width beside it; the stage keeps its size. The range runs from
  320px, since no built spec states a minimum as a number yet, to the stage's width. The width
  goes in the shared link as `w=`, a number clamped to that range. With the core Tabs, a line says
  that it scrolls when the row is full and that the "more" control is in the headless Tabs. On a
  phone, the field alone.
- **Site: Appearance's Custom reason is read once.** The Custom segment's description now points
  at the visible note under the group, instead of a hidden copy that a screen reader in browse mode
  could hear a second time (the playground thread's check of slice 5).
- **Site, slice 5: Appearance, a phone header and a pinned stage** (playground spec, sections 3, 6
  and 9). The header's theme control becomes an Appearance button that opens a side panel: Mode
  (System, Light, Dark) and Brand (Default; Custom unavailable, with its reason in view, until
  `createBrand`). The button's name says the state ("Appearance: theme Dark, brand Default"). On a
  phone the header holds Search and Appearance as icons, and GitHub, npm and Figma move into the
  menu as words; elsewhere they stay written links until the brand marks can ship together. On a
  phone tall enough, a component page's stage pins under the header as a strip while the controls
  scroll; it lets go while a text control has focus, "Expand stage" opens it at full height, and
  focus is never scrolled under it.
- **Site: each page is its own chunk, loaded when opened** (B8). The first download falls from
  1,185 kB to 512 kB minified (360 kB to 158 kB gzipped); the components' stages load with the
  component pages, and the MUI comparison with its own page. Nav and search read a new catalog of
  names and specs; the stage code stays in the registry. The first chunk is still just over the
  build's 500 kB warning: most of what remains is the 17 specs, which search reads.
- **Figma: Dropdown List says a locked item always shows its reason.** The guideline's *Figma
  mapping* gains the line "Locked: always show Meta with the reason; the lock never appears without
  it", which the sync carries into the set's description, and the builder draws a "Usage / Locked"
  frame beside the popup: a locked item with its reason in Meta, captioned. The set itself can't
  default Meta on for locked variants alone, because a Figma property has one default per set (the
  Figma thread tested it on a copy). No key or property changes.
- **Proposals: the Evidence Locker and the Verdict Card gain the Override & Teach Panel's two
  additive amendments.** The Locker's `memory` item may carry a `lesson`, which must be
  agent-written (`locker-lesson-is-agent-output` · compiler), so a claim resting only on a lesson is
  weak: 20 rules, 17 with proofs. The Verdict Card gains an optional `onTeach`, offered only after an
  override or an agreement with the lean, and names each lesson the agent says it applied
  (`verdict-lesson-named` · runtime): 29 rules, 23 with proofs. The nine proposals now plan 216
  rules, 174 with proofs.

### Fixed
- **Status Indicator: a labelled indicator had no accessible name.** With a visible `label` it
  still carried `role="img"`, and an image takes its name only from `aria-label`, so axe reported
  it (`role-img-alt`) and a screen reader could skip it. With a label it now has no role and its
  text is read as text, as its spec says ("the visible text is the accessible name"); with no
  label it is still an image named for its status. Found by axe on the new Overview and All
  states pages.
- **Site: plain links were the browser's blue and purple** (Fix 0 of the site evaluation). One
  rule in `demo/demo.css` makes every link in the site the link token, `--vela-text-link`, when
  unvisited, visited, hovered, focused and pressed; visited is never purple. The selector sits
  inside `:where()`, so it weighs nothing: every link that already has its own style (`.pg-lock a`,
  the navigation, cards, the action links) keeps it, and a before-and-after check of every link on
  every page, in both themes, changed only the ones that had been the browser's. They keep their
  underline: they sit in running text and tables, where the link token is 1.27:1 against body text
  in light and 2.03:1 in dark, so colour alone can't mark them. The search dialog's "Browse all
  components" sits on the raised surface, where the link token is 4.35:1 in dark: it is default
  text, underlined, as in `.pg-lock`. Two pairs join `PAIRS`: link text on a container (the
  playground's skip link) and on `bg-selected` (the current page in the navigation), both passing
  in both themes. e2e: on Status, All states and Not found, a plain link is the token's colour,
  underlined, at rest and hovered, in light and in dark.
- **Site: the Motion review's curve chart told its curves apart by colour alone**, and two of them
  were greys 1.57:1 apart. Each curve is now named on the chart, in its own colour, where it is
  alone (the three meet at the end value), and `ease-standard` is also dashed. e2e: the three
  names are inside the chart and clear of each other.
- **Site: How it is made said "52 contrast pairs"**; the build now counts them (111 today). It reads the count from the
  build (`virtual:vela-site-facts`), as the Overview and All states do. All states' "7 components"
  is now the length of the list of components the page shows, and a section's title must come from
  that list. A unit test holds both, and fails on any hand-typed count of pairs under `demo/`.
- **Site: the fourth status was called "Medium" on All states.** "Medium" is the middle of the risk
  score; the Status Indicator calls its `medium` status **Degraded** (`status-indicator.md`, rule
  `status-medium-is-degraded`). All states and the Overview now read each status's word from the
  component's own labels (`STATUS_LABELS`, exported from the component's module, not from the
  package), so the words can't be typed differently again. The Colour foundation now says that
  `medium` is a token and prop name only, shown as Degraded. No token or prop is renamed. All
  states also takes its severity, status and risk lists from the compiler-checked ones the
  Overview uses. The Status Indicator section's visual baselines change ("Status unknown" and
  "Degraded" in place of "Unknown" and "Medium") and are rewritten by the Visual baselines
  workflow. 1416 checks (was 1400): 1133 unit and contract, 210 e2e.

## [0.15.0] — 2026-10-31

**Highlights:**

- Dropdown List's unavailable items now say why, with a written reason.
- The lock icon means "can't be changed here", always with the reason beside it.
- Motion is decided: Toasts stack, and popovers and tooltips grow from what opened them.

### Changed
- **Icon: `lock` means "can't be changed or chosen here, for a reason written beside it"**,
  restricted or read-only by policy, or not with the other settings as they are. `lock-open` is
  never used on a value in a set. New convention rule `icon-lock-has-written-reason`: the glyph
  never appears without its reason in visible text beside it, because only the words tell the two
  readings apart. DESIGN.md's Locked line gains one sentence saying a locked value may carry the
  glyph. Decided by Omkar on 31 October; wording from the icon thread
  (`requests/icon-thread-to-repo-lock-meaning.md`).
- **Tabs' spec states `size`'s default, `regular`**, which both entry points already used.
- **DESIGN.md's Locked line covers a policy that applies to everyone**, and says a value a
  person's role may never have is not shown at all.
- **The motion values are decided.** `duration-travel`, `ease-out` and `ease-spring`, and the
  values below (the overlays' 0.96, the small controls' 0.9, the toast stack's step and scale),
  were approved by Omkar on 31 October from recordings of the Motion review page. They were
  provisional since 0.13.0. Decision 006 records it.

### Changed (Experimental, breaking)
- **Dropdown List: `locked: { reason }` replaces an item's `disabled?: boolean`.** A locked item
  can't be written without its reason, which shows in the meta slot and is heard with the name;
  `meta` and `locked` together don't compile, and neither does `disabled`. Icon's `lock` comes
  before a locked item's name. Migrate `{ disabled: true, meta: 'Why' }` to
  `{ locked: { reason: 'Why' } }`. The runtime rule `dropdown-list-disabled-not-chosen` is now
  `dropdown-list-locked-not-chosen`, and the convention rule `dropdown-list-locked-has-a-cause`
  is new: a locked item names a setting or a policy, and a value a person's role may never have
  isn't listed. Decided by Omkar on 31 October; the rule and examples are from the spec and icon
  threads (`requests/spec-thread-to-repo-dropdown-list-locked-alignment.md`). New pair in
  `PAIRS`: the lock on the highlighted row.
- **Figma: Dropdown List's `Disabled` axis becomes `Locked`.** The set was published with the
  0.14.0 library on 31 October. Its builder now draws the `Locked` axis and an instance of Icon's
  `lock` before a locked item's name. The library is edited in place to match after this release,
  so instances keep their variant. A builder may now declare `// @uses <builder>` to place
  another set's instances.

### Added
- **Motion pass, part 2: the Toast stack, overlays that grow from their trigger, state and press
  motion on the small controls.** No new token and no new prop. Thirty new
  rules, all `browser`, each with a Playwright proof that the part moves only by `transform` and
  `opacity` (the stack also uses the `translate` and `scale` properties), reads correctly at its end
  state under reduced motion, ends in the right state when re-triggered mid-flight, and does not
  animate from the keyboard. 212 rules (was 182), 53 of them `browser` (was 23).
  - **Toast** enters by travelling its own height in from the edge it sits on, at `duration-base` on
    `ease-out`, and leaves the same way, fading. Older toasts collapse behind the newest — each a
    `--vela-space-10` step back and 5% smaller — and spread out on hover or with keyboard focus in
    the region, on `ease-spring` over `duration-travel`, from Base UI's `--toast-index`,
    `--toast-offset-y` and `data-expanded`. **New rule: a collapsed stack never hides a warning** —
    while a warning sits behind the front toast the stack stays spread (`data-vela-spread`), because
    a warning never times out and would otherwise stay out of sight. A swipe follows the pointer and
    then carries on out from `--toast-swipe-movement-x/y`. From the keyboard (F6, Tab, Escape,
    Enter / Space on its buttons) nothing in the stack moves: the mark is now on the region, not the
    toast. The Toast API is unchanged.
  - **Popover and Tooltip grow from their trigger**: scale from 0.96 plus opacity on `ease-out`,
    pivoting on Base UI's `--transform-origin`. Popover at `duration-base` (it is opened deliberately
    and carries content); Tooltip at `duration-fast` (it has already waited `--vela-delay-tooltip`,
    and 180ms more reads as lag). Both still leave on opacity alone.
  - **Overlays enter on `ease-out`**, as part 1 said they would — Dialog and its backdrop included,
    whose step of rise is otherwise unchanged — and the MUI bridge's entering slot (`easeOut`) moves
    to `--vela-ease-out` with them, so the two never disagree in one app.
  - **Checkbox mark and Radio dot scale in** from half size as they fade in, at `duration-fast` on
    `ease-out`, keyed on Base UI's Indicator transition attributes; the old one fades out. Moved by
    the component that owns the state, never by an Icon.
  - **Checkbox, Radio Group and Toggle press** like a Button — pointer only, from the centre, in at
    `duration-instant`, out at `duration-base`, excluded for `:focus-visible`, with a counter-scaled
    guard that holds the hit target — but to `scale(0.9)`: 3% of a 16px box is a quarter of a pixel.
    With the guard removed, Chromium lost one of two edge presses on the Checkbox and both on the
    Toggle; with it, none. The Radio's edge presses landed with or without it (not yet examined).
  - **From the keyboard the small controls do not animate**: Space on a Checkbox, arrow keys and
    Space in a Radio Group (the mark is on the group, so the radio reached does not animate
    either), Enter and Space on a Toggle — whose knob used to slide from the keyboard, against
    `foundations/motion.md`. A shared internal hook (`src/lib/instant.ts`) sets `data-vela-instant`
    from the last input; a pointer clears it.
  - **The Motion review page** adds the Toast stack (raise a success, an info or a warning; the
    light frame's region at the bottom end, the dark frame's at the top end), a Popover and a
    Tooltip, and a Checkbox, a Radio Group and a Toggle, all reached by the ×5 slow-motion switch.
  - At rest nothing moves: the Toggle — the one part here with screenshot baselines — renders
    exactly as before, and the CSS for the press exists only under `:active`.
  - Not done, noted for later: the kit has no disclosure chevron and no copy-to-clipboard control
    today (the glyphs exist in the Icon set, but no component owns that state), so neither got
    motion; Table's sort glyph swap was left as it is.

### Fixed
- **The npm description and `llms.txt` gave the wrong rule count.** 0.14.0's npm page says 69 of
  170 rules are enforced by the compiler, and `llms.txt` said 69 of 178. The specs carried 180 at
  that release; 0.15.0 carries 212, and all three places say so. A test now checks the README, the
  package description and `llms.txt` against the specs' own tags.

## [0.14.0] — 2026-10-31

### Added
- **Tabs: a hover preview, the Seed.** When a pointer rests `--vela-delay-preview` (80ms) on an
  unselected, enabled tab, a short soft-ended bar fades in under it in the underline's 2px slot,
  in `--vela-border-active` at `--vela-opacity-preview` (0.55): a third of the tab, never under
  `--vela-tab-preview-width-min` (24px), never wider than the tab. It fades in over
  `--vela-duration-travel` on `--vela-ease-out` and leaves faster, at `--vela-duration-base` with no
  delay; a pointer sweeping across the row shows nothing. Never on the selected or a disabled tab,
  never from the keyboard, never on touch (`@media (hover: hover)` only). In forced colours it is a
  1px `CanvasText` line, never `Highlight`. No new prop; both implementations. The Seed is
  2.46:1 on the page (light) and is not asserted in `PAIRS`: it is a supplementary hint, and the
  spec and `scripts/contrast-core.mjs` say why.
- **Tokens:** `--vela-opacity-preview` (0.55, Figma `opacity/preview`, opacity scope, beside
  `opacity/scrim`), `--vela-delay-preview` (80ms, Figma `delay/preview`, beside `delay/tooltip`) and
  `--vela-tab-preview-width-min` (24px, Figma `tab/preview-width-min`, width/height scope). Not yet
  synced to the Figma library.
- New Tabs rules: `tabs-preview-rest-delay`, `tabs-preview-never-selected-or-disabled`,
  `tabs-preview-pointer-only`, `tabs-preview-size` and `tabs-preview-forced-colours` (browser), and
  `tabs-preview-decorative` (runtime).

### Added (Experimental)
- **Dropdown List — Experimental, `@omkarux/vela/headless` only** (`dropdown-list.md`; Base UI 1.9
  `Menu`). A short list from a button where one option is current and choosing another acts at
  once — a hidden tab, another saved view — and the list closes. Its first use is the Tabs overflow
  control, which a later change adds to `tabs.md`. Closed props: `label` (a required string, the
  menu's name), `trigger` (one element that renders a `<button>`, through Base UI's `render` as on
  Popover), `items` (a non-empty tuple of `{ value, label, meta?, disabled? }`, those four fields
  only), `value` or `defaultValue`, `open` or `defaultOpen` (each pair exclusive), `onValueChange`,
  `onOpenChange` and `align` `start | end`. The popup is `role="menu"` named by `label`, of
  `menuitemradio` items with exactly the current one checked; an item's name includes its `meta`
  ("Firewall, 1 new") and typeahead matches the name alone.
  - **Opening lands on the current item, however it opens** — a click, Enter, Space, Arrow Down or
    Arrow Up — and the next arrow key moves on from it, wrapping when it is the last; a disabled
    current item takes focus too. Base UI 1.9's `MenuRoot` passes no `selectedIndex`, so it lands
    on the first item (the last on Arrow Up) or the popup; until the first key or pointer move in
    the list, every focus it sends elsewhere is stopped and sent to the current item, whose own
    focus handler moves Base UI's `activeIndex` there as well.
  - A choice closes the list and returns focus to the trigger; choosing the current item does the
    same without calling `onValueChange`. A disabled item stays in the arrow-key order with
    `aria-disabled` and cannot be chosen. Escape, Tab and a press outside close it.
  - **Non-modal** (`modal={false}`): the page keeps its scroll and its accessibility tree, Tab
    leaves the list, and a press outside still reaches what it landed on.
  - A keyboard open or close carries `data-vela-instant` on the popup and on the trigger, until the
    next pointer interaction. In development, a trigger that is not a `<button>` throws a named
    error, and a `meta` that is a Severity, Risk, Status or Verdict word (ignoring case) warns. A
    value that matches no item, or no current value at all, throws a named error.
  - Popover's surface (raised, a border-default edge, radius 4, no shadow), `--vela-space-5` padding
    on every side so the focus ring is never clipped by the scrolling list (with matching
    `scroll-padding`). As wide as its longest row: at least 200px and the trigger, at most
    `--vela-popover-width`, never wider than the room it has; at most about ten and a half rows tall,
    derived from tokens. Names wrap in full, an unbroken one too, and the meta drops under a name it
    does not fit beside. A disabled name is `--vela-text-inactive` and its meta stays
    `--vela-text-default`; keyboard focus on it shows the highlight, pointer hover changes nothing.
    Under `(pointer: coarse)` items have `--vela-space-10` above and below. In forced colours the
    highlighted row is `Highlight` / `HighlightText` and the check `currentColor`.
  - It moves as the overlays do: opacity and a `--vela-space-5` step from the trigger on either side
    (keyed on `data-side`) at `--vela-duration-base`, opacity out, nothing from the keyboard, and the
    highlight changes at once.
  - **18 rules, 17 with proofs** — 5 compiler (13 fixtures), 10 runtime (29 unit tests), 2 browser
    (`dropdown-list-names-wrap` at desktop width and in a 260px viewport; `dropdown-list-forced-colours`
    under forced-colours emulation), 1 convention (`meta` is words, never a colour). Three more
    Playwright specs check the same promises in a real browser: the landing for every way of
    opening, the focus ring with the last item focused in a scrolled list, and the disabled item's
    highlight.
  - The Figma builder (`dropdown-list.figma.js`) draws the "Dropdown List item" set with axes that
    mirror the markup — `Highlighted`, `Current`, `Disabled` (false / true), a `Meta` boolean,
    `Label` and `Meta text` — and a one-size "Dropdown List" popup component of four item instances.
    It passes `components:figma:lint`; nothing has been built in Figma, so the `figma-map.json` entry
    is `state: "none"`. A playground page in the overlays run. DESIGN.md, `overview.md`, `llms.txt`
    and the README take Dropdown List off "Not yet specced", and `overview.md` gains a Dropdown List
    vs Select List vs Actions Dropdown disambiguation.
- **`--vela-bg-raised-hover`** (grey-100; dark grey-800), the highlighted Dropdown List item.
  `--vela-bg-hover` could not be used: in dark it is the raised surface itself (grey-850), so a
  highlight on it would show nothing (1.00:1). Three new `PAIRS`, light / dark: item text on the
  highlight 6.82 / 7.11 (text 4.5); the current item's check, `--vela-text-link`, on the raised
  surface 6.08 / 4.35 and on the highlight 5.39 / 3.50 (ui 3.0). The current item's name stays
  `--vela-text-default`: the link colour on the dark raised surface is 4.35:1, under 4.5:1 for text.
- **`--vela-dropdown-list-width-min`** (200px; Figma `dropdown-list/width-min`), the Dropdown List's
  minimum width. The stylesheets carry no waivers, so a new literal is a new token.
- **Figma pipeline:** the `Body/Strong` text style (SemiBold 14/21, bound to the body size, line
  height and the semibold weight), for the Dropdown List item's meta. Builders can declare a one-size
  component with `// @component`, linted, dumped and diffed like a set; the mock Plugin API models
  `createInstance()` and `setProperties()`, which refuses an unknown property or variant as Figma does.
- **`src/lib/dev.ts`**: `isDev()`, the development-time gate for checks that warn or throw, read from
  the `process.env.NODE_ENV` a consumer's bundler replaces.

### Changed
- **Tabs: a pointer press grows the underline in place; it no longer slides across the row.** The
  Seed under the pressed tab grows from its centre into the full underline on `--vela-ease-spring`
  over `--vela-duration-travel`, while the old underline shrinks back and fades under the old tab.
  The list-wide bar (`.vela-tabs__indicator`) is gone; each trigger now holds two empty
  `aria-hidden` layers, `.vela-tabs__seed` and `.vela-tabs__line`. The headless implementation no
  longer renders Base UI's `Tabs.Indicator`. Keyboard switches stay instant, reduced motion lands at
  the end state, a second press mid-flight retargets, and at rest the underline is still the
  selected tab's own border, so a still tab list renders as before. The rules that described the
  travelling bar are replaced, each keeping its promise for the new movement:
  `tabs-indicator-moves-by-transform` → `tabs-press-grows-in-place`, `tabs-indicator-retargets` →
  `tabs-press-retargets`, `tabs-indicator-reduced-motion-end-state` →
  `tabs-press-reduced-motion-end-state`, `tabs-indicator-rest-is-the-border` →
  `tabs-underline-rest-is-the-border`. `tabs-keyboard-switch-is-instant` now also says no Seed
  shows, and `tabs-underline-not-clipped` covers every Seed.
- The descriptions of `--vela-duration-travel` and `--vela-ease-spring` name the grow-in-place
  underline instead of the sliding indicator; their values are unchanged.
- **Motion rule 1 gains one exception: an icon glyph's own strokes may draw** (decision 004,
  `decisions/004-icon-strokes-draw`). Inside a `.vela-icon`, by transition only, on the one glyph a
  person just acted on, `stroke-dashoffset` may animate; `stroke-dasharray` and `pathLength` are
  set, never animated, with the gap at least the path's length, and a stroke that retracts fully
  also fades to `opacity: 0`, because a zero-length round-cap dash still paints a dot. `css:check`
  now accepts `stroke-dashoffset` in a transition only under a selector whose every match sits
  inside `.vela-icon` (not `.vela-icon-button`, not `:not()`/`:has()`, not across a sibling
  combinator), fails it everywhere else with "only an icon glyph's strokes may draw", and still
  fails it in `@keyframes` and fails `stroke-dasharray`. Inside `.vela-icon` a bare length is
  allowed in `transform-origin` and inside `translate()`, because it is a unit of the 24-unit grid;
  every other property is checked as before. The dash gap and the retract-to-transparent guard
  cannot be seen in CSS and are proved by browser-level rules in the owning component's spec. The
  decision rests on Chromium timings only: for one glyph the two techniques time the same (16.8ms
  worst frame, none over 20ms, at 1× and 4× slower CPU); at 100 glyphs dashoffset's worst frame is
  58.3ms against 33.4ms. WebKit, Firefox and real hardware were not measured. No component uses
  the exception yet.
- **Motion: a dwell is not motion.** A wait before something appears (the tooltip's delay) survives
  reduced motion; a delay that staggers the parts of one movement collapses with its durations, in
  the component's own reduced-motion rules. Under reduced motion a decorative hover pose is removed,
  not snapped, and the hover shows by colour alone. `base.css` is unchanged.
- **Button turns off the browser's tap highlight.** `-webkit-tap-highlight-color: transparent` on
  every Button but `text-link`, so a touch press on iOS and Android shows the press scale without a
  translucent box over it. A text link keeps the browser's highlight, its only tap feedback, and
  `.vela-root` does not set it, so a host's links keep theirs. A new `css:check` rule,
  `tap-highlight`, fails a stylesheet that styles `[data-vela-pressed]` without it (not waivable);
  where a rule uses `all: unset`, the property comes after it. Button is the only stylesheet with a
  press response today.
- **All eighteen Figma sets are published.** The library was published on 29 Oct 2026, twice;
  the second publish carried the 0.13.0 state. Every SETS entry in
  `scripts/sync-figma-descriptions.mjs` — Table's three sets among them — moves from `built` to
  `published` with its node unchanged, `guidelines/figma-map.json` is regenerated, and the Status
  page names each set and its page instead of "Built, not published". The nine components that
  stay Experimental keep their Status lines, reworded to say the set is published, each with its
  remaining condition: the API settling (Checkbox, Radio Group, Popover, Tooltip, Dialog, Toast,
  Table), an API review (Text Area), the kit's inline glyphs moving onto it (Icon). Each spec's
  Figma mapping section says its set is published, and `guidelines/llms.txt` labels Text Area and
  Icon Experimental, as it already did the others.
- **Risk Pill is Approved.** Its Status line said "Approved once the set is published"; the set
  is published, every Hard-constraints rule is tagged and proved by `rules:check`, its colour
  pairs are in `PAIRS` and its visual baselines are committed, so the Status line comes off.
  Seven components are Approved and nine Experimental (`GOVERNANCE.md`, `README.md`,
  `guidelines/overview.md`).

### Fixed
- **Correction to the 0.12.1 entry, 31 October 2026.** It says the Figma builders "now reproduce
  the library as it was corrected by hand on 9 October". Those corrections (Contextual Alert's
  status mark, Button's icon shape and Tab's count styles) were made by an AI session, not by hand.
  The 0.12.1 entry is left as released; this note is the correction (Figma thread, R19).
- **Toggle and Tooltip keep their edges in forced colours (Windows contrast themes).** Every
  background is replaced there, so the Toggle's track and knob drew nothing and the switch
  vanished, and the Tooltip's inverted fill went with it, leaving its text edgeless over the page.
  The Toggle's track now has a 1px `CanvasText` border and the knob a solid `CanvasText` fill; on
  is the `Highlight` pair, disabled is `GrayText`, and the focus ring is `Highlight`. The Tooltip
  takes a 1px `CanvasText` border. Both only inside `@media (forced-colors: active)`, so nothing
  changes elsewhere. New browser rules `toggle-forced-colours` and `tooltip-forced-colours`, each
  with a test that fails on the old CSS. Checked in Chromium's emulation only, not in a real
  Windows contrast theme.
- **Tabs: the selected underline renders 2px, as specified; it rendered 1px.** The tab list scrolls,
  so it clips at its padding box, and the underline overlapped the list's rule, a border outside
  that box: its lower pixel was cut. The rule is now an inset shadow inside the box, the triggers
  no longer pull 1px below it, and the sliding bar sits at `bottom: 0`. The list keeps its height.
  The pixel is inside the screenshots' 1% tolerance, so no baseline needed rewriting; the new
  browser rule below is what catches it.
- **Tabs in forced colours (Windows contrast themes): the selected tab can be found again.** The
  browser turned every tab's transparent border into a visible underline in the text colour, so
  every tab looked selected. Tabs now has forced-colours rules: the selected label and underline
  are `Highlight`, no other tab has an underline, disabled is `GrayText`, the focus ring
  `Highlight`, the rule a `CanvasText` border. Checked in Chromium's forced-colours emulation;
  not yet on Windows itself.
- New browser rules `tabs-underline-not-clipped` and `tabs-forced-colours-selected`. The CSS
  checker now accepts a ±1px hairline drawn as a `box-shadow`, as it does for borders.

## [0.13.0] — 2026-10-29

### Changed — breaking
- **`@omkarux/vela/tokens.json` has a new shape (DTCG 2025.10).** In 0.12.1 a colour's `$value`
  was a hex string, vendor data sat under `$extensions.vela`, and the file carried the light
  values only. Now a colour's `$value` is `{ colorSpace, components, hex }`, a duration is
  `{ value, unit }`, aliases are full paths, vendor data sits under `$extensions["com.omkarux.vela"]`,
  and dark mode is an overlay in the new `./tokens.dark.json`, combined by `./tokens.resolver.json`.
  A tool that read `$value` as a string must read `$value.hex`. The CSS custom properties, the
  Dart file and the MUI theme are unchanged: no `--vela-*` property was renamed or removed between
  0.12.1 and this release. (The DTCG entry under Added says every generated
  target is byte-identical; that holds for the generated targets, not for the JSON source, which
  ships.)

### Added
- **Awareness Clock — proposal, not built** (`guidelines/proposals/awareness-clock.md`). Records
  when a named person became aware of something reportable under the Cyber Resilience Act, NIS2
  or DORA, and counts every reporting limit from the right moment. "Report received" and "first
  detected" never start the clock; awareness is a press that freezes the evidence known then, and
  only a person answers, presses and signs. Every limit is worded as an outer limit ("without undue
  delay; at the latest …"), hours are counted as UTC instants at the earliest reading, and a
  platform time that differs from the law's is shown beside it. Each deadline cites its article as
  published, with the date it was read. Time pressure carries no colour. 20 rules, 17 with proofs;
  three closed sets without tokens (Regime 4, Answer 3, Claim check 3). Eight proposals now hold
  188 rules, 149 with proofs.
- **Proposals: one weak-claim wording across the Evidence Locker and the Verdict Card**, from a
  table in the Locker that the card follows word for word (coverage line, withheld-Accept sentence,
  text summary). The Calibrated Confidence Gate's Limits now say a record belongs to an agent
  version and a model, its Built from names the Agent Provenance Badge, and its Changes section
  separates what was public before the badge from what the badge added. None of these is breaking.
- **Motion pass, part 1: an entering curve, a spring, and a sliding Tabs indicator.** Three motion
  tokens, all **provisional until the owner has reviewed their feel**: `--vela-ease-out`
  `cubic-bezier(0.25, 1, 0.5, 1)` for things that enter (starts at four times the average speed,
  93% there at half-time, no overshoot); `--vela-duration-travel` 240ms for travel across a
  distance; and `--vela-ease-spring`, a spring (stiffness 1200, damping 56, mass 1 — damping ratio
  0.81, 1.3% overshoot, 95% there in about 100ms) that `scripts/spring.mjs` solves and writes as a
  CSS `linear()` easing over `duration-travel` at token build time (27 stops). DTCG has no spring
  type, so the token's `$value` is its fallback (`{motion.ease-out}`) and the physics sit in the
  vendor extension; the stylesheet declares the fallback and then the spring under
  `@supports (transition-timing-function: linear(0, 1))`. Flutter gets `easeSpringStiffness`,
  `…Damping` and `…Mass` for a `SpringDescription`; Figma gets the fallback curve (resolved, not
  aliased) with the physics in its description. `--vela-ease-standard` stays the curve for things
  that move on screen; the overlays and the MUI bridge still enter on it and move to `ease-out` in
  a later part. 283 tokens (was 280).
- **Tabs: a sliding selected indicator, on both implementations.** A pointer press slides the
  underline to the new tab on the spring by `transform` alone (`translateX` and `scaleX` of a
  full-width bar); a second press mid-flight retargets it; a keyboard switch is instant, colours
  included (`data-vela-instant`). At rest the underline is still the selected trigger's own border
  — the bar is visible only in flight — so the screenshot baselines do not move (checked locally:
  the Tabs section is byte-identical to `main` at four widths in both themes, before and after a
  switch). The core measures the tab itself; the headless implementation uses Base UI's
  `Tabs.Indicator` and its `--active-tab-left`. Five new rules, all `browser`, with Playwright
  proofs on both implementations: moves by transform, keyboard is instant, retargets, reduced
  motion lands at its end state, at rest it is the border. The trigger no longer transitions
  `border-color`.
- **A Motion review page (`#/motion`).** The Tabs indicator in both implementations and both
  themes, a Replay that presses the tabs the way a pointer does, a ×5 slow-motion switch (it sets
  `playbackRate` on the page's running animations and touches no component CSS — a review aid),
  the three curves plotted, and every motion token with its value and reason, read from the token
  file.
- **`css:check` now checks motion.** A transition of anything but `transform`, `opacity`, `filter`
  or a colour fails, as does `all` or a bare duration (which means `all`); inside `@keyframes` only
  the moving properties are allowed. Every existing stylesheet passes.
- **Every Figma set is in the library file.** The Figma thread built the nine new sets from
  their builders at `main` 60d80ef (Text Area, Icon, Checkbox, Radio, Table's three, Popover,
  Tooltip, Dialog, Toast) and rebuilt Risk Pill, whose variants now read Low / Medium / High. The
  map (`guidelines/figma-map.json`) records each set's node and `state: 'built'`; six remain
  `published` from 0.12.1, and all eighteen become published at the next library publish. The
  component Status lines say so, and the Status page will show "Built, not published" for them.
- **Toast's Figma description imports what its example uses.** A SETS entry may list `imports`;
  Toast's import line is now `import { ToastProvider, useToast } from '@omkarux/vela/headless'`,
  because its example opens with `<ToastProvider>` and an agent copying the old line got
  "ToastProvider is not defined".
- **Table — Experimental, `@omkarux/vela` (core, zero dependencies).** The primitives a console's
  data views are built on (`table.md`), presentational on purpose: no data fetching, no
  virtualisation, no sort state. Compound parts on native elements — `Table` (required `caption`
  string, `captionHidden`, `density` `comfortable | compact` (DESIGN.md's two steps), `layout` `auto | fixed`,
  `stickyHeader`), `Table.Head`, `Table.Body`, `Table.Row` (`selected` → `aria-selected` plus a
  `border-active` start marker, `aria-current`), `Table.HeaderCell` (`scope` `col | row`, `align`,
  `sort={{ direction, onSort }}` rendering a real button named "Last seen, sort ascending" and
  `aria-sort` on the sorted column only; `onSort` receives the direction the name promised),
  `Table.Cell` (`align`, `numeric` → tabular numerals, end-aligned) and `Table.Empty` (required
  message). The wrapper is an inline-size container, so a wide table never widens its host; it
  scrolls inside a `role="region"` labelled by the caption and always focusable. No `striped`
  prop: zebra competes with the hover and selected tints and reads as grouping. 19 rules —
  nine compiler (twelve fixtures), five runtime, two browser (the scroll stays in the region, a
  mutant without the container fails it; the sticky header pins), four convention. A Figma
  builder declaring three sets (Header Cell 16 variants, Cell 4, Row 8; no waiver; each TEXT
  property writes one word in every variant, so none collapses under `text-property-collapse`;
  Figma state `none`, with the Cell and Row sets under `also` in the map, each described with the
  same import and the part it is) — the builder
  pipeline now accepts more than one `// @set` and `--set=<name>` on dump, read and diff — and a
  playground page whose host owns the sort and the selection.
- **Two row surfaces and a primitive.** `bg-row-hover` (grey-50; dark grey-900) and
  `bg-row-selected` (new `blue-50` #f2f7fd; dark blue-950), because the existing ones fail a
  console row: `bg-selected` puts the `unknown` status dot at 2.97:1 and de-emphasized text at
  4.20:1, `bg-hover` in dark puts links at 4.35:1. 19 new `PAIRS` (text, secondary text, link,
  marker and all five status dots on both rows, and the unsorted sort glyph) pass in both themes;
  the tightest shipped pair is now the `unknown` dot on a selected row at 3.22:1 (was the input
  border at 3.29:1), recorded in `DESIGN.md` and `foundations/color.md`. Rule count, with Icon and
  Text Area merged: 43 of 93 rules are enforced by the compiler.
- **Toast — Experimental, `@omkarux/vela/headless` only** (`toast.md`; Base UI 1.9 `Toast`). A
  floating, polite confirmation that something already happened — and, as the spec and the agentic
  specs that depend on it say, never the only record of it, never the only place an Undo lives, and
  never a decision. `ToastProvider` (`placement` `bottom-end | top-end | bottom-center`, `limit`
  `1 | 2 | 3`, `label`, `dismissLabel`) renders the region; `useToast()` returns
  `add({ title, description?, severity?, action? })` and `dismiss(id)`, and throws a named error
  outside a provider. `severity` is the Severity taxonomy's `success | info | warning` only: minor,
  major and critical are events to read and resolve in a Contextual Alert, a failure belongs where
  the work is, and a Risk or Status value does not compile. At most one `action`, a
  `{ label, onClick }` — a shortcut to something that also exists on the page — rendered as a tiny
  standard Button that dismisses the toast. The caller sets no timing and no priority: a `success`
  or `info` toast with no action leaves after `--vela-duration-toast` (read from the stylesheet);
  a `warning`, and any toast with an action, never times out (WCAG 2.2.1). Hover, focus in the
  region and F6 pause every timer and resume with the time left; F6 reaches the region from
  anywhere, Escape dismisses the focused toast, a new toast never takes focus, and every toast is
  announced politely — assertive would need major or critical, which a toast never carries.
  Eighteen compiler fixtures (seven rules), ten runtime rules, one browser rule
  (`toast-stays-in-viewport`), three conventions, a Figma builder (Severity, three variants;
  each title is a `Title` layer per variant, not a TEXT property, so none collapses; no waiver) and a playground page whose Undo is the page's own. Rule count, with Table merged: 64 of
  147 rules are now enforced by the compiler.
- **Toast tokens.** `toast-width` (360, so a 400px viewport less its `--vela-space-20` gutters is
  exactly one toast wide) and `duration-toast` (6000ms — a dwell, not an animation; the
  reduced-motion collapse never touches it). Three new `PAIRS`, the success, info and warning marks
  in their own icon colour on `bg-raised`: 8.03 / 7.00, 7.45 / 5.87 and 5.83 / 9.62. The action is a
  standard Button rather than a text-link because the link colour on the dark raised surface is
  4.35:1. `contextual-alert.md` and `dialog.md` stop calling a toast "not in this kit", and the
  guidelines test asserts no spec does.
- **Popover — Experimental, `@omkarux/vela/headless` only** (`popover.md`; Base UI 1.9 `Popover`).
  A non-modal panel anchored to the button that opened it. Closed props: `trigger` (one element,
  rendered through Base UI's `render`, so a Vela Button keeps its own behaviour), `title` a
  required string wired as the `role="dialog"`'s name, `placement` `top | bottom | start | end`
  (logical: `start` / `end` are Base UI's `inline-start` / `inline-end`), `align`
  `start | center | end`, `size` `regular | wide`, `open` or `defaultOpen`. Focus moves to the first
  control on open and back to the trigger on close; Escape, a press outside and Tab leaving it close
  it; the page keeps its accessibility tree and its scroll. No shadow: no elevation token exists, so
  the `--vela-border-default` edge separates it, asserted against page and container. Seven compiler
  fixtures (five rules), four runtime rules, a Figma builder (Size, two variants) and a playground page.
- **Tooltip — Experimental, `@omkarux/vela/headless` only** (`tooltip.md`; Base UI 1.9 `Tooltip`).
  A supplementary text label: `content` is a `string` (the compiler rejects a link or a button),
  `children` exactly one element. Where Base UI treats a tooltip as visual-only, the spec makes it a
  description — `role="tooltip"`, wired to the trigger by `aria-describedby` only while rendered —
  and throws a named error when the trigger has no accessible name of its own, so a tooltip can
  never be the only name of an icon-only control. Hover waits `--vela-delay-tooltip`, read from the
  stylesheet; keyboard focus opens it at once; Escape dismisses it. Never on a disabled control
  (convention, with the wrapper documented). Five compiler fixtures (three rules), four runtime
  rules, a Figma builder (Lines one / two, so the width cap is visible; each variant's sentence
  sits in its own `Content` layer, with no TEXT property, which the `text-property-collapse` lint
  forbids for differing texts) and a playground page.
- **Dialog, with `variant="alert"` — Experimental, `@omkarux/vela/headless` only** (`dialog.md`;
  Base UI 1.9 `Dialog` and `AlertDialog`). A modal for a decision that blocks the task: focus
  trapped and returned, the page `aria-hidden` and scroll-locked, Escape closes it, a press on the
  backdrop closes a standard dialog. `title` required, `description` a string, `size`
  `regular | wide`, a `footer` slot and `Dialog.Close` (with Vela's own provider guard). The
  `alert` variant fixes its actions — `cancelLabel`, `confirmLabel` and `onConfirm` are required and
  `footer` is forbidden by the types — renders the confirm as the destructive Button, focuses the
  cancel, ignores the backdrop and treats Escape as the cancel. The header, the body and the footer
  are laid out so only the body scrolls, proved in a real browser (`dialog-body-scrolls`). Eleven
  compiler fixtures (six rules), six runtime rules, one browser rule, a Figma builder (Variant x
  Size, four variants; the title is a `Title` layer per variant, not a TEXT property) and a playground page.
- **Overlay tokens.** `bg-scrim` (black) drawn at `opacity-scrim` (0.5) — a number, because
  primitives are opaque and the Figma sync carries opaque colours only; `text-tooltip` (white) on the
  existing `bg-tooltip`; `popover-width` / `-wide` (280 / 400), `dialog-width` / `-wide`
  (480 / 720), `tooltip-width-max` (240); `layer-overlay` (z-index 1000); `delay-tooltip` (600ms,
  Base UI's default). Five new `PAIRS`, all passing in both themes: the overlay title on
  `bg-raised` (16.98 / 13.10) — the body on it (7.69 / 8.84) is the agentic specs' pair, kept
  once — the overlay edge on the container (3.07 / 3.29), tooltip text (11.14 / 7.69) and the Dialog's close glyph at rest and hovered. Body copy on an
  overlay is `text-default`: `text-de-emphasized` on the dark raised surface is 3.99:1. The Dart
  generator now emits a sizing-group number as a `double`; the Figma sync scopes the opacity to
  OPACITY and the layer to no picker.
- **Portalled overlays keep the kit's styling and the trigger's theme.** The portal element carries
  `vela-root` and copies the `data-theme` of the trigger's nearest themed ancestor, so the font, the
  global focus ring and the reduced-motion collapse reach a popup on `<body>`, and a popover opened
  from a dark sidebar in a light app is dark. An open or close from the keyboard is marked
  `data-vela-instant` and does not animate. Modal and Tooltip leave the "not yet specced" lists in
  `overview.md` and `DESIGN.md`. Rule count, with Table merged: 57 of 126 rules are now enforced by the compiler.
- **Test setup: no more nwsapi recursion on top-layer selectors.** jsdom's selector engine (nwsapi
  2.2.27) answers `:modal` / `:popover-open` / `:fullscreen` by recursing into itself until the
  stack overflows, which cost seconds per Floating UI position update; `src/test-setup.ts` answers
  them `false` (jsdom has no top layer). Browsers are unaffected.
- **The Calibrated Confidence Gate is public, as a proposal** (21 rules, 17 with proofs). It owns the
  Confidence band taxonomy and decides, through `gateBand(reading, now)`, which band the kit may act
  on: a stated band counts only once at least 30 person-reviewed conclusions for the same agent
  version, in a window no older than 30 days, confirm it. Calibration is shown as counts with dates,
  never a percentage. **Breaking change to the Verdict Card proposal:** `confidence` is now a
  `ConfidenceReading`, Accept follows the Gate's band, and the card drops to 28 rules (22 with
  proofs). The Autonomy Ladder documents `RouteInput.confidence` as the Gate's band.
- **The Evidence Locker and the Agent Provenance Badge are public, as proposals**, with the four
  amendments they make, published together so each amended proposal breaks once. The Locker (19
  rules, 16 with proofs) shows everything an agent used for one conclusion, as it was then: how each
  item reached the agent (Evidence channel: `tool-call`, `given`, `memory`) and who could have
  written it (Content trust: `system-record`, `agent-output`, `untrusted`), with untrusted text
  inert, its hidden characters and look-alike domains made visible, and a claim about the world
  that cites no system record flagged by `weakWorldClaims`. The badge (15 rules, 12 with proofs)
  says which agent and version produced an output, which model answered, what started the chain,
  on whose authority the run acted, and whether the platform verified the agent's identity;
  `provenanceAttributes(p)` lets a host mark the output itself. **Breaking changes to four
  proposals:** the Verdict Card takes one `evidence` object in place of `examined` and `notSeen`,
  withholds Accept on a weak claim about the world, and takes `source: Provenance`; the Action
  Impact Card's `proposedBy` is an agent with a `Provenance` or a person by name; the Autonomy
  Ladder's `agent` gains a required `id`; the Calibrated Confidence Gate's `producer` gains `id` and
  the answering `model`, and its record is keyed by agent version and model. Rule counts of the
  amended four do not change. Seven proposals now carry 168 rules, 132 with proofs.
- **Text Area** — multi-line entry, Input's sibling, in the core entry with no dependency.
  Closed props mirroring Input (`label` required, `value` / `defaultValue` exclusive, `error`
  a message, `size` Input's three), plus `rows` (the minimum height in lines), `resize`
  (`vertical` or `none`; there is no horizontal and no both) and `maxLength` with a live
  `n / max` count. The count and the limit are both measured in code points, so an emoji is one
  character in each; the native `maxlength`, which counts UTF-16 units, is not used. The count
  is spoken by a polite live region only once 10% or less of the limit remains. Nine rules: five
  `compiler` with six fixtures (`text-area-label-required`, `text-area-controlled-exclusive`,
  `text-area-error-is-a-message`, `text-area-resize-closed`, `text-area-size-closed`), three
  `runtime` (`text-area-describedby-only-rendered`, `text-area-count-in-code-points`,
  `text-area-count-announced-near-limit`) and one `browser`
  (`text-area-never-resizes-horizontally`: a drag on the handle moves the bottom edge only and
  stops at `rows`, even under a host `textarea { resize: both }`). Binds Input's tokens and adds
  none, so no new colour pair. A Figma builder (12 variants, Size x State, clean under the
  reviewer lint with no waiver) and a playground page; not on the Overview page, so no visual
  baseline moves. Status: Experimental until its Figma set is published. Rule count 34 of 73
  compiler-enforced, was 29 of 64.
- **A monospace family and the `Mono/Meta` text style**, requested by the Action Impact Card
  spec. `--vela-font-family-mono` is a system stack — `ui-monospace, "SF Mono", "Cascadia
  Mono", "Roboto Mono", Menlo, Consolas, monospace` — so no web font is downloaded; it is
  `raw` like the other two families, which the Figma variable sync skips by type. Figma gets
  the text style `Mono/Meta`: Body/Meta's size, line height, weight and tracking variables in
  Roboto Mono, the stack's Google-hosted member. Flutter carries `fontFamilyMono` ('SF Mono')
  with its fallbacks; the MUI bridge is unchanged. 265 tokens, was 264 (the README's "242" had gone stale and
  now says 265).
- **Four contrast pairs the agentic-component specs rely on**, asserted in both themes:
  `--vela-text-default` on `--vela-bg-raised` (7.69:1 light, 8.84:1 dark), on
  `--vela-bg-selected` (6.59 / 11.12), `--vela-text-heading` on `--vela-bg-selected`
  (14.54 / 16.48) and `--vela-border-active` on `--vela-bg-container` as UI (5.39 / 5.06). All
  pass with no token change; `PAIRS` is 59, was 55.
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
  (30, 22), the Autonomy Ladder (28, 22) and the Approval Queue (27, 21), with four new closed taxonomies: Verdict, Confidence
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
- **Tabs: no stray vertical scrollbar, and the selected tab keeps its colour under the pointer.**
  The tab list scrolled sideways with `overflow-x: auto`, which left `overflow-y` on auto too; the
  underline's 1px past the padding box became a vertical scroll range, and a touch browser drew a
  grey scrollbar at the end of the list. It is now `overflow-y: hidden`, which clips the same
  pixels. Hovering the selected tab no longer dims its label from the link colour.
- **Playground: the Tabs stage holds the tab list still.** The frame centred a body that hugged
  its content, so a panel with shorter text moved the whole list sideways and up or down on a
  switch. The body now takes the frame's width and sits at the top. A new e2e test holds the
  list's position across a switch, on both implementations, at phone width.
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
- **The Risk Pill builder labelled every variant "Low" — in the live file, "High".** A Figma text
  property holds one default for the whole component set, so binding each variant's `Label` layer
  to one `Label text` property and writing Low, Medium and High showed the last word written in
  all six (seen live as High / High / High). `risk-pill.figma.js` no longer adds the property: each
  variant keeps its own level word in its `Label` layer, overridden on the instance. The spec's
  Figma mapping row now reads `Label` (text layer, override on the instance) → `label`. The mock
  Plugin API models the one-default rule, and a new lint rule, `text-property-collapse`, fails any
  builder that binds a text property in variants whose texts differ; Toggle, Checkbox and Radio,
  which write the same word in every variant, still pass.
- **The Figma descriptions did not say what to import.** The CODE block of every component set's
  description now starts with the import line from `guidelines/figma-map.json`
  (`import { Button } from '@omkarux/vela'`; Checkbox and Radio from `@omkarux/vela/headless`), Tab
  and Radio add "This set is one Tabs.Trigger." / "This set is one RadioGroup.Radio.", and a line
  before the block says "Use the library component; do not rebuild it from this frame."
- **A re-run of the Changelog or Status page builder turned the page frame black.** Re-assigning
  an identically bound paint to the reused frame left its colour at the `{0,0,0}` placeholder in
  the real file. `pageFrame()` now clears the fills before setting `surface/global` again (the
  frame is the only node a page builder reuses). The mock keeps the placeholder in that case, so
  the twice-run page test fails without the clear.
- **The Status and Changelog pages had three data errors.** Risk Pill's Figma set read "None yet —
  the builder is ready" though its set exists in the file. Each entry of the set table now has a
  `state` from a closed set — `published` (the six live sets, with their node ids), `built` (in the
  file, not published: Risk Pill, node null until the rebuilt set's id is known) or `none` (no set
  yet: Checkbox, Radio Group, Icon) — and the page shows "Built, not published" for Risk Pill;
  `figma-map.json` carries `state` and `node`. "(branch)" was added to every spec first named in
  the Unreleased entry; it now marks only a spec that is not on `main` (checked against `main`,
  then `origin/main`). The Changelog page showed 0.1.0's lead-ins as bare labels ("Components:")
  and dropped 0.3.0's "Companion Figma library" and 0.1.0's "Accessibility decisions worth
  recording"; a lead-in ending in a colon now carries its line to the first sentence end, and a
  section of bullets without bold lead-ins is kept, each bullet shown by its opening.
- **The page stamp said "HEAD" on a detached checkout.** In CI, `git rev-parse --abbrev-ref HEAD`
  prints `HEAD`, which the stamp and a branch link then used as a branch name; it now falls back
  to `main`.

### Changed
- README: shields.io badges for CI, the npm version and the licence (static badge URLs, no new
  service), a "Project files" section linking the files above, and a status line stating that
  the lifecycle labels exist and which components carry which.

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
