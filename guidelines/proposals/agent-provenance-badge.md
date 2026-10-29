# Agent Provenance Badge

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

A short line of text that says who produced something: which agent and version, which model
answered, what started the chain it belongs to, on whose authority this run acted, and whether the
agent's identity was verified by the platform or only claimed by the agent itself. A Details control beside it opens the full
record: the delegation chain back to the person or event that started it, the identity it ran as,
and the ids that tie it to the Agent Action Ledger. It is text, not a control, and not an avatar.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** none for the line; @base-ui/react (optional peer, via /headless) for the Details
Popover.

## Intent

A person reading any agent output should be able to answer five questions without leaving it.
Which agent made this, and which version? Which model answered? Who or what set it going, and on
whose behalf did it act? Was the agent's identity checked by the platform, or did it just name
itself? And how do I find this run in the record?

What it answers:

- **OWASP Agentic Top 10 (Dec 2025).** ASI03, Identity and Privilege Abuse: agents can act in an
  "attribution gap", with permissions that shift without a clearly governed identity. The badge
  closes the gap on screen by naming the identity a run used and who it acted for. ASI07, Insecure
  Inter-Agent Communication, and ASI10, Rogue Agents: every badge carries the delegation chain and
  the run id, so the Ledger can tie person → agent → sub-agent → tool → data.
- **Microsoft Taxonomy of Failure Modes v2.0 (4 Jun 2026).** "Orchestrators should not grant
  elevated permissions to sub-agents based on self-asserted role", and "reject self-asserted role
  claims at orchestrator handoffs". The badge makes the difference visible to people too: a
  self-asserted identity is labelled in the line itself, never only in Details.
- **EU AI Act, Article 50(1) and (2).** Under 50(1), people must be "informed that they are
  interacting with an AI system"; a visible badge on every agent output helps a host meet that.
  Under 50(2), the *provider* must mark generated content "in a machine-readable format and
  detectable as artificially generated" — on the output itself. The badge does not by itself meet
  50(2): attributes on the badge mark the label, not the verdict beside it. So the spec exports
  `provenanceAttributes(p)`, which a host spreads onto the output's own container.
- **OpenTelemetry GenAI semantic conventions.** The agent, model and provider fields map onto
  GenAI attributes: `agent.id`, `.name` and `.version` onto `gen_ai.agent.*`; `model.provider` onto
  `gen_ai.provider.name`; `model.requested` and `model.answered` onto `gen_ai.request.model` and
  `gen_ai.response.model`. These attributes now live in the separate `semantic-conventions-genai`
  repository and are still in development, so the mapping may change. **Identity, authority,
  delegation and run type have no GenAI attribute yet.** `run.traceId` is the W3C trace id the spans
  carry. `run.runId` is the host's own id. One distinction matters on screen: the model a request
  *asked for* can differ from the model that *answered* (fallback and routing). The badge shows the
  one that answered.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** Agents are named, but no vendor
  shows the delegating person, the model version, or whether the agent's identity was verified, on
  the output itself.

Limits: the badge shows provenance the host recorded. It cannot verify an identity itself; it shows
whether the host's platform did. A badge is a label, not a guarantee.

## When to use Agent Provenance Badge

- Who produced a verdict, a proposed change, an evidence summary or a ledger entry → **Agent
  Provenance Badge**, in the slot those components leave for it.
- Who decided something, when that was a person → plain text with the name and time. The badge is
  for agents; a person's decision is already attributed by the host.
- An agent's permissions for an action → **Autonomy Ladder**. The badge says who acted, not what it
  may do.
- An agent's track record → **Calibrated Confidence Gate** (per band) or the **Autonomy Ladder**
  (per action).
- A list of every run → **Agent Action Ledger**, whose rows each carry a badge.

## Props

```tsx
<AgentProvenanceBadge
  provenance={{
    agent: { id: "agt_triage", name: "Triage agent", version: "2.4" },
    model: { provider: "Example AI", answered: "example-large-2026-09", requested: "example-large-latest" },
    identity: { assurance: "verified", runsAs: "svc-triage@corp", verifiedBy: "Corp workload identity" },
    run: { type: "event-triggered", trigger: "Detection rule 'Impossible travel'", runId: "run_5f1c", traceId: "4bf92f35…" },
    onBehalfOf: { noPerson: "Started by a detection rule; no person asked for this run" },
    at: "2026-10-28T08:32:00Z",
  }}
  timeZone="UTC"
/>
```

A sub-agent's badge, with its chain:

