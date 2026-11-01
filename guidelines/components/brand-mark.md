# Brand Mark

Another company's own logo, drawn as its owner drew it, used only to link to that company's service: "Vela on GitHub", "Vela in Figma". It is a separate closed set, kept apart from Icon. It never moves, is always its owner's own black (white in the dark theme), and never stands for Vela itself.

**Status:** Experimental — specced, built and tested in the core entry; no Figma set yet (the builder, `scripts/figma/components/brand-mark.figma.js`, is ready and has not been run). Nothing uses it yet: Icon Button's `brandMark` glyph and the site header come in later changes.

**Dependencies:** none (core).

**Spec stage:** draft, 31 Oct 2026. Written after Omkar's decision (31 Oct), from the icon thread's input, amended the same day for the owners' files. Omkar said "go" on 1 Nov 2026 (15:13 IST). Amended on 1 Nov 2026: Omkar chose to follow Figma's Brand Book strictly, so the fill is the owner's own black or white, through `--vela-brand-mark`, and Figma's mark keeps its full clear space.

## Intent

The playground's header links to GitHub, npm and Figma. As glyph-only links, they need marks people recognise. Those marks belong to other companies, each with rules about how they may be used. Icon can't carry them:
- **A different meaning.** An icon means a thing or an action in Vela. A brand mark means "go to that service".
- **A different drawing.** Icon is Lucide strokes on a 24-unit grid, with the stroke from a token. Brand marks are filled shapes that their owners forbid redrawing.
- **Different rules.** Icon's `tone` and stroke would let a caller recolour or restyle a mark, which both owners forbid. A mark is its owner's own black or white, never one of Vela's greys.
- **No motion.** Like Severity, Risk and Status marks, a brand mark never animates.

**Decided by Omkar, 31 Oct 2026:**
- `BrandMark` is its own closed set: `github` and `figma`.
- npm is **not** a mark. It is the word "npm" in Vela's monospace type, inside the same 35px button: referential use, which needs no permission. See *Changes to other specs*, Icon Button.

**Limits:**
- It shows which service a link goes to. It doesn't say what is there, so the link's name does that: "Vela on GitHub".
- It is not a licence. Vela ships the owners' drawings under their terms. A product that uses BrandMark takes on the same terms.
- **Released under Figma's Brand Book as written.** Figma's reply, when it comes, may relax the clear space.
- **Figma's mark keeps clear space equal to its height (20px) from any other element. The host's layout provides it.**
- **Figma's mark is lighter.** It is a line drawing, lines about 1.2px wide at 20px. It still reads. Figma has no filled single-colour icon.

## When to use Brand Mark

- **A link to that company's own service, from a product built with Vela** → **Brand Mark**, inside an **Icon Button** link.
- **Sign in with a provider** → not this. Out of scope.
- **A list of integrations or connectors** → not this.
- **npm, or any service whose logo needs permission** → the word, set by Icon Button, not a mark.
- **Vela's own logo or wordmark** → never a Brand Mark.

Icon Button is not built yet (it is the next change). Until it is, a glyph-only link to GitHub or Figma has no Vela control to sit in: flag the gap, keep the link written, and don't wrap a bare Brand Mark in an `<a>` of your own.

## Props

```tsx
<IconButton label="Vela on GitHub" brandMark="github" href="https://github.com/omkarpkh/vela" opensInNewTab />   // Icon Button: the next change, not built yet
<BrandMark name="github" label="GitHub" />          // standalone, rare: a caption needs a name
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `"github" \| "figma"` | — | **Required. These two only.** |
| `size` | `"regular" \| "large"` | `"large"` | **These two only.** 16px or 20px, Icon's size tokens. `figma` is `large` only. |
| `label` | `string` | — | **Standalone only.** The accessible name. Exclusive with `decorative`. |
| `decorative` | `true` | — | **Inside a named control only.** `aria-hidden`. Exclusive with `label`. |

```ts
type BrandMarkName = "github" | "figma"
type Sizing =
  | { name: "github"; size?: "regular" | "large" }
  | { name: "figma"; size?: "large" }
