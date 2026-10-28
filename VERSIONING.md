# Versioning

Vela follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). The package is at
0.x, so the rules below are applied one step down: what would be a major is a minor announced as
breaking, what would be a minor is a minor, a patch is a patch. The 0.2.0 palette change set the
precedent, and the changelog says so.

A design system has more public surface than a library. Everything below is API.

## Breaking

A change that makes code, a stylesheet, a Dart file or a Figma file that worked against the
previous release stop working or render differently, without being edited.

- Renaming or removing a token in `tokens/vela.tokens.json`. This includes its CSS custom
  property, its Dart field, its MUI theme key and its Figma variable name, because all five come
  from the one entry.
- Removing a prop, a prop value, or a component. Narrowing a type so that valid usage stops
  compiling. Making an optional prop required.
- Changing a taxonomy: adding, removing or renaming a level of Severity (6), Risk (3) or Status
  (5). The counts are part of the contract.
- Renaming or removing a `.vela-*` CSS class, or a class a consumer must put on their own
  element (`vela-root`).
- Renaming a Figma variable, collection, text style, component set or variant property.
  Instances in consumer files detach or lose bindings.
- Changing a token's resolved value so that a committed visual baseline moves. Under 0.x a
  visual break is a break (see 0.2.0).
- Removing a package entry point from `exports`, or a file from `files`.
- Raising the minimum React, Node or Flutter version.

## Minor

- A new component, prop, prop value, token, entry point, Figma variant or text style.
- A new rule, where it is tagged and proved, and existing valid usage still compiles.
- A deprecation (see below). Deprecating is minor; removing is breaking.
- A new enforcement level, a new generated target, a new bridge.

## Patch

- A defect fix that brings behaviour back to what the spec says.
- A contrast fix that changes a token's value only to pass a pair that was failing, where the
  visual baselines move by that fix alone. The changelog states the before and after ratios.
- Documentation, spec wording that does not change a rule, changelog corrections, build and CI.
- Figma description text regenerated from an unchanged spec.

## Deprecation

A breaking change is preceded by a deprecation wherever one is possible. The window is **two
minor releases**: deprecated in `0.N.0`, still present in `0.N+1.0`, removable from `0.N+2.0`.

- **Tokens** carry `"$deprecated": "<reason and replacement>"` in `tokens/vela.tokens.json`. The
  generators carry it through: a CSS comment above the declaration, `@Deprecated` in Dart, and the
  Figma variable's description prefixed `Deprecated:`. The token keeps its value until removal.
- **Exports** carry a `@deprecated <reason and replacement>` JSDoc tag, which editors show, and a
  one-time `console.warn` in development builds only (`process.env.NODE_ENV !== 'production'`),
  naming the replacement. Production bundles are silent; the deprecation costs nothing at runtime
  there.
- **Props and prop values** are deprecated the same way, on the prop type.
- **CSS classes** are kept as aliases of the new class for the window, with a comment.

Each deprecation has a changelog entry naming the release it will be removed in, and the
removal's entry links back to it. The first deprecation to ship brings the generator support
with it; none has been needed yet.

## The Figma library

The library tracks npm. The published Figma version description begins with the npm version it
matches (`0.12.1 — …`), and the body copies that release's changelog entry. Every generated
component description already ends with `@omkarux/vela <version>`, so a set says which release it
came from. The library is published once per npm release, after the tag, and is not published
in between.

A change to the library that has no code counterpart (a fixed layer name, a re-ordered page) is
not a release and gets no version. It waits for the next one, and is listed in that entry.

## What a version does not promise

- The look of the demo site and the playground. They are documentation, not API.
- Internal module paths under `dist/`. Import from the entry points in `exports` only.
- The exact pixel output across browsers. The visual baselines are Chromium on Linux.
