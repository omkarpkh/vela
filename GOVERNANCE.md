# Governance

## Who decides

Vela has one maintainer, Omkar Khadamkar (omkarpkh@gmail.com). He reviews every pull request,
decides what is in scope, and is the only person who can push to `main`, publish to npm or
publish the Figma library. Those three actions are approval-gated: an agent or a script prepares
them, a person approves them, every time.

There is no steering group, no voting and no roadmap committee. If the project gains regular
contributors, this file changes first, in a pull request, before anyone gains write access.

Disagreement is settled in the pull request. Where a decision is bigger than a PR, it is written
up under `decisions/` and argued there (see "Decision records" below). The written record wins
over memory.

## Component lifecycle

Every component carries one of four labels. Approved is the default and is not written down.
Any other label is stated in the component's spec, as a `**Status:**` line directly under the
intent paragraph, and the same word goes into the Figma set's description and onto the
component's playground page. Today no component carries a label, so this is a rule in this file
and not yet code; the first component to leave Approved brings the code with it.

| Label | Meaning | What it promises |
|---|---|---|
| **Approved** | Specced, built, tested, in the Figma library, every rule tagged and proved. | Semver applies in full. Breaking changes follow `VERSIONING.md`. |
| **Known bugs** | Approved, with an open defect that changes behaviour or appearance. | Still safe to use. The defects are linked from the spec. Fixed in a patch; no API change. |
| **Experimental** | Specced and built, but the API or the visuals may still change. | May change in a minor release without a deprecation window. Not in the Figma library yet. |
| **Retired** | Replaced or removed. | Stays one deprecation window (two minors) with a dev-only warning, then is deleted. The spec names the replacement. |

A fifth label applies to the Figma file, not to a component: **"Main components — do not
touch."** It marks the source component sets on the library's component pages. They are created
and updated by the scripts in `scripts/figma/`; a change made by hand on the canvas is lost on
the next rebuild and is a drift the check reports. Design with instances; change the source
through the pipeline.

### What moves a component

- **Into Experimental:** a spec with every required heading, an implementation, unit tests, and
  a changelog entry. It ships with `Experimental` in its spec and does not get a Figma set yet.
- **Experimental → Approved:** every `## Hard constraints` bullet tagged and proved by
  `rules:check`; every colour pair it introduces in `PAIRS`; visual baselines committed; the
  Figma set built from a builder in `scripts/figma/components/` and diffed clean against the
  live library; the API reviewed by the maintainer. Approved is a release note, not a quiet edit.
- **Approved → Known bugs:** an accepted defect report that the next patch cannot close. The
  label comes off when the fix ships.
- **Anything → Retired:** a decision record naming the replacement, then a minor release that
  marks the exports `@deprecated` and the tokens `$deprecated`. Removal is a major (or, under
  0.x, a minor announced as breaking) at least two minors later.

Six components are Approved: Button, Toggle, Input, Contextual Alert, Status Indicator and
Tabs. Risk Pill and Text Area are Experimental until their Figma sets are published. The docs site lists every
component's label on its Status page, read from the spec.

## Breaking changes

A change is breaking when code or a design file that worked against the previous release stops
working, or renders differently, without being edited. `VERSIONING.md` lists the cases. The
short version: renaming or removing a token, a prop, a prop value, a CSS class, a Figma variable
or a Figma variant property is breaking. Adding is not. Changing a colour value is a visual
break and, under 0.x, is treated as one.

A breaking change is announced in three places before it ships: a `### Changed — breaking`
entry under `## [Unreleased]` in `CHANGELOG.md`; a deprecation in the release before, where one
is possible; and the GitHub release notes, which copy the changelog. The Figma library's publish
description carries the same text.

## Decision records

A decision that changes direction, rejects an alternative worth remembering, or constrains
future work is written up in `decisions/<nnn>-<slug>/README.md`, using `decisions/TEMPLATE.md`.
The index is `decisions/README.md`. A record states what was decided and when, what started it,
what was considered, what was measured where anything was, why the alternatives lost, and what
is still open. It is written when the decision is taken, not reconstructed later, and it is not
edited to look better afterwards: a later change of mind is a new record that supersedes it.

## Changing this file

By pull request, like anything else. The maintainer approves it; the change is noted in the
changelog.
