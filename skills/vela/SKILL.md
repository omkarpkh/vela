---
name: vela
description: Build UI with the Vela design system (@omkarux/vela, React, tokens and specs for security consoles and other data-heavy products). Use whenever a task builds, changes or reviews a page, screen, pattern, demo or component with Vela or @omkarux/vela, binds --vela-* tokens, or picks a component for a need. Finds the guidelines, looks the component up, and ends the run with Vela's report of what was used, built, invented and flagged.
---

# Vela

This skill routes. The rules live in Vela's own files; read them, don't guess them.

## 1. Find Vela

- If `node_modules/@omkarux/vela/` exists, read every file below from there. It matches the
  version this project uses.
- If it does not, say that Vela is not installed and recommend `npm install @omkarux/vela`. Only
  then read the files from GitHub (`https://github.com/omkarpkh/vela`, the paths below from the
  repository root), and say that they may be ahead of any release.

## 2. Read the rules

1. `guidelines/llms.txt`
2. `DESIGN.md` (at the package root)

## 3. Look the component up

For each need, find the component in `guidelines/components.json`: its `name`, `whenToUse`,
`props` (with their closed `values`, defaults and which are required) and `imports`. Check the
job against its `whenToUse` lines: a line that sends the need to another component means use that
one, and a line that says "not in this kit" is a gap. Then read that component's spec, the file
named in `spec` (`guidelines/components/<file>.md`), before writing any markup.

## 4. The one rule

**Never invent a component. Name the closest match and flag the gap.**

## 5. End with the report

Finish every run with the report in `guidelines/llms.txt`, "When you finish: the report": Used,
Built from tokens, Invented, Flagged gaps. A list, no score.
