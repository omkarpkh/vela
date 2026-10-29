# Working in this repository

Vela is a design system and its rules are load-bearing. Read, in this order, then act:
1. **`DESIGN.md`** — the global rules: tokens, the three taxonomies, closed props, states, motion, theming, responsiveness, accessibility.
2. **`guidelines/components/<name>.md`** — the spec for the component you are touching. The guideline is the specification; the source is one implementation of it. Do not infer an API from `src/`.
3. New component? `DESIGN.md` → *How to add a component*, then `CONTRIBUTING.md`.

## Non-negotiables
1. Bind **semantic** tokens (`var(--vela-text-default)`). Never a primitive, never raw hex.
2. Numeric tokens carry their unit — never `calc(var(--vela-space-10) * 1px)`.
3. Prop sets are **closed**. If a value is not in the Props table, it does not exist.
4. Severity (6) / Risk (3) / Status (5) are separate taxonomies. Never cross them.
5. Never invent a component. Name the closest match and flag the gap.
6. New colour pair? Add it to `PAIRS` in `scripts/contrast-core.mjs`. Unasserted is unverified.
7. Reading a Figma node? If it is an instance of a Vela set, look it up in `guidelines/figma-map.json` and write that export with those props. Never reproduce Figma's generated markup.

## Before you claim it works
```bash
npm run verify        # tokens + rules + typecheck + tests (incl. css:check) + build + pack-and-consume gate
npm run test:e2e      # screenshots at four widths vs committed baselines + playground behaviour; Linux baselines are written by the "Visual baselines" workflow, never locally
```
