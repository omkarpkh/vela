# Working in this repository

Vela is a design system. The rules live in `guidelines/` and they are load-bearing.

**Before generating or editing any component or style, read `guidelines/llms.txt`**, then the
relevant `guidelines/components/*.md`. Do not infer an API from the source — the guideline is
the specification and the source is one implementation of it.

## Non-negotiables

1. Bind **semantic** tokens (`var(--vela-text-default)`). Never a primitive, never raw hex.
2. Numeric tokens carry their unit — never `calc(var(--vela-space-10) * 1px)`.
3. Prop sets are **closed**. If a value is not in the Props table, it does not exist.
4. Severity (6) / Risk (3) / Status (5) are separate taxonomies. Never cross them.
5. Never invent a component. Name the closest match and flag the gap.
6. New colour pair? Add it to `PAIRS` in `scripts/contrast-core.mjs`. Unasserted is unverified.

## Before you claim it works

```bash
npm run verify        # typecheck + 158 tests + build + pack-and-consume gate
npm run test:visual   # 18 screenshots vs committed baselines; update only with test:visual:update
```
