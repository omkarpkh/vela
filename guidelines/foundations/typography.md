# Foundation: Typography

**Open Sans** for all UI text (Light 300, Regular 400, SemiBold 600).
**Display** (`--vela-font-family-display`) for headlines, brand moments and big headline numbers.
By default it is Open Sans too, so a big number and the words beside it are one family: the number
gets its presence from size and weight, as H1 to H3 do, and always uses tabular figures. It is the
one family a brand may change (see the section on brands below). Both have system fallbacks.
**Monospace** (`--vela-font-family-mono`) for values that must align or be read character by
character — identifiers, hashes, IP addresses, timestamps, counts — at Meta's size:
`ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace`. A
system stack: no web font is downloaded. In Figma it is the text style `Mono/Meta`, drawn in
Roboto Mono.

## The scale

| Role | Size / Weight / Line-height | Class |
|---|---|---|
| H1 | 32 / 300 / 42 | `.vela-h1` |
| H2 | 24 / 300 / 33 | `.vela-h2` |
| H3 | 20 / 300 / 27 | `.vela-h3` |
| H4 | 16 / 400 / 24 | `.vela-h4` |
| H5 | 14 / 600 / 21 | `.vela-h5` |
| H6 | 12 / 600 / 18 | `.vela-h6` |
| Body | 14 / 400 / 21 | `.vela-body` |
| Meta | 12 / 400 / 18, +0.3 tracking | `.vela-meta` |
| Mono meta | Meta's triple and tracking in `--vela-font-family-mono` | — (Figma `Mono/Meta`) |

Note the weight inversion: H1–H3 are **Light 300** and get their prominence from size;
H5–H6 are **SemiBold 600** and get theirs from weight. Do not "correct" H1 to bold.

## Rules

- Use the class that matches the **role**, not the one that matches the size you want.
- Button labels are **Regular 400 at every size** — never SemiBold, never Bold.
- Button labels are Title Case and verb-first: "Save Changes", not "Information".
- Each size is a triple. Never take a size without its line-height.

## The display face and brands

`--vela-font-family-display` is a brand setting: a theme may re-point it as part of white-label
theming, and nothing else in the type system changes with it.

- **A brand may choose a display face for headlines and brand moments, never for numbers people
  compare.** Counts, scores, percentages and totals that are read against each other (a table
  column, one measure across a row of stat cards) bind the UI face, `--vela-font-family-primary`, so a
  brand's face never reaches them. The display face may carry a number that stands alone as a
  headline, such as the site's count of checks, or the Overview's facts, which are five unlike
  quantities, each with its own words. A narrow or decorative face makes figures harder to
  read and to compare at a glance, and a second family beside the body face reads as two systems
  side by side; why Vela's own default changed is recorded in `decisions/007-display-face-open-sans`.
- **Wherever the display face shows a number, the figures are tabular**
  (`font-variant-numeric: tabular-nums`), so digits keep one width whatever face a brand sets and a
  count that changes does not shift what follows it. `scripts/check-css.mjs` checks this in the
  kit's and the site's stylesheets (`display-tabular`): a block that sets the display face without
  tabular figures fails `npm test`. A display-face headline with no figures in it is waived on its
  line with a reason.
- **Size and weight come from the scale, not the face.** A brand's display face takes the same
  sizes, line heights and weights as everything else; it never brings a size of its own.

What the lint cannot see is which numbers are compared: that a stat card's figure binds the UI face
rather than the display face is a reviewer's check. No component in the kit binds the display face
today; the Table's numeric cells use the UI face with tabular figures (`components/table.md`).

## Anti-patterns

- ❌ `font-size: 15px` outside a Button `large` → not on the scale.
- ❌ A bold H1 → H1 is Light 300.
- ❌ SemiBold button labels → Regular 400 at every size.
- ❌ Setting `font-family`/`font-size`/`line-height` by hand → use the class or the tokens.
- ❌ The display face on numbers people compare (a table column, one measure across a row of stat cards) → bind `--vela-font-family-primary`; a brand's face must never reach them.
- ❌ The display face on a number without `font-variant-numeric: tabular-nums` → the figures must line up.
