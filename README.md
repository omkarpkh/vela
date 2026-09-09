# Vela

A token-first React component kit. Six components, two themes, zero runtime dependencies —
and every design rule in the documentation is enforced by the TypeScript compiler.

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

## Scope

Six components, chosen to exercise every foundation and both status taxonomies. Not yet
specced: Checkbox, Radio, Dropdown List, Select List, Token Pill, Number Stepper, Text Area,
Modal, Tooltip, Icon Button, Actions Dropdown, View Switcher. The guidelines name these
explicitly so an agent flags the gap instead of inventing one.

## License

MIT
