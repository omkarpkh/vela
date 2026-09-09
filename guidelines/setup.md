# Setup

## Install

```bash
npm install @omkarux/vela
```

`react` and `react-dom` (v18.3 or v19) are peer dependencies — the consuming app supplies
them. Vela has **zero runtime dependencies** of its own.

## Import the stylesheet once, at the app root

```tsx
import '@omkarux/vela/styles.css'
```

The barrel deliberately does **not** import CSS, so the JS bundle carries no style side
effects and the consuming app keeps control of style ordering and SSR.

Need only the tokens (to style your own components against the same scale)?

```tsx
import '@omkarux/vela/tokens.css'
```

## Wrap your app

```tsx
<div className="vela-root">{children}</div>
```

Base typography, colour and focus treatment are scoped to `.vela-root` so the kit never
fights a host app's global stylesheet. It can wrap the whole app or any subtree.

## Theming

Three states, handled for you:

| Root attribute | Result |
|---|---|
| *(none)* | Follows the OS via `prefers-color-scheme` |
| `data-theme="light"` | Forced light, even if the OS is dark |
| `data-theme="dark"` | Forced dark, even if the OS is light |

```tsx
document.documentElement.setAttribute('data-theme', 'dark')
```

Dark mode is implemented by re-pointing semantic tokens onto a different part of the same
scale — **no primitive is redefined and no raw hex appears in the dark block**. A test
asserts this (`src/styles/contrast.test.ts`), because it is the property that makes a third
theme cheap rather than a rewrite.

## Fonts

Open Sans (300/400/600) for UI text; Oswald for large stat displays. Both have system
fallbacks in the font stack, so the kit degrades rather than breaks if you do not load them.

## Framework

**This package:** React 18.3+ / 19. Plain functional components consuming `--vela-*` tokens.
No CSS-in-JS runtime, no Tailwind requirement, no icon-library dependency.

**Any other framework:** the token layer and the specs port unchanged; the components do not.

```bash
npm install @omkarux/vela   # then import only the tokens
```
```ts
import '@omkarux/vela/tokens.css'
```

That gives an Angular, Vue, Svelte or server-rendered app the full two-layer palette, both themes,
the spacing and sizing scales and the type ramp — with no React in the dependency tree. Build the
components against your own framework's idioms and hold them to `guidelines/`, which is written to
be implementation-independent. On Angular, the closed prop sets become union input types with
`strictTemplates` enabled; that buys most of what the discriminated unions buy in React.
