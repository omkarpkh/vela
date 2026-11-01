# Vela's brand: the logo and the mood

This folder holds Vela's own logo, **the Pulse mark**, and the shader for the **mood**, the
background behind the site's Overview. They are images, not interface: nothing here is part of the
npm package, and no component uses these files.

**Naming.** This is Vela's logo, or the Pulse mark. It is not the `BrandMark` component, which
shows other companies' logos and never stands for Vela itself. In code, don't call it `BrandMark`.

**Language.** Describe the mood as a calm wave mark that changes with each release. Never call it
a seal, and make no security claim about it or about the logo. `src/styles/wording.test.ts` checks
the guidelines, the site source, this folder, `README.md` and `llms.txt` for both.

## The files

| Role | Size | File |
|---|---|---|
| Core | the 16px master | `vela-mark-core-16.svg` (one uneven ring, an off-centre dot) |
| Core | the 24px master | `vela-mark-core-24.svg` |
| Core | 32px and up (flat) | `vela-mark-core-32.svg` |
| Favicon | 16px, in its teal tile | `vela-favicon-16.svg` (the site's favicon is a copy: `demo/public/favicon.svg`) |
| Avatar | 24 to 40px, in its teal tile | `vela-avatar-24.svg` |
| Hero, on dark | 96px and up, untiled | `vela-hero-96plus.svg` (white, with the light ramp and a soft glow) |
| Hero, on light | 96px and up, untiled | `vela-hero-96plus-light.svg` (primary-500 only, no ramp, no glow) |
| App icon | where a platform needs a tile | `vela-app-icon.svg` (the white hero on the teal tile; an asset, not a component) |
| Mood | the Overview background | `mood-o.frag.glsl` (a WebGL 2 fragment shader) |

The core marks are drawn in `currentColor`. Set the colour from the table below.

## Colours

The teal ramp only. Brand assets are the one place in Vela where primitives are named directly
(`DESIGN.md`), because they are images. Each pair is a graphic, so it needs 3:1. All of them are
asserted in `PAIRS` (`scripts/contrast-core.mjs`), and the 75% ring in `src/styles/contrast.test.ts`.

| Mark | On | Contrast |
|---|---|---|
| white (`--vela-white`) | the primary-500 tile | 6.08:1 |
| primary-500 (`--vela-primary-500`, #0a6c7d) | white | 6.08:1 |
| primary-500 | grey-50 (`--vela-grey-50`) | 5.75:1 |
| primary-300 (`--vela-primary-300`) | grey-900 (`--vela-grey-900`) | 7.05:1 |
| the hero's outer ring: white at 75% | primary-500 | 4.17:1 |
| the hero's outer ring: primary-500 at 75% | white | 3.61:1 |

## The logo: Pulse

A point with two softly uneven rings, closed all the way round, after the steady rhythm of the
Vela Pulsar. It stays two rings: no growth rings.

**Geometry, on a 32 viewBox:**
- **Ring 1:** centre (16, 16), r 6.5, a 3-lobe wave of amplitude 0.35, phase 0.
- **Ring 2:** centre (16.8, 16.8), r 12.2, amplitude 0.55, phase 1.2.
- **Dot:** (15.4, 15.4), r 2.3.
- **Stroke:** 2, or 2.6 in the 24px master.
- **The 24px master:** ring 1 r 6.8, amplitude 0.3, phase 0; ring 2 at centre 16.6, r 12.4,
  amplitude 0.45, phase 1.2.
- **The 16px master:** one ring at (16.6, 16.6), r 10.4, amplitude 1.1, phase 0.4, stroke 3.6; the
  dot at (13.6, 13.6), r 4.

**The wave:** r(θ) = r₀ + a·sin(3θ + φ), sampled at θₖ = 2πk/24 from +x, clockwise on screen. The
ring is a closed Catmull-Rom curve through those points, written as cubic Béziers:
c1 = p1 + (p2 − p0)/6, c2 = p2 − (p3 − p1)/6.

**The tile** is a squircle in primary-500: `M16 0C28.6 0 32 3.4 32 16S28.6 32 16 32 0 28.6 0 16 3.4 0 16 0Z`.

## Rules

1. **Below 24px, the mark always sits in its teal tile.** Never put it bare beside form controls:
   a centred dot in a ring looks like a selected radio button.
2. **The tile appears only where a platform needs one:** the favicon, avatars and the app icon.
3. **The hero is never tiled.** Use `vela-hero-96plus.svg` on dark and `vela-hero-96plus-light.svg`
   on light.
4. **Never redraw it with perfect circles.** It would then read as a target. The waves and the
   dot's offset are part of the mark.
5. **Never put the bare mark in a row of `circle-*` icons, or in an icon slot.**
6. **Clear space:** a quarter of the mark's width, at least 4px. **The gap** between the mark and
   the name is about 0.18 of the mark's width.
7. **No drop shadow under the mark.** Relief is an optional finish for large print only.
8. **One light direction,** from the top left, shared with the mood.

## The pulse

The hero logo can pulse once: the inner ring, then the outer one, scale from 0.82 to 1 and fade in
over `--vela-duration-brand-pulse` (900ms), the outer ring starting `--vela-delay-brand-pulse-outer`
(120ms) later. It plays only where the mark is the hero (96px and up), once per visit. Never on
in-app navigation, never under reduced motion, never at 32px or below, never in the playground
header, never beside controls, and never in anything a consumer builds with Vela. It is the one
exception to the under-300ms rule (`guidelines/foundations/motion.md`).

## The mood: O, "Embossed rings, lit"

A grain surface in Vela's teal ramp, with one soft light behind the content and darker corners. A
mark of rings is pressed into the lower-right corner. The rings come from the release number, so
they change with each minor or major release:

- `markSeed(version)` in `scripts/brand/mark-seed.mjs` gives the seed: n = major × 100 + minor,
  lobes = n mod 24 (24 when that is 0, never under 3), step = lobes / 100. 0.15.0 gives 15 lobes
  and a 0.15 step.
- The shader is stored as drawn for 0.15.0 and is never edited. `npm run brand:stills` writes the
  current version's seed into it as it loads it.

The site uses stills, not the live shader: `npm run brand:stills` renders four, the desktop
(1600 × 520) and the phone (720 × 900), both at 2×, light and dark, and writes them as WebP to
`demo/public/brand/`, named with the seed (`mood-desktop-light-0.15@2x.webp`). Run it when the minor
or major version changes (`RELEASING.md`). Still by default, and never animated under reduced motion.

Worst contrast against the mark colour over the left 60% of each still, as rendered (PNG):

| Still | Mark | Worst |
|---|---|---|
| Desktop, dark | white | 14.33:1 |
| Phone, dark | white | 7.27:1 |
| Desktop, light | primary-500 | 5.13:1 |
| Phone, light | primary-500 | 4.55:1 |

The shipped WebP files (quality 90) smooth the grain, and measure 13.54, 6.97, 5.06 and 4.40:1 in
the same order. On the phone light still that is under the 4.5:1 that primary-500 text needs, so
check the darkest area before text sits on it.

## Name

Always use the full name, "Vela Design System", in titles, headers, the Figma file, the Community
listing and the cover. "Vela" alone is fine in running text after that. The package stays
`@omkarux/vela`. No security claim in the brand.

## Code and licence

Written for Vela, under MIT. The one exception is the shader's hash function, which is after Dave
Hoskins (MIT); `NOTICE` says so, and so does the shader.