```tsx
<AgentProvenanceBadge
  provenance={{
    agent: { id: "agt_contain", name: "Containment agent", version: "3.1" },
    model: { provider: "Example AI", answered: "example-small-2026-08" },
    identity: { assurance: "self-asserted" },
    run: { type: "delegated", runId: "run_5f2a", traceId: "4bf92f35…",
           delegatedFrom: parentProvenance },          // the Triage agent's provenance, above
    onBehalfOf: { person: "A. Rao", via: "approval", at: "2026-10-28T08:50:00Z" },
    at: "2026-10-28T08:51:00Z",
  }}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `provenance` | `Provenance` | — | **Required.** The record below. |
| `recordModel` | `string` | — | The model the agent's confidence record was earned on (from the Gate's record), when the host has one. The line shows the model when the answering model differs from it. |
| `size` | `"line" \| "summary"` | `"line"` | **These two only.** `line`: one wrapping line plus Details. `summary`: the line only, for a table cell or a ledger row, with Details reached from the row. |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |

```ts
type RunType = "on-request" | "scheduled" | "event-triggered" | "delegated" | "shadow"
type IdentityAssurance = "verified" | "self-asserted"

type Provenance = {
  agent: { id: string; name: string; version: string }                  // gen_ai.agent.id / .name / .version
  model:
    | { provider: string; answered: string; requested?: string }          // gen_ai.provider.name, gen_ai.response.model, gen_ai.request.model
    | { notDisclosed: string }                                            // why the host does not say
  identity:
    | { assurance: "verified"; runsAs: string; verifiedBy: string }       // the platform checked it; verifiedBy: "Entra workload identity"
    | { assurance: "self-asserted"; runsAs?: never; verifiedBy?: never }  // the agent named itself
  run:
    | { type: "delegated"; runId: string; traceId?: string; delegatedFrom: Provenance; trigger?: never }
    | { type: "event-triggered"; runId: string; traceId?: string; trigger: string; delegatedFrom?: never }
    | { type: "on-request" | "scheduled" | "shadow"; runId: string; traceId?: string; trigger?: never; delegatedFrom?: never }
  onBehalfOf:
    | { person: string; via: "request" | "approval" | "delegated-token"; at: string }
    | { noPerson: string }                                                // why no person: "Started by a detection rule"
  at: string                                                              // when this output was produced (ISO 8601)
}

// Origin and authority are two facts.
// Origin: what started the chain — the root's trigger, or the person who asked for the root run.
// Authority: this run's own `onBehalfOf` — approved by, asked by, on behalf of, or no person.
export const VELA_MAX_CHAIN_DEPTH = 16

