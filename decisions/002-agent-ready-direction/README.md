# Agent-ready direction

**Decided 28 October 2026. Vela is extended, not restarted: React first, then the
framework-agnostic contract; Base UI for behaviour under Vela's own CSS and tokens, no Tailwind;
a second entry point `@omkarux/vela/headless` carrying Base UI as an optional peer while
`@omkarux/vela` stays zero-dependency; one playground for both. The thing Vela does that other
systems do not is a security-console agentic component set. Everything stays public at zero
spend on GitHub Pages, under the `@omkarux` namespace. Pushes to `main`, npm and the Figma
library stay approval-gated. Shipped in 0.13.0: the `@omkarux/vela/headless` entry on Base UI
1.9, with Tabs, Checkbox, Radio Group, Popover, Tooltip, Dialog and Toast; the core stays
zero-dependency. The agentic set is public as proposals, not built.**

---

## What started it

Vela at 0.12.1 is six components, 242 tokens, two themes, five generated targets and 238
automated checks. The project brief for the next phase asks for a world-class design system for
security products: more components, complex patterns, a roadmap, and the upstream and
contribution machinery a system like that carries. The brief also allows buying an existing
system to borrow from.

Two questions had to be answered before any component was written. Whether to build on the
repository that exists or start again on a larger base. And how to get interaction behaviour
(focus management, typeahead, dismissal, positioning) for the components still unspecced, which
is the part of a component library that is expensive to write and easy to get wrong.

## What was considered

Options were compared against the brief and against the promises Vela has already made in
public, not scored. There were three decisions and two or three options each.

**Where to build**

- A. Extend this repository, package and Figma library.
- B. Restart on a larger open-source system (a fork, or a bought template) and port Vela's
  tokens and specs into it.

**How to get behaviour**

- C. Write it by hand, as the six existing components were.
- D. Base UI (`@base-ui/react` — written `@base-ui-components/react` here on 28 Oct, corrected the same day; MIT, from the MUI team): unstyled behaviour primitives,
  styled by Vela's CSS and bound to Vela's tokens.
- E. A styled system with its own tokens, Tailwind-based, re-themed to Vela.

**How to package it**

- F. One package. `@omkarux/vela` takes Base UI as a dependency.
- G. Two entry points. `@omkarux/vela` unchanged and zero-dependency; `@omkarux/vela/headless`
  carries the Base UI-backed components, with Base UI as an optional peer dependency. One
  playground shows both.

## The measurements

Nothing here was an experiment; these are counts, and they decided it.

- The promise "zero runtime dependencies" is made in **six places**: `README.md` (twice: the
  opening paragraph and the "Dependencies: None" row), the npm `description` in `package.json`,
  `guidelines/llms.txt`, `guidelines/setup.md` and the docs site's overview page
  (`demo/App.tsx`). It was also the stated reason the MUI bridge ships as JSON (0.9.0).
- A restart discards things that already agree with each other: one repository, one npm
  package at 0.12.1 with fifteen releases in its changelog, one Figma library of 237 variables
  and 6 component sets compiled from the same source, the docs site, and the portfolio pages on
  omkarux.com that describe all of them.
- Vela already has five generated targets from one token file: CSS, Dart, the MUI theme, the
  Figma variables and the Figma text styles. A second styling system would be a sixth target
  with a different model, or a target the other five cannot see.

## Why the alternatives lost

**B, restart.** Everything that exists agrees: the token file, the specs, the package, the
library and the public pages describe the same system at the same version. A restart keeps the
tokens and specs and throws away the agreement, then spends the first months rebuilding it. The
brief's gaps are in breadth, not in the foundation, and breadth is added to a foundation.

**C, hand-written behaviour.** Correct for six components; not a plan for forty. Focus traps,
listbox typeahead, floating positioning and dismissal rules are solved problems with test suites
behind them, and re-solving them is where a one-person system falls behind. Vela's value is the
contract and the enforcement, not the keyboard handler.

**E, a Tailwind-based system.** Tailwind is a second styling system. Vela's components bind
semantic tokens as CSS custom properties, and the Flutter and MUI bridges work because the token
file is the only source of a value. Utility classes carry values of their own, the Dart and MUI
generators cannot read them, and the dark theme's property (no primitive redefined) stops being
checkable. It would also force Tailwind on every consumer, including the Angular and Rails
consumers who take `tokens.css` alone.

**F, one package with a Base UI dependency.** It breaks a promise made in six places, to every
consumer at once, including the ones who installed Vela for the tokens and never render a React
component. Base UI is small and well-made; that is not the point. The point is that "zero
runtime dependencies" is a thing Vela said, and a system that enforces its design rules in CI
does not quietly drop the one about itself.

**D and G together** keep the promise and get the behaviour. The default entry point does not
change. A consumer who wants a Combobox or a Dialog imports from `/headless` and installs the
peer; one who does not pays nothing. One playground, because the contract is one contract:
the spec for a component does not know which entry point implements it.

## What was decided

- **Extend, do not restart.** The repository, package, Figma library and docs site continue.
- **React first, then the framework-agnostic contract.** Each new component ships as spec plus
  React implementation plus Figma set; the spec is written so a port needs no React to read it,
  as today.
- **Base UI for behaviour, Vela CSS and tokens for appearance. No Tailwind.** Base UI renders no
  styles of its own; every class on a Vela component is a `vela-*` class bound to semantic tokens,
  and the existing tests (no primitive in the dark block, every pair in `PAIRS`) apply unchanged.
- **Two entry points, one playground.** `@omkarux/vela` stays zero-dependency.
  `@omkarux/vela/headless` lists `@base-ui/react` as an optional peer dependency. The
  playground renders both, from the same registry.
- **The differentiator is a security-console agentic component set**: the components a security
  console needs when an agent is doing part of the work, specced with the same closed props,
  separate taxonomies and tagged rules as the six that exist. Which components, and in what
  order, is the next record.
- **Zero spend.** GitHub Pages for the docs, GitHub Actions for CI, npm Trusted Publishing, the
  public Figma library. No paid service is a dependency of the system being public.
- **`@omkarux` is the registry namespace** for this and any further package.
- **Approval gates stay.** Pushes to `main`, publishes to npm and publishes of the Figma library
  are prepared by scripts or agents and approved by the maintainer, one at a time. See
  `GOVERNANCE.md`.

## Still open

- Which components make up the agentic set, and their order. A separate record, with the
  closest-match analysis for each against the six that exist.
- Whether `/headless` components get Figma sets before or after their React implementation is
  Approved. The lifecycle in `GOVERNANCE.md` says Experimental components do not get a set.
- The icon set. Lucide (ISC) is the candidate named in `NOTICE`; nothing is included yet.
- What "framework-agnostic" delivers beyond the contract: a Web Components build, an Angular
  port, or only the tokens and specs as today. Not decided, deliberately.
- How the Base UI peer is pinned, and what a Base UI breaking release does to Vela's semver.
  *Answered 28 Oct, with the Tabs proving case:* peer range `1.9.x` (patch range), devDependency
  exact `1.9.0`, and the pack-and-consume gate installs the devDependency version so the pairing
  proven is the one developed against. A Base UI minor that changes behaviour is a Vela minor,
  taken deliberately; a Base UI major is a Vela decision record first.