type Naming = { label: string; decorative?: never } | { decorative: true; label?: never }
type BrandMarkProps = Sizing & Naming
```

There is no `tone`, `color`, `className`, `style` or `title`.

The package exports `BrandMark` and the types `BrandMarkProps`, `BrandMarkName` and `BrandMarkSize` (`"regular" | "large"`). For a JavaScript caller the types can't reach, each case they reject throws a named error instead of rendering a mark that is unnamed, named twice or the wrong size; an empty `label` counts as no label.

## Hard constraints

- **A closed set, closed sizes and one source of name.** `name` is `github` or `figma`. `size` is `regular` or `large`, and `figma` is `large` only. Exactly one of `label` or `decorative` is given. Any other prop, a third name, `size="regular"` on Figma, or neither or both of `label` and `decorative`, doesn't compile. [[rule: brand-mark-closed | compiler]]
- **The owner's drawing, unmodified.**
  - Each mark is the owner's own file, filled with `currentColor`, no stroke, in a square viewBox.
  - **GitHub, at both sizes:** Primer Octicons 19.42.0 `mark-github-16` (MIT), in its own 16-unit viewBox, scaled uniformly at `large`. The 24px drawing is not used.
  - **Figma, at `large`:** its own mono-line icon. The black and the white files have identical path data. The viewBox is `212 340 600 600`, which crops the file's 1024 × 1280 canvas to a square around the mark (x 304–720, y 340–940). The path itself is unchanged, and so is its `fill-rule="evenodd"`, which keeps the two top counters open.
  - The source and licence of each drawing are recorded beside its path data in the source.
  - A test compares each path's `d` with the checked-in owner file, so an edit to a mark fails.
  [[rule: brand-mark-owner-drawing | runtime]]
- **It names itself once, or not at all.** With `label`: `role="img"` and `aria-label`. With `decorative`: `aria-hidden="true"` and `focusable="false"`. Never both. Never a `<title>` inside the svg. [[rule: brand-mark-named-once | runtime]]
- **It never moves.** No `transition`, `animation` or `transform` applies to `.vela-brand-mark` or anything inside it. A css check fails any such rule. Inside an Icon Button, the button's press scale doesn't reach it. [[rule: brand-mark-never-moves | browser]]
- **The owner's own black or white, never a brand colour.** The mark is its owner's black in the light theme and white in the dark, through `--vela-brand-mark`. Never a grey, a status colour, or the owner's brand colours. The svg fills with `currentColor` and `.vela-brand-mark` sets `color` to the token, through no prop, so forced colours still win. A reviewer checks any host stylesheet that reaches the mark. [[rule: brand-mark-highest-contrast | convention]]
- **Only to link to its owner.** A mark links to that owner's service, and to nothing else. Never Vela's own logo, never implies endorsement, never larger or more prominent than the product's own wordmark in the same view. Each owner's clear-space rule is met, or the owner has agreed otherwise in writing. Figma's mark keeps clear space equal to its height (20px) from any other element. The host's layout provides it. A reviewer checks this. [[rule: brand-mark-links-to-owner | convention]]

**Proof count:** 1 compiler (1 fixture with seven rejections), 2 runtime (2 unit tests), 1 browser (a computed-style check, plus the css check), 2 convention — **6 rules, 4 with proofs.**

Where the proofs are: `brand-mark-closed` is the seven rejections in `scripts/verify-pack.mjs`, beside a valid control that must compile, against the shipped types. `brand-mark-owner-drawing` and `brand-mark-named-once` are in `src/components/BrandMark/BrandMark.test.tsx`. `brand-mark-never-moves` is the `brand-mark-still` rule in `scripts/check-css.mjs` (it runs in `npm test` and `npm run css:check` over the component and site stylesheets, and can't be waived) and a computed-style check on the Brand Mark page in `tests/e2e/playground.spec.ts`.

## Token bindings

| Part | Token |
|---|---|
| Box, `regular` | `--vela-icon-size` (16px) |
| Box, `large` | `--vela-icon-size-large` (20px) |
| Colour | `--vela-brand-mark` — the owner's black (`--vela-black-pure`, #000000) in light, white (`--vela-white`) in dark |
| Fill | `currentColor`, which is that colour |

Contrast (non-text graphic, 3:1), light / dark: on page (`--vela-bg-global`, also the site header's background) 21.00 / 18.08; on container (`--vela-bg-container`) 18.62 / 16.13.
**PAIRS:** `--vela-brand-mark` on `--vela-bg-global`, "Brand mark on page", and on `--vela-bg-container`, "Brand mark on container", both `ui`. **New tokens:** the semantic `--vela-brand-mark` (Figma `brand-mark/fill`), and the primitive `--vela-black-pure`, because Vela's `--vela-black` is #191d1f, not the owners' black.

## Sizes

| size | Box | GitHub | Figma |
|---|---|---|---|
| `regular` | 16px | `mark-github-16` | **not allowed** |
| `large` | 20px | `mark-github-16`, scaled uniformly | the mono-line icon, viewBox `212 340 600 600` |

## States
A mark has no state of its own. Its control owns hover, focus and press.

## Motion
None, in any state or setting.

## Responsive behaviour
**Minimum width: 16px** (`regular`) or **20px** (`large`). **Full layout from:** the same.

## Accessibility
- Named once: by the control's `label`, or by its own `label` when it stands alone.
- No colour meaning.
- Forced colours: `currentColor` follows the control's system colour. No `forced-color-adjust: none`.

## Built from
- **GitHub:** Primer Octicons 19.42.0 `mark-github-16`, MIT, used under GitHub's logo policy. The file, its source note and the MIT text are in `src/brand-marks/github/`.
- **Figma:** Figma's mono-line icon. Brand Book: "Never present the icon in grayscale. Use the monoline icon instead." Source note: "Figma's own file; canvas cropped to the mark; path unchanged". The file and its note are in `src/brand-marks/figma/`.
- Icon's size tokens, and `--vela-brand-mark` for the colour.
- Consumer: Icon Button (`brandMark` glyph).

## Implementations
| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela` | core: `src/components/BrandMark`, with path data in `src/brand-marks/` beside each owner file and its source note | none | Experimental |

