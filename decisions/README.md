# Decisions

Each folder is one decision: what was decided and when, what started it, what was considered,
what was measured where anything was, why the alternatives lost, and what is still open. A record
is written when the decision is taken and is not edited afterwards to look better. A change of
mind is a new record that names the one it supersedes. `GOVERNANCE.md` says when a decision
needs a record; `TEMPLATE.md` is the shape.

## Index

| No. | Record | Decided | Status |
|---|---|---|---|
| 001 | [Press feedback](press-feedback/README.md) | 23 Sep 2026 | Shipped in 0.12.0. Three holes in the anchored path still open; see the record. |
| 002 | [Agent-ready direction](002-agent-ready-direction/README.md) | 28 Oct 2026 | Partly shipped in 0.13.0: the `/headless` entry and its seven components. The agentic set is proposals only. |
| 003 | [Icons: a curated Lucide set, compiled into the core](003-icons-lucide-curated/README.md) | 29 Oct 2026 | Shipped as Experimental in 0.13.0. The move of the kit's own glyphs is open; see the record. |
| 004 | [Icon strokes may draw](004-icon-strokes-draw/README.md) | 30 Oct 2026 | Shipped in 0.14.0: the rule 1 exception and its checks. No component uses it yet; frame cost outside Chromium is open. |
| 005 | [Tabs hover preview: the Seed](005-tabs-hover-seed/README.md) | 30 Oct 2026 | Shipped in 0.14.0, with the press growing in place. The near/far hybrid and a real Windows contrast theme are open. |
| 006 | [The motion values are approved](006-motion-values-approved/README.md) | 31 Oct 2026 | Shipped in 0.15.0. Judged from Chromium recordings; Safari, Firefox, swipe and Dialog not seen. |

## Numbering

Records are numbered in the order they were decided, three digits, then a slug:
`decisions/<nnn>-<slug>/README.md`. The first record predates the convention and keeps its
folder name, `press-feedback`; it is 001 in this index and is not renamed, so existing links to
it keep working. From 002 the number is in the folder name.

Media, prototypes and data a record relies on live beside it in the same folder, so the argument
can be re-run. Record 001 keeps its prototype and the recordings that regenerate from
`tests/media/`.
