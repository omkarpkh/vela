# The display face is Open Sans; Oswald retires from the default

**Decided 6 November 2026. Omkar made Open Sans Vela's default display face and retired Oswald
from the default. `--vela-font-family-display` is now `"Open Sans", -apple-system, sans-serif`, and
it stays a brand setting a white-label theme may re-point, under one rule: a brand may choose a
display face for headlines and brand moments, never for numbers people compare. Wherever the
display face shows a number, the figures are tabular, and a CSS check holds the kit and the site to
it. Shipped in 0.16.0.**

The screenshots in `media/` were taken by `shots.mjs`, beside this file; its header says how to run
it. The full set of 32 (four places, two widths, two themes, before and after) was taken for the
review and is summarised under *The measurements*; the four kept here are the ones that show
something.

---

## What started it

Since its first release, Vela's typography named two families: Open Sans for all UI text, and
Oswald, a condensed face, "for large stat and number displays only" (`DESIGN.md`,
`foundations/typography.md`).

On an earlier enterprise design system the owner led, big numbers had been set in Oswald and were
moved to Open Sans, for two reasons:

1. **Oswald's narrow figures were hard to read and to compare** in dense tables and stat cards.
2. **Two families side by side looked mixed up** when Open Sans was already the body face.

Vela's use of Oswald was exactly the use dropped there. That was the request: make Open Sans the
default display face, and keep the display face as something a brand can change for the
white-label plan.

Two facts about the repository, found while making the change, set its size:

- **Oswald was never loaded.** `demo/index.html` asks Google Fonts for Open Sans 300, 400 and 600
  only, and no stylesheet or theme in the repository loads Oswald. Unless a reader had Oswald
  installed on their machine, the site already drew these numbers in Open Sans, the second family
  in the old stack. The committed visual baselines were drawn the same way.
- **Nothing in the kit binds the display face.** No component stylesheet under `src/` uses
  `--vela-font-family-display`. Four rules on the site do: the Overview facts (`.ov-fact__n`), the
  How it is made step numbers (`.how-step__n`) and check count (`.how-checks__number`), and the
  Foundation page's display sample (`.fd-face--display`).

## What was considered

Criteria, stated before the options: (1) figures easy to read and compare at a glance; (2) one
family beside the body text by default; (3) the display face stays a brand setting for the
white-label plan; (4) no new font; (5) no change to the public API, so the token keeps its name.

| Option | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| A. Keep Oswald, and load it on the site so it is actually seen | no | no | yes | yes | yes |
| **B. Open Sans as the default display face; a brand may re-point it for headlines only (shipped)** | yes | yes | yes | yes | yes |
| C. Remove the display token; bind everything to the primary face | yes | yes | no | yes | no |
| D. B, plus a dedicated stat-number token or class that a brand cannot reach | yes | yes | yes | yes | yes, but adds API |

## The measurements

**Screenshots.** Both builds were made with `npm run demo:build`: before from `origin/main` at
3522e06, after from this change. Each was served statically and shot in headless Chromium by
`shots.mjs`, with Google Fonts answered from the Open Sans files of `@fontsource/open-sans` 5, so
the type is real Open Sans. Four places, at 1440 and 390 wide, in light and dark, at 2x: the
Overview facts, the first How it is made step, the How it is made check count, and the Foundation
page's three faces. One run each; the pages render the same bytes each time.

| Place | 1440 light | 1440 dark | 390 light | 390 dark |
|---|---|---|---|---|
| Overview facts (`.ov-fact__n`, 20px, Regular 400) | identical | identical | identical | identical |
| How it is made, step number (`.how-step__n`, 32px, Light 300) | identical | identical | identical | identical |
| How it is made, check count (`.how-checks__number`, 64px, Regular 400) | identical | identical | identical | identical |
| Foundation, the three faces | the display stack line only | the display stack line only | the stack line, one line shorter | the stack line, one line shorter |

"Identical" is a pixel comparison of the before and after images: zero pixels differ. The
Foundation card prints the token's value, so its stack line changes, and at 390 it wraps onto one
line fewer, so the card is 18 CSS pixels shorter. `media/foundation-faces-1440-light-before.png` and
`-after.png` show it; `media/overview-facts-1440-light-after.png` and
`media/how-checks-1440-dark-after.png` show that the numbers still read as display.

