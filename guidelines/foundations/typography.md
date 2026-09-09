# Foundation: Typography

**Open Sans** for all UI text (Light 300, Regular 400, SemiBold 600).
**Oswald** for large stat/number displays only. Both have system fallbacks.

## The scale

| Role | Size / Weight / Line-height | Class |
|---|---|---|
| H1 | 32 / 300 / 42 | `.vela-h1` |
| H2 | 24 / 300 / 33 | `.vela-h2` |
| H3 | 20 / 300 / 27 | `.vela-h3` |
| H4 | 16 / 400 / 24 | `.vela-h4` |
| H5 | 14 / 600 / 21 | `.vela-h5` |
| H6 | 12 / 600 / 18 | `.vela-h6` |
| Body | 14 / 400 / 21 | `.vela-body` |
| Meta | 12 / 400 / 18, +0.3 tracking | `.vela-meta` |

Note the weight inversion: H1–H3 are **Light 300** and get their prominence from size;
H5–H6 are **SemiBold 600** and get theirs from weight. Do not "correct" H1 to bold.

## Rules

- Use the class that matches the **role**, not the one that matches the size you want.
- Button labels are **Regular 400 at every size** — never SemiBold, never Bold.
- Button labels are Title Case and verb-first: "Save Changes", not "Information".
- Each size is a triple. Never take a size without its line-height.

## Anti-patterns

- ❌ `font-size: 15px` outside a Button `large` → not on the scale.
- ❌ A bold H1 → H1 is Light 300.
- ❌ SemiBold button labels → Regular 400 at every size.
- ❌ Setting `font-family`/`font-size`/`line-height` by hand → use the class or the tokens.
