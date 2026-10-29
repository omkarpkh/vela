# Token naming and lookup

Every token is `--vela-<layer>-<role>[-<modifier>]`. Learn the shape and you can find a token
without grepping the stylesheet.

## The two layers

| Layer | Looks like | Bind it? |
|---|---|---|
| **Primitive** | `--vela-grey-700`, `--vela-red-500` | ❌ Almost never — only when no semantic covers the role |
| **Semantic** | `--vela-text-default`, `--vela-bg-severity-major` | ✅ Always |

Primitives exist so semantics can be re-pointed for theming. Binding a primitive directly is
what breaks dark mode, and it is the single most common drift in generated code.

## Decision tree

1. **What am I colouring?** → `text` / `bg` / `border` / `icon` / `signal`
2. **In what context?** → nothing (global), `severity-*`, `risk-*`, `status-*`, `btn-*`, `control-*`
3. **What state?** → nothing (default), `-hover`, `-active`, `-inactive`, `-disabled`

`--vela-` + step 1 + step 2 + step 3. Examples:

- Body copy → `--vela-text-default`
- The background of a critical alert → `--vela-bg-severity-critical`
- The border of an input while focused → `--vela-control-border-active`
- The dot for an unhealthy node → `--vela-signal-status-unhealthy`

## Frequency: what you will actually reach for

These cover the overwhelming majority of real usage. Reach past them only deliberately.

| Token | Use |
|---|---|
| `--vela-text-default` | Almost all body text |
| `--vela-text-heading` | Headings only |
| `--vela-text-de-emphasized` | Secondary/meta text |
| `--vela-bg-global` | Page background |
| `--vela-bg-container` | Cards, panels, raised surfaces |
| `--vela-border-default` | Standard 1px borders |
| `--vela-border-subtle` | Dividers and rules |
| `--vela-space-10` / `-15` / `-20` | Most padding and gaps |
| `--vela-radius-4` | Default corner on every component |

## Numeric tokens already carry their unit

```css
padding: var(--vela-space-10);              /* ✅ */
padding: calc(var(--vela-space-10) * 1px);  /* ❌ produces "10px * 1px" */
```

Applies to `--vela-space-*`, `--vela-icon-*`, `--vela-control-height-*`, `--vela-radius-*`
and every typography size / line-height.

## Correct and incorrect

```css
/* ✅ semantic, survives a theme change */
.thing { color: var(--vela-text-default); background: var(--vela-bg-container); }

/* ⚠️ primitive — only when genuinely no semantic covers the role */
.thing { color: var(--vela-grey-700); }

/* ❌ raw hex — invisible to theming, fails in dark mode */
.thing { color: #49555a; }

/* ❌ crossing taxonomies — there is no "high" severity */
.thing { background: var(--vela-bg-severity-high); }
```

## The source files (for tools and agents that read the JSON)

Every `--vela-*` custom property is compiled from three files in `tokens/`, written to the DTCG
Format, Color and Resolver modules **2025.10** (Final Community Group Reports, 28 October 2025) and
checked by `npm run tokens:validate`. The custom property name is the token's short name: the last
path segment, which is unique across groups.

| File | Holds |
|---|---|
| `vela.tokens.json` | The base set — every token with its light value, in five groups: `primitives`, `color` (semantic), `sizing`, `typography`, `motion` |
| `vela.dark.tokens.json` | The dark overlay — only the semantic colours whose alias changes, each with its `$value` alone |
| `vela.resolver.json` | One `base` set and one `theme` modifier: `light` (the default) overlays nothing; `dark` overlays the file above. `version` is `"2025.10"` — the module's prose says `2025-10-01` in one section and `2025-11-01` in another; the published JSON Schema and Terrazzo both require `"2025.10"` |

The shapes, strictly:

```jsonc
// a primitive: an sRGB colour object. `hex` is the human-readable fallback and must agree
// with `components` (0–1 each); alpha defaults to 1
"grey-700": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.286…, 0.333…, 0.353…], "hex": "#49555a" } }

// a semantic: an alias, always a FULL PATH from the document root — never a bare name, never a raw value
"text-default": { "$type": "color", "$value": "{primitives.grey-700}" }

// in the dark overlay: the same path, re-pointed; nothing else travels with it
"text-default": { "$value": "{primitives.grey-300}" }

// durations and dimensions are objects with a unit; no "120ms" strings
"duration-fast": { "$type": "duration", "$value": { "value": 120, "unit": "ms" } }
"space-10":      { "$type": "dimension", "$value": { "value": 10, "unit": "px" } }

// vendor data sits under one reverse-domain key: `figma` is the variable name the sync writes
"$extensions": { "com.omkarux.vela": { "figma": "text/default" } }

// a retired token keeps emitting — `/* deprecated */` after the CSS declaration, a doc comment in
// Dart — so a consumer is warned, not broken. A group's $deprecated is inherited; `false` opts out
"$deprecated": "use text-de-emphasized"
```

Resolve an alias by walking paths, not names: `{color.text-inactive}` → `{primitives.grey-400}`.
Read the dark value as "the overlay's `$value` if the token is in it, otherwise the light value" —
that is exactly what the resolver's `theme` modifier means, and what `tokens.dark.body.css`
declares. `scripts/tokens-core.mjs` is the reference reader the generators share.
