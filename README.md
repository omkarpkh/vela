# Vela

A token-first design system. The tokens and the component specs are framework-agnostic;
this repository is a **React implementation** of them. Six components, two themes, zero runtime
dependencies — and every design rule in the documentation is enforced by the TypeScript compiler.

```bash
npm install @omkarux/vela
```

```tsx
import '@omkarux/vela/styles.css'
import { Button, ContextualAlert, Tabs } from '@omkarux/vela'

<div className="vela-root">
  <ContextualAlert severity="major" title="Scan failed">
    Three assets could not be reached.
  </ContextualAlert>
  <Button variant="primary" appearance="filled">Retry Scan</Button>
</div>
```

## What is actually in here

| | |
|---|---|
| **Components** | Button · Toggle · Input · ContextualAlert · StatusIndicator · Tabs |
| **Tokens** | 239 CSS custom properties, two layers (primitives → semantics) |
| **Themes** | Light + dark. OS preference by default, `data-theme` to override |
| **Dependencies** | None. `react` / `react-dom` are peers (18.3 or 19) |
| **Format** | ESM, `preserveModules` for tree-shaking, full `.d.ts` |
| **Tests** | 116, including 76 asserted contrast pairs across both themes |
| **Packed size** | 26.7 kB, 43 files |

## The three ideas worth stealing

**1. Dark mode redefines no primitive.** The entire dark theme is semantic tokens re-pointed
onto a different part of the same scale. A test fails the build if a raw hex ever appears in
the dark block. That property is what makes a third theme cheap instead of a rewrite.

**2. Severity, Risk and Status are separate taxonomies.** Six levels, three levels, five
states — never interchangeable. There is no "high severity" and no "critical risk". The
types reject both. Most design systems collapse these into one `status` prop and then spend
years untangling it.

**3. Design constraints are compiler errors, not review comments.** `ButtonProps` is a
discriminated union, so the rule "text-link is primary-only, small sizes only, never with an
icon" is not a paragraph someone has to remember:

```tsx
<Button variant="primary" appearance="text-link" size="tiny">Learn More</Button>      // ✅
<Button variant="destructive" appearance="text-link">Delete</Button>                  // ✗ won't compile
<Button variant="primary" appearance="text-link" size="huge">Go</Button>              // ✗ won't compile
<Button variant="primary" appearance="text-link" icon={<Icon />}>Go</Button>          // ✗ won't compile
<ContextualAlert severity="high">…</ContextualAlert>                                  // ✗ severity has no "high"
<StatusIndicator status="critical" />                                                 // ✗ that's severity, not status
<Tabs.List>…</Tabs.List>                                                              // ✗ aria-label is required
<Toggle />                                                                            // ✗ label is required
```

`npm run verify` asserts every one of those rejections against the *published tarball*.

## Accessibility is asserted, not claimed

`npm run contrast` prints every foreground/background pair in both themes against WCAG 2.1
AA — 4.5:1 for text, 3:1 for UI boundaries and non-text signals. The same data backs a test,
so a token change that breaks contrast fails CI.

The first run of that audit found 9 failures in the inherited light palette. All 9 are fixed,
and the fixes are documented in `guidelines/foundations/color.md` so nobody "corrects" them
back — most notably `--vela-btn-destructive-bg`, which binds `red-700` rather than `red-500`
because red-500 behind a white label is 3.93:1.

## Built for agents as well as people

`guidelines/` ships **inside the package**. It is the specification, not a rendered copy of
the source: closed prop tables, token-binding tables, hard constraints, and an anti-patterns
block per component. Point your coding agent at `guidelines/llms.txt`, or import a single
file:

```ts
import buttonSpec from '@omkarux/vela/guidelines/components/button.md?raw'
```

`AGENTS.md` at the repo root carries the same rules for anyone working *on* the system.

## Theming

```tsx
document.documentElement.setAttribute('data-theme', 'dark')   // force dark
document.documentElement.setAttribute('data-theme', 'light')  // force light
document.documentElement.removeAttribute('data-theme')        // follow the OS
```

## Scripts

```bash
npm run dev        # demo showcase at localhost:5174
npm test           # 116 tests
npm run contrast   # WCAG report for both themes
npm run verify     # typecheck + tests + build + pack-and-consume gate
```

## Editing tokens — one source, five targets

`tokens/vela.tokens.json` is the only place a value is written. It uses the W3C Design Tokens
format (2025.10), ships inside the package as `@omkarux/vela/tokens.json`, and everything else is
generated from it:

```bash
npm run tokens          # → tokens.*.css + flutter/lib/vela_tokens.dart (Flutter) + bridges/vela.mui-theme.json (MUI)
npm run tokens:figma    # → a Plugin API script that creates-or-updates every Figma variable
npm run tokens:check    # fails if the CSS was hand-edited instead of the JSON (runs in CI)
npm run guidelines:figma # → a script that writes each spec's summary into its Figma description
```

The component specs in `guidelines/` follow the same rule: edit the markdown, and the package,
the agent docs and the Figma descriptions follow. The one thing no script can do is add a
variant — a spec that gains a prop is built in Figma and in code, by people, which is what the
API review is for.

Figma's REST API only lets Enterprise plans write variables, so the Figma half is a generated
script run inside the file (through the Figma MCP or the Scripter plugin). It looks each variable
up by collection and name, so re-running never duplicates: the first run against the live library
reported 0 created / 223 updated, then created the 11 numeric tokens Figma had never had.

## Using it on another stack

Worth being precise about what travels and what doesn't:

| Layer | Ports? |
|---|---|
| **Tokens** (`dist/tokens.css`) | **Entirely.** Plain CSS custom properties — Angular, Vue, Svelte, Rails, plain HTML. |
| **Tokens for Flutter** (`tokens.dart`) | **Entirely.** Generated from the same JSON: the primitives, a `VelaColors` `ThemeExtension` with `light` and `dark`, the sizing scale in logical pixels, the type ramp as `TextStyle`s and `velaThemeData(Brightness)`. Swift, Kotlin or XML would be the same kind of script. Widgets are not generated — they are built against `guidelines/`. |
| **Theme bridge for Material UI** (`mui-theme.json`) | **Entirely.** `createTheme(vela.light)` and a product already built on MUI takes the family look with no component touched — the adopt-without-rewrite path for an acquired product. What it cannot do: keep Severity and Status apart, because Material has one colour vocabulary. That is component work, which is why shared components come second. |
| **The contract** (`guidelines/`) | **Entirely.** Intent, closed prop sets, token bindings, accessibility, anti-patterns. Only the code samples are React-shaped. |
| **Components** (`dist/index.js`) | **No.** One implementation per framework, by definition. |
| **The contrast audit** (`npm run contrast`) | **Entirely.** It parses CSS and knows nothing about React. |

So on Angular you would take `tokens.css` and `guidelines/` unchanged, and write the components
against your own idioms — standalone components, signals, `ControlValueAccessor` for form controls.
The closed prop sets become union input types with `strictTemplates` enabled, which buys most of
what the discriminated unions buy here.

This is not a limitation to work around. If an organisation runs more than one framework, no
framework's components can be the source of truth for the others — **the only thing that can be
shared is the contract**, which is the argument this repository exists to make.

## Scope

Six components, chosen to exercise every foundation and both status taxonomies. Not yet
specced: Checkbox, Radio, Dropdown List, Select List, Token Pill, Number Stepper, Text Area,
Modal, Tooltip, Icon Button, Actions Dropdown, View Switcher. The guidelines name these
explicitly so an agent flags the gap instead of inventing one.

## License

MIT
