# Icon Button

A button or a link drawn as a single glyph, for an action or a destination people recognise without a word: close, copy, more, search, settings, open on GitHub. It always has a name, given as `label`. Its tooltip shows that same name to sighted pointer and keyboard users, and is never heard twice.

**Status:** Experimental — specced, built and tested in `@omkarux/vela/headless`; no Figma set yet (the builder, `scripts/figma/components/icon-button.figma.js`, is ready and has not been run). The playground's header links to GitHub, npm and Figma are its first use.
**Dependencies:** @base-ui/react (optional peer, via /headless), for Tooltip.

**Spec stage:** the spec thread's draft of 30 Oct 2026, amended by the repo thread on 1 Nov 2026 for Omkar's brand-mark decision (see *Token bindings*). Omkar approved building it on 1 Nov 2026.

## Intent

Every glyph-only control in a console should be named, reachable, big enough to hit, and visible in a contrast theme. Until this component, Vela had none: Button, Icon and Tooltip each had to send a glyph-only control to a gap. They now link here.
- **WCAG 2.2:** 4.1.2 (a glyph alone has no name, so `label` is required); 2.5.8 (24 × 24px at least; `tiny` is exactly that, `--vela-target-min`); 1.4.13 (the tooltip is Vela's Tooltip: Escape closes it, it can be hovered, it stays while hovered); 2.5.3 (the tooltip's visible words are the name).
- **The tooltip repeats the name; it doesn't add to it.** It is not wired as `aria-describedby`, so a screen reader announces the name once. Vela's Tooltip always wired itself as a description, so this change adds a **label kind** of tooltip (`tooltip.md`, `kind="label"`).
- **Limits:** a glyph is a convention. Touch users never see the tooltip, so on a phone the glyph has to be clear on its own, or the control should be a Button with words.

## When to use Icon Button (vs. Button, vs. Icon)