## Figma mapping

Library file **Vela Design System** → page `Brand Mark`. Proposed set "Brand Mark": `Name` (GitHub, Figma) × `Size` (Regular, Large), Figma at Large only = 3 variants. Fill bound to `brand-mark/fill`. The set is created by `scripts/figma/components/brand-mark.figma.js`, from the same owner files; it has not been built in the library yet.

| Figma property | Code prop |
|---|---|
| `Name` | `name` — GitHub → `"github"`, Figma → `"figma"` |
| `Size` | `size` — Regular → `"regular"`, Large → `"large"` |

**There is no property for `label` or `decorative`: an instance is named by the control it sits in.** In code, a mark inside a named control is `decorative`; a mark standing alone takes a `label`.

## Anti-patterns
- ❌ `<Icon name="github">` → there is no such icon.
- ❌ A mark in the owner's brand colour, a grey, or Vela's own near-black → `--vela-brand-mark`, the owner's black or white.
- ❌ Figma at 16px → `large` only (will not compile).
- ❌ The npm logo → the word "npm".
- ❌ A hover lean, press scale or fade on the mark → it never moves.
- ❌ "Sign in with GitHub" or an integrations grid → not this.
- ❌ A redrawn or simplified mark → the owner's drawing, unmodified.
- ❌ A filled single-colour Figma mark from an icon set (Phosphor, akar-icons, Simple Icons) → Figma's own mono-line icon.
- ❌ GitHub's 24px drawing at 20px → `mark-github-16`, scaled.

## Changes to other specs (NOT in this PR; Icon Button comes next)
Icon Button's glyph becomes `{ icon } | { brandMark } | { word: "npm" }`; with a word the glyph is `--vela-text-heading`; a brandMark keeps its own `--vela-brand-mark`; the press scale is not applied to either. The button's hover fill under a mark is a pair for that change.

## Open questions
1. 24px: not until a consumer needs it.
2. More services: the set stays at two.