// Attributes a host spreads onto the output's own container, so the machine-readable marking sits on
// the verdict or summary itself, not only on its label. `data-model` is left out when the model is
// not disclosed; no placeholder is written.
export function provenanceAttributes(p: Provenance): {
  "data-ai-generated": "true"
  "data-agent-id": string; "data-agent-version": string
  "data-run-id": string; "data-identity-assurance": IdentityAssurance
  "data-model"?: string
}
```

### New closed sets

Two small closed prop sets. They carry no tokens, so they are not colour taxonomies, but like the
taxonomies they never cross Severity, Risk, Status or any other set.

| Set | Values | Means |
|---|---|---|
| **Run type** (5) | `on-request` · `scheduled` · `event-triggered` · `delegated` · `shadow` | how the run started. `shadow` means people review its output without acting on it, the Gate's route to calibration |
| **Identity assurance** (2) | `verified` · `self-asserted` | whether the host's platform checked who the agent is (`verified`, with the identity it ran as) or only took the agent's word (`self-asserted`) |

### The line

The line reads, in this order:

1. agent and version, with "(named itself)" when self-asserted;
2. the model, only when it differs from the request or from `recordModel`, or is not disclosed;
3. **origin** — "started by …": the root's trigger, or the person who asked for the root run;
4. for a delegated run, the immediate parent — "via …";
5. **authority** — this run's own `onBehalfOf`: "approved by …", "asked by …", "on behalf of …", or
   "no person";
6. "chain includes an agent that named itself", when any link above this one is self-asserted;
7. the run type, when it is `scheduled` or `shadow`.

When origin and authority are the same person (an on-request run), the line says it once: "asked
by A. Rao".

| Case | Line |
|---|---|
| Event-triggered, verified | "Triage agent 2.4 · started by Detection rule 'Impossible travel' · no person" |
| Delegated, self-asserted, approved | "Containment agent 3.1 (named itself) · started by Detection rule 'Impossible travel' · via Triage agent 2.4 · approved by A. Rao" |
| Delegated, verified, parent self-asserted | "Containment agent 3.1 · started by … · via Triage agent 2.4 · approved by A. Rao · chain includes an agent that named itself" |
| On request | "Triage agent 2.4 · asked by A. Rao" |
| Scheduled | "Triage agent 2.4 · scheduled · no person" |
| Shadow | "Triage agent 2.4 · shadow run — no action taken" |
| Model differs from the request | "Triage agent 2.4 · model differs from request · …"; Details shows both |
| Model differs from the record | "Triage agent 2.4 · model differs from its record · …"; Details shows both |
| Model not disclosed | "Triage agent 2.4 · model not disclosed · …" |
| Chain too deep or looping | "… · chain not complete" |

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Five run types, two assurances.** `run.type` and `identity.assurance` accept only their sets.
  There is no `"autonomous"`, no `"manual"`, no `"trusted"` and no `"unknown"`.
  `provenance-closed-sets` · compiler
- **A verified identity names what it ran as and who checked; a self-asserted one cannot.**
  `verified` requires `runsAs` and `verifiedBy`; `self-asserted` forbids both, because a claimed
  identity has no checked account to show.
  `provenance-identity-shape` · compiler
- **A delegated run names its parent; nothing else does.** `delegated` requires `delegatedFrom`,
  a full `Provenance`. `event-triggered` requires `trigger`. Other run types forbid both.
  `provenance-run-shape` · compiler
- **On whose behalf is always stated.** `onBehalfOf` is required: a person with how they are
  involved (`request`, `approval` or `delegated-token`) and when, or `{ noPerson }` with why.
  Silence never means "nobody". `provenance-on-behalf-required` · compiler
- **The model is stated, or why not.** `model` is required: the model that answered, or
  `{ notDisclosed }` with a reason. `provenance-model-required` · compiler
- **Self-asserted is said in the line, for this agent and up the chain.** A `self-asserted`
  identity appends "(named itself)" to the agent's name in the line, at both sizes, and Details
  says "The platform did not verify this agent's identity; it is the agent's own claim." When any
  link above this one in the chain is self-asserted, the line adds "chain includes an agent that
  named itself", even when this agent is verified: a verified agent acting on an unverified
  parent's instruction inherits the doubt. It is never only in Details.
  `provenance-self-asserted-in-line` · runtime
- **Origin and authority are both shown, origin first.** Origin is what started the chain: the
  root's trigger, or the person who asked for the root run ("started by …"). Authority is this
  run's own `onBehalfOf` ("approved by …", "asked by …", "on behalf of …", "no person"). The line
  shows both, plus the immediate parent for a delegated run ("via …"). Details lists the whole
  chain, newest first, each link with its own assurance. A chain deeper than three shows the first
  two links, "+*n* more", then the root. The walk stops at `VELA_MAX_CHAIN_DEPTH` (16), or as soon as
  it meets a run id it has already seen, and the line then says "chain not complete": a cyclic or
  runaway `delegatedFrom` can never hang the badge. `provenance-root-named` · runtime
- **The model that answered is shown, and a change is never silent.** Details always shows the
  model that answered. The line shows it when it differs from `model.requested` ("model differs
  from request") or from `recordModel` ("model differs from its record"), and Details shows both
  names. A routing fallback or a provider swap is never hidden behind the requested name, or behind
  a record earned on another model. `provenance-answered-model-shown` · runtime
- **Shadow is said everywhere.** A `shadow` run reads "shadow run — no action taken" in the line, in
  Details and in the text summary. `provenance-shadow-said` · runtime
- **Details is a separate control.** The line is text. Details is a real button beside it, named
  "Provenance details for Triage agent 2.4", which opens a Popover. The line itself has no click
  handler, hover state or focus stop. `provenance-details-separate` · runtime
- **The text summary is complete, and the output can be marked.** The badge exposes a plain-text
  summary, carrying every field of the line plus the run id. `provenanceAttributes(p)` returns the
  attributes a host spreads onto the output's own container: `data-ai-generated`, the agent id and
  version, the run id, the identity assurance, and `data-model`, which is left out when the model is
  not disclosed. The function is pure and tested once.
  `provenance-text-summary-complete` · runtime
- **The line wraps; it never truncates.** An ellipsis would cut the "(named itself)" or the root
  person. Below its minimum width the badge prints "Agent: *name* *version*" and Details.
  `provenance-never-truncates` · browser
- **When in doubt, self-asserted.** A host that cannot tell whether its platform verified an
  agent's identity marks it `self-asserted`. A role or name the agent states about itself at a
  handoff is never `verified`. `provenance-identity-fail-closed` · convention
- **No avatar, no colour per agent.** No faces, robots, mascots or per-agent colours. An agent is
  named software. A colour per agent would compete with the kit's taxonomies, and a face invites
  the trust the kit is built to earn. `provenance-no-avatar` · convention
- **Labels claim only what the data knows.** "Approved by A. Rao" only when the host has the
  approval record; "asked by" only for a request; "on behalf of" only with a delegated token.
  "Verified by *verifiedBy*" means that platform checked the identity, not that the agent behaved
  well.
  `provenance-labels-claim-only-data` · convention

**Proof plan:** 5 compiler (5 fixtures), 6 runtime (6 unit tests), 1 browser (on the shared
container-width harness), 3 convention — 15 rules, 12 with proofs.

## Token bindings

| Part | Token |
|---|---|
| Line | `--vela-text-de-emphasized`, Meta; the agent name and version `--vela-text-default`, Meta |
| "(named itself)" | `--vela-text-heading`, Meta, SemiBold — the one emphasis in the line |
| "shadow run — no action taken" | `--vela-text-heading`, Meta, SemiBold |
| Details button | Button `tiny`, `variant="primary" appearance="text-link"`, label "Details" |
| Details popover | Popover surface (Phase 1); chain as an ordered list; ids in `--vela-font-family-mono`, Meta, with Copy |

**New tokens needed:** none. **PAIRS:** none new. **Icons:** none. Provenance is words.

## Sizes

| size | Use | Holds |
|---|---|---|
| `line` | under or beside an output: a Verdict Card, an Action Impact Card, a Locker item | the line, wrapping, plus Details |
| `summary` | a table cell or a ledger row | the line, wrapping; Details is reached from the row, not the cell |

## States

| State | What renders |
|---|---|
| Verified | The line; Details shows "Identity verified by *verifiedBy* — ran as *runsAs*". |
| Chain includes self-asserted | The line adds "chain includes an agent that named itself"; Details marks the link. |
| Chain not complete | The line adds "chain not complete"; Details lists the links walked, then "Stopped after 16 links" or "Stopped: this run appears twice in its own chain". |
| Self-asserted | The line with "(named itself)"; Details explains it. |
| Delegated | The line names the parent and the root; Details lists the chain. |
| Deep chain | Details: the first two links, "+*n* more", the root; "Show full chain" expands in place. |
| Event-triggered, no person | "… · started by *trigger* · no person". |
| Shadow | "… · shadow run — no action taken". |
| Model differs | "… · model differs from request" or "… · model differs from its record"; Details shows both names. |
| Model not disclosed | "… · model not disclosed"; Details gives the reason. |
| Details open | Popover with agent, version, model, identity, run type, trigger or parent chain, on whose behalf, time, run id and trace id (each with Copy). |

Nothing animates.

## Responsive behaviour

The badge is inline text and wraps like text. It has no minimum width of its own in `summary`. In
`line`, below 200 px of container it prints "Agent: *name* *version*" plus Details, keeping
"(named itself)" when it applies. It never truncates. The Details Popover follows Popover's own
placement rules.

The text summary, exactly:

```
Produced by Containment agent 3.1 (identity not verified — the agent named itself)
Model: example-small-2026-08 (Example AI)
Started by Detection rule 'Impossible travel' · via Triage agent 2.4 (verified by Corp workload identity, ran as svc-triage@corp)
Approved by A. Rao at 08:50 UTC · run run_5f2a · 28 Oct 2026 08:51 UTC
```

## Accessibility

- The line is text inside the host's output. The Details button has an accessible name that
  includes the agent: "Provenance details for Containment agent 3.1".
- "(named itself)" is part of the text, so it is read with the name, not as a separate tooltip.
- In Details, the chain is an ordered list, newest first, and each link reads its own assurance.
- Ids have a Copy button; the copied text is the id alone.
- No colour, icon or avatar carries meaning. Both themes are real.

## Built from

- **Button** (core) for Details, Copy and Show full chain.
- **Popover** (Phase 1) for Details.
- Placed in, replacing the plain identity props those specs left as slots (see *Changes this makes
  to other specs*): the **Verdict Card**, the **Action Impact Card**, the **Autonomy Ladder** and
  the **Calibrated Confidence Gate**. The **Approval Queue** shows each card's badge through the
  card. The **Evidence Locker** may show one on an `agent-output` item. The **Agent Action Ledger**
  carries one per row at `size="summary"`.

## Changes this makes to other specs

Applied in this same change, so each public spec breaks once. **Four breaking changes**, because
adding a required `id` breaks every existing call:

1. **Verdict Card — breaking:** `source: { name; version }` → `source: Provenance`. The card shows
   the badge at `line` size under the verdict, and spreads `provenanceAttributes(source)` on its
   own `<article>`.
2. **Action Impact Card — breaking:** `proposedBy: { kind: "agent" | "person"; name; version? }` →
   `proposedBy: { kind: "agent"; provenance: Provenance } | { kind: "person"; name: string }`. A
   person is named in plain text; an agent gets the badge.
3. **Autonomy Ladder — breaking:** `agent: { name; version }` → `agent: Provenance["agent"]`, which
   adds a required `id`.
4. **Calibrated Confidence Gate — breaking:** `reading.producer: { name; version }` →
   `reading.producer: Provenance["agent"] & { model: string }`, where `model` is the model that
   answered. The calibration record is keyed by agent version **and** model: it gains
   `producerModel`, and a reading whose `producer.model` differs from the record's `producerModel`
   gates as `new-version`, unless the host lists the model in `compatibleWith`. A model swap under
   an unchanged agent version can no longer inherit the old model's record. The Gate's rule count
   does not change: the check joins `gate-record-is-current`.
5. **Evidence Locker — not breaking:** an `agent-output` item may add `provenance?: Provenance`
   beside `writtenBy`.

## Figma mapping

Library file: **Vela Design System** → page `Agent Provenance Badge`. One set: `Assurance`
(`Verified`, `Self-asserted`) × `Run` (`On request`, `Scheduled`, `Event`, `Delegated`, `Shadow`) ×
`Size` (`Line`, `Summary`) = **20 variants**. Text properties: `Agent`, `Version`, `Origin`,
`Parent` (Delegated only), `Authority`. Booleans: `Chain has self-asserted` and `Chain not complete`
(Delegated only). A nested set, `Agent Provenance Badge / Model`, has one axis: `Usual` (not
shown), `Differs from request`, `Differs from record`, `Not disclosed`. One axis instead of two
booleans, so no impossible pair can be switched on.

| Figma property | Code |
|---|---|
| `Assurance` | `identity.assurance` |
| `Run` | `run.type` |
| `Size` | `size` |
| `Agent`, `Version` | `agent.name`, `agent.version` |
| `Origin` | the chain root's `trigger`, or the person who asked for the root run |
| `Parent` | `run.delegatedFrom.agent` |
| `Authority` | this run's `onBehalfOf` |
| `Model` (nested) | `model.notDisclosed`; `answered ≠ requested`; `answered ≠ recordModel`; otherwise `Usual` |

The builder places no image layer and no fill per agent. Every fill, stroke and text binds a
variable.

## Anti-patterns

- ❌ A robot avatar or a colour per agent → an agent is named software; colour belongs to the taxonomies.
- ❌ "Triage agent" with no version → the version is required; records belong to versions.
- ❌ A self-asserted identity shown like a verified one, with the difference only in a tooltip → "(named itself)" in the line.
- ❌ `run.type: "autonomous"` → say how it started: on request, scheduled, event, delegated or shadow (will not compile).
- ❌ Leaving out `onBehalfOf` when no person was involved → `{ noPerson: reason }`; silence is not "nobody".
- ❌ Showing the requested model when another one answered → show the model that answered.
- ❌ "Approved by A. Rao" standing in for what started the chain → origin and authority are two facts; show both, origin first.
- ❌ Walking `delegatedFrom` without a limit → stop at 16 links or a repeated run id; say "chain not complete".
- ❌ Attributes on the badge alone, as if that marked the output → spread `provenanceAttributes(p)` on the output's container.
- ❌ `data-model="unknown"` when the model is not disclosed → leave the attribute out.
- ❌ Truncating a long chain with an ellipsis → name the root; fold the middle into "+*n* more".
- ❌ Making the whole badge clickable → the line is text; Details is the control.
- ❌ "Approved by A. Rao" without an approval record → "asked by" or "on behalf of", only as the data shows.

## Decisions taken in review (29 Oct 2026)

1. **Always show the model?** — not always. Details always shows it. The line shows it when it
   differs from the request or from the model the agent's record was earned on (`recordModel`).
2. **Self-asserted further up the chain?** — yes: "chain includes an agent that named itself",
   folded into `provenance-self-asserted-in-line`.
3. **Link a shadow badge to the Gate?** — no. The badge says who produced something; a host can
   place the Gate beside it.
4. **One change or two?** — one: the Evidence Locker, this badge, and the amendments to the Verdict
   Card, Action Impact Card, Ladder and Gate, together, so each public spec breaks once.