- A widely known glyph in a tight place (close, copy, more, search, settings, a service's mark) → **Icon Button**.
- Less familiar, or touch-first → **Button** with a label.
- Destructive (delete, revoke) → **Button** `variant="destructive"` with words.
- A setting that stays on or off (pin, mute) → a toggle icon button, **not in this kit**; flag the gap.
- A glyph that only decorates text → **Icon**.
- Several in a row → **Icon Button** side by side, each its own tab stop.
- A link to GitHub or Figma → **Icon Button** with `brandMark`; to npm → **Icon Button** with `word="npm"`. Never a bare **Brand Mark** in an `<a>` of your own.

## Props

```tsx
<IconButton label="Close" icon="x" size="tiny" onClick={close} />
<IconButton label="Search" icon="search" onClick={openSearch} />
<IconButton label="Vela on GitHub" brandMark="github" href="https://github.com/omkarpkh/vela" opensInNewTab />
<IconButton label="Vela on npm" word="npm" href="https://www.npmjs.com/package/@omkarux/vela" opensInNewTab />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | **Required.** The accessible name and the tooltip's words. |
| `icon` | `IconName` | — | Exactly one of `icon`, `brandMark` or `word`. One of Icon's fifty. |
| `brandMark` | `BrandMarkName` | — | `"github"` or `"figma"`. Figma at `tiny` doesn't compile. |
| `word` | `"npm"` | — | This one only. In `--vela-font-family-mono`. |
| `size` | `"tiny" \| "regular"` | `"regular"` | 24px box with a 16px glyph, or 35px with a 20px glyph. |
| `onClick` | `(event) => void` | — | Button form. Exclusive with `href`. |
| `type` | `"button" \| "submit"` | `"button"` | Button form only. |
| `disabled` | `boolean` | `false` | Button form only. Native. Rare. |
| `href` | `string` | — | Link form: `<a href>`. Exclusive with `onClick`, `type`, `disabled`. |
| `opensInNewTab` | `boolean` | `false` | Link form only. `target="_blank"`, `rel="noopener noreferrer"`, and ", opens in a new tab" added to the name; the tooltip shows it too. |
| `tooltipPlacement` | `"top" \| "bottom" \| "start" \| "end"` | `"top"` | Tooltip's own set. |

```ts
type Glyph =
  | { icon: IconName; brandMark?: never; word?: never; size?: "tiny" | "regular" }
  | { brandMark: "github"; icon?: never; word?: never; size?: "tiny" | "regular" }
  | { brandMark: "figma"; icon?: never; word?: never; size?: "regular" }   // Figma: regular only
  | { word: "npm"; icon?: never; brandMark?: never; size?: "tiny" | "regular" }
type Common = Glyph & { label: string; tooltipPlacement?: TooltipPlacement }
type ButtonForm = Common & { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; type?: "button" | "submit"; disabled?: boolean; href?: never; opensInNewTab?: never }
type LinkForm   = Common & { href: string; opensInNewTab?: boolean; onClick?: never; type?: never; disabled?: never }
type IconButtonProps = ButtonForm | LinkForm
```

Every other native attribute is forwarded, except `children`, `aria-label`, `aria-labelledby` and `title` (the name is `label` and nothing else), and, on the link form, `target` and `rel` (`opensInNewTab` sets both, with the name). The ref lands on the `<button>` or `<a>`.

The package exports `IconButton` and the types `IconButtonProps`, `IconButtonButtonProps`, `IconButtonLinkProps` and `IconButtonSize` from `@omkarux/vela/headless`. For a JavaScript caller the types can't reach, each case they reject throws a named error instead of rendering an unnamed control or one with two glyphs; an empty `label` counts as no label.

**The hit area is a token.** `tiny` is `--vela-control-height-24`, which is `--vela-target-min`; `regular` is `--vela-control-height-35`. `--vela-target-min` (24px, aliasing `--vela-control-height-24`) is WCAG 2.5.8's minimum, stated once (`foundations/sizing.md`).

## Hard constraints

- **A name is required.** `label` is required; `aria-label`, `title` and `children` don't compile. [[rule: icon-button-label-required | compiler]]
- **One glyph from a closed set.** Exactly one of `icon`, `brandMark`, `word`. A node, an svg, an invented name, two glyphs or none doesn't compile; nor does `brandMark="figma"` at `tiny`. [[rule: icon-button-glyph-closed | compiler]]
- **A button or a link, never both.** `href` → a link; `onClick` → a button; both or neither doesn't compile. `disabled` and `type` are button only; `opensInNewTab` is link only. [[rule: icon-button-button-or-link | compiler]]
- **Two sizes.** `tiny` and `regular`. [[rule: icon-button-size-closed | compiler]]
- **Named by its label, and only by it.** `aria-label` is `label` (plus ", opens in a new tab" with `opensInNewTab`). The glyph is `aria-hidden="true"` and `focusable="false"`. [[rule: icon-button-named-by-label | runtime]]
- **The tooltip shows the name, and is heard once.** It is a label tooltip: it shows the name on hover after `--vela-delay-tooltip` and at once on keyboard focus, closes on Escape and stays open while hovered. There is no `aria-describedby`, and the popup is `aria-hidden`. [[rule: icon-button-tooltip-repeats-name | runtime]]
- **A link behaves as a link.** `<a href>`; Enter follows it, Space doesn't; with `opensInNewTab`, `target` and `rel` are set. [[rule: icon-button-link-form | runtime]]
- **Disabled is native, silent and still.** Out of the tab order, no tooltip, no hover fill, no press. [[rule: icon-button-disabled-native | runtime]]
- **The hit area holds its size and place.**
  - The box is at least `--vela-target-min` at `tiny` and 35px at `regular`.
  - A pointer press scales the **glyph** only; the box doesn't move.
  - A `brandMark` or `word` is never scaled, and has no hover or pressed fill.
  - `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` sit on the control, beside the press response.
  - Proved in Chromium with touch emulation.
  [[rule: icon-button-hit-area | browser]]
- **Visible in forced colours.** A 1px transparent border at rest, which forced colours draws; the glyph is `currentColor` (`ButtonText` or `LinkText`); a brand mark or the word follows the same colour; the hover border is `Highlight`; the focus ring shows. Playwright's forced-colours emulation, both forms. [[rule: icon-button-forced-colours | browser]]
- **Only a glyph people already know.** Reviewer-checked. [[rule: icon-button-known-glyph | convention]]
- **No destructive Icon Button.** Delete, revoke and the like are a destructive Button with words. Reviewer-checked. [[rule: icon-button-no-destructive | convention]]

**Proof count:** 4 compiler, 4 runtime, 2 browser, 2 convention — **12 rules, 10 with proofs.**

Where the proofs are: the four compiler rules are fixtures in `scripts/verify-pack.mjs`, against the `/headless` entry, beside a valid control that must compile. The four runtime rules are in `src/headless/IconButton/IconButton.test.tsx`. The two browser rules are in `tests/e2e/playground.spec.ts`, on the Icon Button page.

## Token bindings

| Part | Background | Border | Glyph |
|---|---|---|---|
| Rest | transparent | 1px transparent | `--vela-icon-strong` |
| Hover (pointer) | `--vela-btn-standard-hover-bg` | — | `--vela-icon-strong` |
| Pressed (pointer) | `--vela-btn-standard-hover-bg` | — | glyph `scale(0.88)` |
| Focus | — | the global ring | — |
| Disabled | transparent | — | `--vela-icon-disabled` |
| Brand mark or word, every state | transparent | 1px transparent | `--vela-brand-mark` |

**Amended 1 Nov 2026** (Omkar's decision: brand marks go live under Figma's Brand Book as written, without waiting for Figma's reply):
- **With `brandMark` or `word`, the glyph is `--vela-brand-mark`** (the owner's black in light, white in dark), in every state. The word "npm" uses the same token, so the three read as one set. Never scaled.
- **With `brandMark` or `word`, there is no hover fill and no pressed fill.** A fill box would sit inside Figma's clear space (equal to the mark's height, 20px), and GitHub and npm behave the same so the set is consistent. Hover and keyboard focus show the label tooltip; focus also shows the global focus ring (accessibility comes first; the ring shows only while focused). This is part of the press rule (`icon-button-hit-area`), so the rule count is unchanged.
- The **host** provides Figma's clear space in its layout. The playground's header keeps 20px or more between the Figma mark and anything else (its e2e test measures it).

Radius: `tiny` `--vela-radius-3`; `regular` `--vela-radius-4`.

**PAIRS** (all `ui`, light / dark, re-measured 1 Nov 2026): `--vela-icon-strong` on `--vela-bg-container` 6.82 / 10.30, on `--vela-bg-global` 7.69 / 11.55, on `--vela-bg-raised` 7.69 / 8.84, on `--vela-btn-standard-hover-bg` 5.93 / 7.11 — all four already asserted (Icon's tones and Dialog's close glyph). New: `--vela-brand-mark` on `--vela-btn-standard-hover-bg`, "Brand mark on the standard hover fill", 16.18 / 11.14, in case a host ever puts a mark on that fill.

## Sizes

| size | Box | Glyph | Radius | Use |
|---|---|---|---|---|
| `tiny` | `--vela-control-height-24` (`--vela-target-min`) | `--vela-icon-size` (16px); a brand mark at Brand Mark `regular`; "npm" in Meta type | `--vela-radius-3` | dismiss controls, table cells |
| `regular` | `--vela-control-height-35` | `--vela-icon-size-large` (20px); a brand mark at Brand Mark `large`; "npm" in Body type | `--vela-radius-4` | header, toolbar |

## States

| State | What renders |
|---|---|
| Rest | the glyph only |
| Hover (pointer) | the standard hover fill (not for `brandMark` or `word`); the tooltip after `--vela-delay-tooltip` |
| Focus | the global ring; the tooltip at once |
| Pressed (pointer) | the glyph at 88% (not for `brandMark` or `word`); the box holds |
| Pressed (keyboard) | nothing moves; the action happens |
| Disabled | `--vela-icon-disabled`; no tooltip, hover or press |
| Link, visited | no change |

There is no loading state.

## Motion

| Moment | What moves | Timing |
|---|---|---|
| Hover in / out | the fill | `--vela-duration-fast` in, `--vela-duration-base` out, `--vela-ease-standard` |
| Press in (pointer) | the glyph to `scale(0.88)`; a brand mark or word: nothing | `--vela-duration-instant`, `--vela-ease-standard` |
| Press out | the glyph back to 1 | `--vela-duration-base`, `--vela-ease-out` |
| From the keyboard | nothing | — |

Hover is under `@media (hover: hover)`; touch gets the press only. Under reduced motion the durations collapse (`base.css`).

## Responsive behaviour

**Minimum width: 24px** (`tiny`) or **35px** (`regular`). **Full layout from:** the same. It never shrinks, wraps or truncates.

## Accessibility

- Button form: `<button type="button" aria-label>`. Link form: `<a href aria-label>`.
- The label tooltip is `aria-hidden`, never a description, so the name is heard once.
- The target is at least 24 × 24px.
- Forced colours as the rule says.
- Never a tooltip on a disabled Icon Button.

## Built from

- **Tooltip** (headless), with the new label kind.
- **Icon** (core), tone `inherit`.
- **Brand Mark** (core), always `decorative`.
- Button's press flag (`data-vela-pressed`), set on pointer down, applied to the glyph rather than the box.

## Implementations

| Entry point | Implementation | Dependencies | Status |
|---|---|---|---|
| `@omkarux/vela/headless` | headless-born: `src/headless/IconButton`, on Vela's Tooltip (Base UI 1.9) | `@base-ui/react` (optional peer, via /headless) | Experimental |

Headless because its tooltip is Base UI's. There is no core implementation.

## Figma mapping

Library file **Vela Design System** → page `Icon Button`. Proposed set "Icon Button": `State` (Rest, Hover, Pressed, Disabled) × `Size` (Tiny, Regular) = 8 variants; an instance-swap property `Icon`, and a text property `Label` (the name, which the canvas doesn't show). The set is created by `scripts/figma/components/icon-button.figma.js`; it has not been built in the library yet.

| Figma property | Code prop |
|---|---|
| `Size` | `size` — Tiny → `"tiny"`, Regular → `"regular"` |
| `Icon` (instance swap) | `icon` — the glyph's name, e.g. `x` |
| `Label` (text) | `label` |
| `State` | none — Hover and Pressed are the pointer's; Disabled is `disabled` |

**The tooltip, the link form, `opensInNewTab`, `brandMark` and `word` exist only in code.**

## Anti-patterns

- ❌ No `label` → will not compile; a glyph alone has no name.
- ❌ `title` for the tooltip → will not compile; the tooltip is Vela's.
- ❌ The tooltip as a description of the same words → it is a label tooltip, heard once.
- ❌ A trash-can Icon Button for Delete → a destructive Button with words.
- ❌ A disabled Icon Button with a tooltip → it has none; say why in adjacent text.
- ❌ An unfamiliar glyph → a Button with a label.
- ❌ `<a onClick>` without `href` → the button form, with `onClick`.
- ❌ A 16px box → at least `--vela-target-min` (24px).
- ❌ `--vela-bg-hover` for hover → `--vela-btn-standard-hover-bg`.
- ❌ A pressed state that stays → the press lasts as long as the pointer is down.
- ❌ A hover fill or a press scale on a brand mark → neither; the mark never moves.
