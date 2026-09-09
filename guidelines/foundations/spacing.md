# Foundation: Spacing

A 5px-based scale. **`25` exists; `50` does not** — this is intentional, not an omission.

| Token | Value | Typical use |
|---|---|---|
| `--vela-space-5` | 5px | Icon-to-label gap |
| `--vela-space-10` | 10px | Control padding, tight stacks |
| `--vela-space-15` | 15px | Default button padding, form gaps |
| `--vela-space-20` | 20px | Section padding, tab gaps |
| `--vela-space-25` | 25px | Wide inner padding |
| `--vela-space-30` | 30px | Large button padding |
| `--vela-space-40` | 40px | Section separation |
| `--vela-space-60` | 60px | Page-level rhythm |
| `--vela-space-80` | 80px | Page-level rhythm |

## Rules

- Values already carry `px`. `padding: var(--vela-space-10)` — never `calc(... * 1px)`.
- **Do not interpolate.** There is no 35, no 50, no 70. If a layout seems to need one, you
  are probably compensating for a wrong control height.
- Use `gap` on a flex/grid parent rather than margins on children.

## Anti-patterns

- ❌ `padding: 12px` → use `--vela-space-10` or `--vela-space-15`.
- ❌ `--vela-space-50` → does not exist; the scale skips it.
- ❌ Margin-bottom stacks → use `gap`.
