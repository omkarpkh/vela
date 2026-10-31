# Patterns: decisions a component can't make alone

A pattern is a scenario, not a component. It says how a page uses several components together,
and it records the decisions that sit outside any one control: who may read a value, where a mark
lives, what a row does. Patterns are told visually, with a figure for each decision. Each figure is
an SVG beside the page, in a folder named after it.

**Status.** A pattern takes the lowest status of the components it is carried out by. It is
Experimental while any of them is unbuilt or Experimental, and Stable only when all of them are.

**Not in the package yet.** `guidelines/patterns/` is left out of the npm package (`files` in
`package.json`) while every pattern cites components that aren't built. It ships once its
components do.

| Pattern | What it covers | Carried out by | Status |
|---|---|---|---|
| [Copy](copy.md) | Copying a value into another app, and the three questions a person can't answer alone: did it work, which one did I take, can I take it again | Copy Button, Copyable Value (specified, not built) | Experimental, not built |

## Kept true by CI: `pattern-cites-real-rules`

A pattern's *Tests* table names the component rules it stands on, each with its level, and states
the components' rule totals. `npm run rules:check` (`scripts/check-rules.mjs`) reads every
`guidelines/patterns/*.md` and checks the following.

- **Every cited rule exists,** as a `[[rule: id | level]]` tag in `guidelines/components/`, at
  the level the pattern says.
- **The totals line matches the specs.** Each component's "N rules, M with proofs" equals its
  spec's tags (with proofs means not `convention`), and the overall total is their sum.

A component that is only specified, not yet in `guidelines/components/`, is skipped and printed as
"not built yet". Its rows are checked once it lands. The check is a script in CI, like the rest of
`rules:check`. It belongs to this folder, not to a component, so no component's rule count
includes it.
