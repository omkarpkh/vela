# Foundation: Radius

Four tokens, each with a scope. Using one outside its scope is drift.

| Token | Value | Scope |
|---|---|---|
| `--vela-radius-3` | 3px | Small inner elements (dismiss buttons, inline chips) |
| `--vela-radius-4` | 4px | **The default for every component** |
| `--vela-radius-8` | 8px | Modal / dialog containers only |
| `--vela-radius-12` | 12px | Top-level side panel outer edge only |
| `--vela-radius-full` | 9999px | Status Indicator dots and the Toggle track only |

## Anti-patterns

- ❌ Pill-shaped buttons (`border-radius: 999px`) → buttons are `--vela-radius-4`.
- ❌ `--vela-radius-full` on anything but a status dot or a toggle track.
- ❌ `--vela-radius-8` on a card → cards are `--vela-radius-4`; 8 is for modals.
