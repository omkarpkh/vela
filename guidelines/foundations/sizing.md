# Foundation: Sizing

## Control heights

| Token | Value | Used by |
|---|---|---|
| `--vela-control-height-24` | 24px | Button `tiny` |
| `--vela-control-height-25` | 25px | Input `tiny` |
| `--vela-control-height-26` | 26px | Input `regular` |
| `--vela-control-height-35` | 35px | Button `regular`, Input `large` |
| `--vela-control-height-40` | 40px | Button `large` |
| `--vela-control-height-48` | 48px | Reserved |
| `--vela-control-height-60` | 60px | Button `huge` |

**Button and the input family do not share a height ramp.** A `regular` Button is 35px; a
`regular` Input is 26px. Placing them on one row requires deliberate alignment — this is a
known property of the system, not a bug to normalise away.

## Icon sizes

| Token | Value | Used by |
|---|---|---|
| `--vela-icon-12` | 12px | Button `tiny` |
| `--vela-icon-16` | 16px | Button `regular`/`large`/`huge`, alert icons |
| `--vela-icon-20` | 20px | Dismiss controls |
| `--vela-icon-24` | 24px | Reserved |

**Button icons do not scale past 16px.** 12 at tiny, 16 everywhere else. `huge` is 60px tall
with a 16px icon — that is correct.

## Anti-patterns

- ❌ `--vela-control-height-48` for Button `huge` → huge is 60px.
- ❌ `--vela-icon-20` or `-24` inside a Button → 12 or 16 only.
- ❌ Fixed button widths → buttons hug their content.
