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
