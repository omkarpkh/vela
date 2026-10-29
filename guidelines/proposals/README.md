# Proposals — specced, not built

These are Vela's Phase 2 agentic security components, published as specs before any code exists,
so the design can be read, argued with and cited in the open.

**Nothing here is in the package.** No component, type, token or Figma set named in these files
exists in `@omkarux/vela` today. An agent generating UI must not import or imitate them as if they
did: name the closest component that does exist, and flag the gap (`AGENTS.md`, rule 5).

| Spec | What it is | Rules (with proofs) | Stage |
|---|---|---|---|
| [Verdict Card](verdict-card.md) | One agent verdict on one case, with the person's decision on it | 28 (22) | pressure-tested |
| [Action Impact Card](action-impact-card.md) | What one proposed change will do, before it runs and after | 30 (22) | pressure-tested |
| [Autonomy Ladder](autonomy-ladder.md) | How far an agent may act alone on one action, and why a change landed where it did | 28 (22) | pressure-tested |
| [Approval Queue](approval-queue.md) | The one place a person decides on what agents propose; undecided means not run | 27 (21) | pressure-tested |
| [Calibrated Confidence Gate](calibrated-confidence-gate.md) | How sure an agent says it is, beside how often people confirmed it; decides which band the kit acts on | 21 (17) | pressure-tested |
| [Evidence Locker](evidence-locker.md) | Everything an agent used for one conclusion, as it was then; who could have written each item, and which claims rest on what | 19 (16) | pressure-tested |
| [Agent Provenance Badge](agent-provenance-badge.md) | Which agent, version and model produced an output, what started it, on whose authority, and whether its identity was verified | 15 (12) | pressure-tested |
| [Awareness Clock](awareness-clock.md) | When a named person became aware of something reportable under the CRA, NIS2 or DORA, and every reporting limit counted from the right moment | 20 (17) | pressure-tested |

Eight proposals: 188 rules, 149 with proofs.

**How a proposal becomes a component.** Each was drafted, then pressure-tested in a written
review that it answered point by point. When one is built, it moves to `guidelines/components/`,
its rule ids become `[[rule: id | level]]` tags that `npm run rules:check` holds to a proof, and its
Status line stays Experimental until its Figma set is published (`GOVERNANCE.md`).

**What they share.** Six new closed taxonomies, each kept apart from Severity, Risk and Status:
Verdict (4), Confidence band (4), Reversibility tier (4), Autonomy rung (4), Content trust (3) and
Evidence channel (3). None of them carries colour except Verdict, which has a text and icon row and
no background. The Agent Provenance Badge adds two closed prop sets that carry no tokens: Run type
(5) and Identity assurance (2). The Awareness Clock adds three more, also without tokens: Regime
(4), Answer (3) and Claim check (3). The order they will be
built in, and what each needs from Phase 1, is in [`ROADMAP.md`](../../ROADMAP.md).

**Evidence.** Each spec says what it answers and where that comes from: the EU AI Act (Article
14), the OWASP Top 10 for Agentic Applications, Microsoft's Taxonomy of Failure Modes v2.0, NIST
AI RMF, the reporting articles of the Cyber Resilience Act, NIS2 and DORA, published research, and
a read of 13 security vendors' agent features. None has been
tested with analysts yet; every rule is a claim to test, and each spec says so.