**Tabular figures in Open Sans.** Measured in the same Chromium, at 64px: "1111" and "8888" are the
same width by default and with `tabular-nums` (146.13px at Light 300, 146.38px at Regular 400), and
differ only with `proportional-nums` (100.38px against 149.25px at 300). Open Sans's default figures
are already tabular, which is why adding `tabular-nums` moved no pixel. It is there for a brand
face, whose default figures may be proportional.

**No size or weight adjustment.** None of the numbers looked weak in Open Sans: the step numbers
already sit at Light 300 at H1's size, and the check count at twice H1's size at Regular 400. Each
keeps the size and weight it had.

## Why the alternatives lost

**A. Keep Oswald.** It fails the reason for the decision: the narrow figures are the problem, and a
second family beside Open Sans is the other. Loading it would also have made the site heavier to
show something the owner had already moved away from.

**C. Remove the display token.** Simplest, but it takes away the one type setting the white-label
plan gives a brand, and removing a published token is a breaking change for anyone who binds it.

**D. A dedicated stat-number token or class.** It would make the brand rule hold by construction: a
stat number would bind a token a brand cannot re-point, and the display token would be left for
headlines. It was not built here because it adds public API, and the kit has no stat component yet
to use it. It is the first open item below.

## What shipped

- `--vela-font-family-display` is `"Open Sans", -apple-system, sans-serif`, with a description that
  states the rule. The CSS and the Flutter tokens are regenerated; Flutter's
  `fontFamilyDisplayFallback` is now empty, and the Dart generator's comment no longer names Oswald.
- **The brand override rule**, in `DESIGN.md` (*Typography* and *Theming*) and in
  `foundations/typography.md`, *The display face and brands*: a brand may choose a display face for
  headlines and brand moments, never for numbers people compare. Numbers read against each other (a
  table column, one measure across a row of stat cards) bind `--vela-font-family-primary`, so a
  brand's face never reaches them. Wherever the display face shows a number, the figures are
  tabular.
- **The check:** `display-tabular` in `scripts/check-css.mjs`. A block that sets
  `font-family` (or `font`) to the display token without `font-variant-numeric: tabular-nums` fails
  `npm test`, in the kit and on the site; a display-face headline with no figures in it is waived on
  its line with a reason. Tested in `src/styles/css-lint.test.ts`.
- The four site rules above set `tabular-nums`.
- `NOTICE` and `LICENSE-DESIGN.md` no longer name Oswald. `guidelines/setup.md` says Open Sans is all
  a consumer loads.

**Not given a `[[rule: …]]` tag.** The rules gate (`scripts/check-rules.mjs`) reads tags only under
a component or contract spec's *Hard constraints*, and the site counts those rules per spec. A tag
in a foundation would be neither gated nor counted. The mechanical half of the rule is the CSS
check above; the half that decides which numbers are compared is a reviewer's check, and the
documents say so.

## Answered (7 November 2026)

Omkar answered the open items on 7 November 2026:

1. **A stat-number setting a brand cannot change (option D): yes, later.** It is built when a stat
   component exists, not now; it is on the roadmap (`ROADMAP.md`, Phase 2b) for that moment.
2. **The Overview facts keep the display face.** They are five unrelated headline numbers, not
   numbers people compare.
3. **A reviewer deciding which numbers are compared is enough for now.** The CSS check holds the
   tabular half; which numbers are read against each other stays a review call, as the documents
   say.
4. **Release: 0.16.0 is held until the end of the refinement stage.** The change stays under
   Unreleased until then; no release work is done for it now.

## Still open

1. **The brand theme itself** is planned and not built. Until it lands, a host re-points the token
   on `:root` or a subtree, under the same rule.
2. **Figma.** No text style or variable carries Oswald or the display face:
   `scripts/figma/text-styles.mjs` draws every style in Open Sans (Mono/Meta in Roboto Mono), and
   `npm run tokens:figma` skips `fontFamily` tokens, so the variable sync pushes nothing for
   `font-family-display`. The live library was not read for a hand-made Oswald style.
3. **A change of mind** is a new record that names this one.
