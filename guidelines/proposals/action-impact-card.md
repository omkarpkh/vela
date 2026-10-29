# Action Impact Card

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

A card that shows, before anything happens, what one proposed change will do: the literal
operation, what it touches and how many, what breaks for whom, and whether it can be undone. The
same card stays with the change after it is applied, carrying the result and the rollback. It
describes a change. It does not approve one: approval belongs to the Approval Queue, and saving
a rule belongs to the Rule Builder.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## Intent

A person approving a change should be able to answer five questions from this card alone. What
exactly will run? What does it touch, and how many? What breaks, for whom, and when? Can it be
undone, and until when? How much of the picture is the estimate based on?

What it answers:

- **Microsoft Taxonomy of Failure Modes v2.0 (Jun 2026).** Human-in-the-loop bypass was the most
  exploited failure. Its mitigations are the two this card exists for. First, summarise an
  approval from the literal tool call, not from the agent's description. The card's headline is
  written by the host from the operation, the literal call sits right under it, and the agent's
  own reason comes last, labelled as the agent's. Second, tier approvals by reversibility and
  blast radius. The card makes both explicit and machine-readable, so the Autonomy Ladder and the
  Approval Queue can route on them.
- **EU AI Act, Article 14 (human oversight).** To decide not to use an output, or to reverse it,
  the overseer has to know what it does and whether it can be reversed *before* acting.
  Reversibility is a required, closed field, and the rollback path is on the card after the
  change.
- **OWASP Agentic Top 10 (Dec 2025).** ASI02, Tool Misuse and Exploitation: the literal operation
  and its target are always shown, so a permitted tool used on the wrong target is visible.
  ASI08, Cascading Failures: blast radius is a count per kind of object, with "where else this is
  used". ASI09, Human-Agent Trust Exploitation: the agent's framing never sits in the headline.
  ASI10, Rogue Agents: every card carries the call id and proposer for the Agent Action Ledger.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** No vendor renders blast radius
  as a count of affected assets or shows a rollback path on a security action. This card does
  both.
- **A self-initiated proposed-changes study (synthetic data).** A row that describes a change
  without showing it was caught in review, so the card carries a compact before → after diff. A
  short monitor window that missed a Friday-only pattern led to a rule: the card names the
  weekdays its estimate did not observe.
- **Romeo & Conti 2026.** Forcing functions beat explanations. Here the forcing is order: impact
  and reversibility come before anything a container can put in the footer.

Limits: the card shows the estimate the host computed. It does not compute impact, and a scope
count is a hint at a point in time, not a guarantee. It cannot see effects outside the systems
the host queried.

## When to use Action Impact Card

- One proposed or applied change to systems, policy or access → **Action Impact Card**.
- A conclusion about a case, with no change → **Verdict Card**.
- Deciding on one or many proposed changes → **Approval Queue**, which holds one card per item.
  A one-off approval is a queue of one.
- A rule being edited, with impact recomputed on each edit → **Rule Builder with dry-run
  impact** (Phase 2b), which embeds this card at stage `preview`.
- A record of what was done → **Agent Action Ledger**, whose entries open this card.
- A rollout across many devices or tenants in waves → a Rollout Wave tracker, **not in the kit**.
  Flag the gap.

## Props

```tsx
<ActionImpactCard
  actionId="ch_2291"
  version={2}
  stage="pending"
  summary="Narrow rule “Partner VPN egress” from all ports to 443 and 80."
  operation={{
    tool: "policy.rules.update",
    target: "rule/partner-vpn-egress",
    callId: "call_7c1e",
    language: "json",
    literal: '{ "rule": "partner-vpn-egress", "ports": [443, 80] }',
  }}
  diff={[{ field: "Ports", before: "1–65535", after: "443, 80" }]}
  reversibility={{ tier: "time-boxed", rollback: { summary: "Restores ports 1–65535 on this rule.", until: "2026-11-11T08:30:00Z" } }}
  blastRadius={{ kind: "devices", count: { atLeast: 312, reason: "2 of 4 sites not reporting" }, viewAt: { label: "Matching devices" } }}
  scope={[
    { kind: "partner organisations", count: { exact: 3 }, sample: ["Northwind", "Contoso", "Fabrikam"] },
    { kind: "rules", count: { exact: 1 } },
  ]}
  usedElsewhere={{ count: { exact: 0 } }}
  consequences={[
    { who: "Partner build servers", what: "Uploads on port 8080 would be blocked", when: "Tue–Wed, 02:00–04:00 UTC", basis: "observed" },
  ]}
  observed={{ from: "2026-10-27T00:00:00Z", to: "2026-10-29T23:59:00Z" }}
  expectedObservationDays={7}
  knownSchedules={[{ label: "Partner release uploads, Fridays", lastRun: "2026-10-24T03:00:00Z" }]}
  coverage={{ read: 2, of: 4, unit: "sites reporting", missing: ["Pune-2", "Leeds"] }}
  computedAt="2026-10-28T08:20:00Z"
  staleAfterMinutes={60}
  timeZone="UTC"
  proposedBy={{ kind: "agent", name: "Policy agent", version: "1.3" }}
  proposerReason="Ports beyond 443 and 80 saw no traffic in the last 3 days."
  onRecompute={recompute}
  footer={queueDecisionBar}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `actionId` | `string` | — | **Required.** Stable id of the change. |
| `version` | `number` | — | **Required.** Increments when the operation or its estimate changes. A decision in the container binds to it. |
| `stage` | `"preview" \| "pending" \| "applied" \| "failed" \| "rolled-back"` | — | **Required. These five only.** Lifecycle, not a taxonomy: no tokens, no colour. The props are a union over `stage` (below). |
| `summary` | `string` | — | **Required.** One sentence, verb first, written by the host from `operation`. |
| `operation` | `{ tool; target; literal; language?: "text" \| "json" \| "query" \| "shell"; callId? }` | — | **Required.** The literal call that will run, or ran. |
| `diff` | `{ field; before; after }[]` | `[]` | Compact before → after lines. Required in practice for any change to an existing object (see Hard constraints). |
| `reversibility` | `Reversibility` (below) | — | **Required.** The Reversibility tier and what goes with it. |
| `blastRadius` | `Scope` | — | **Required.** The one kind of object that measures the harm: devices for a network rule, users for an access change, tenants for an MSSP push. Containers sort and route on it; the text summary leads with it. |
| `scope` | `Scope[]` | `[]` | The other kinds of object the change touches, in any order. |
| `usedElsewhere` | `{ count: Count; viewAt? }` | — | Rules, policies or views that point at the target. Shown when passed. Required when the target is shared (convention). |
| `consequences` | `Consequence[]` | — | **Required; pass `[]` to claim nothing breaks.** `{ who; what; when?; basis: "observed" \| "inferred" }`. |
| `observed` | `{ from; to } \| { none: string }` | — | **Required.** The window of real data behind the estimate, or why there is none. |
| `expectedObservationDays` | `number` | `7` | The period the estimate should cover to see the change's normal pattern. Host-set: a monthly job needs 31. |
| `knownSchedules` | `KnownSchedule[]` | `[]` | Recurring activity the host knows about. With a `lastRun` date the card works out whether it was observed; without one the host asserts it. |
| `coverage` | `{ read; of; unit; missing?: string[] } \| { unreported: true }` | — | **Required.** How complete the evidence is. Never merged with impact or risk. |
| `alternative` | `{ summary: string; reversibility: Reversibility }` | — | A safer route to the same goal, such as disable-with-hold instead of delete. |
| `computedAt` | ISO 8601 with offset | — | **Required.** When the estimate was computed. |
| `staleAfterMinutes` | `number` | `60` | After this the estimate is stale. |
| `inputsChangedAt` | ISO 8601 with offset | — | When anything the estimate depends on last changed. If later than `computedAt`, the estimate is stale. |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |
| `proposedBy` | `{ kind: "agent" \| "person"; name; version? }` | — | **Required.** Replaced by an **Agent Provenance badge** slot when that spec lands. |
| `proposerReason` | `string` | — | The proposer's own words for why. Rendered last, labelled. |
| `result` | `Result` | — | **Required at `applied`, `failed` and `rolled-back`; forbidden at `preview` and `pending`.** |
| `rolledBack` | `{ by; at; reason }` | — | **Required at `rolled-back`; forbidden otherwise.** |
| `onRollback` | `OnRollback` | — | **Allowed only at `applied` and `failed`.** Offered when the tier allows it and the window is open. |
| `onRecompute` | `() => Promise<void>` | — | Offered whenever `isEstimateStale` says the estimate is stale. |
| `recomputeWith` | `string` | — | Shown on the stale line when `onRecompute` is not passed: who can recompute ("Ask the policy owner"). |
| `footer` | `ReactNode` | — | The slot for the container's controls (the Approval Queue's decision bar, the Rule Builder's save). Contract below. The card puts nothing there itself. |
| `decideWith` | `string` | `"Decide this in the Approval Queue."` | Shown in the footer region at `pending` when `footer` is not passed, so a pending change always shows its route. |

```ts
type Count =
  | { exact: number }
  | { atLeast: number; reason: string }
  | { unknown: string }                       // reason; renders as a gap, never as 0

type Scope = { kind: string; count: Count; sample?: string[]; viewAt?: { label: string; href?: string } }

type KnownSchedule =
  | { label: string; lastRun: string; observed?: never }   // ISO 8601; the card works out `observed`
  | { label: string; observed: boolean; lastRun?: never }  // no date known; the host asserts it

type Reversibility =
  | { tier: "undoable";     rollback: { summary: string } }
  | { tier: "time-boxed";   rollback: { summary: string; until: string } }
  | { tier: "counterable";  counterAction: { summary: string }; rollback?: never }
  | { tier: "irreversible"; reason: string; rollback?: never }

type Result     = { succeeded: number; failed: number; total: number; message?: string }
type RolledBack = { by: string; at: string; reason: string }
type OnRollback = (e: { actionId: string; version: number; reason: string; at: string }) => Promise<void>

// The public props are a union over `stage`. Do not flatten it: the stage rule is a compiler rule
// only because of this union.
type ActionImpactCardProps = CommonProps & (
  | { stage: "preview";     result?: never;  rolledBack?: never; onRollback?: never }
  | { stage: "pending";     result?: never;  rolledBack?: never; onRollback?: never }
  | { stage: "applied";     result: Result;  rolledBack?: never; onRollback?: OnRollback }
  | { stage: "failed";      result: Result;  rolledBack?: never; onRollback?: OnRollback }
  | { stage: "rolled-back"; result: Result;  rolledBack: RolledBack; onRollback?: never }
)
```

The fixtures for `impact-stage-closed-set` include `result` at `preview`, `rolledBack` at
`applied`, and `onRollback` at `pending`. Each must fail to compile.

### Exported helper

Staleness is pure: it depends on three props and the clock. So it is a function the card and its
containers both call, not state the card hands up.

```ts
export function isEstimateStale(
  p: Pick<ActionImpactCardProps, "computedAt" | "staleAfterMinutes" | "inputsChangedAt">,
  now: Date,
): { stale: false } | { stale: true; reason: "age" | "inputs-changed"; ageMinutes: number }
```

The card calls it on render and again each minute while mounted. The Approval Queue calls it
before enabling approval. One function, one test.

### The footer slot

This is the first Vela spec to carry a slot. It follows the slot rule on omkarux.com's
`/design-system/` page: the container owns the chrome and the consumer owns the content.

- **The card owns the region.** It owns the footer's padding, its top border, and its position
  last in reading order.
- **The container owns everything inside it.** That means controls, their labels and their state.
- **The card never styles into the slot and never reads from it.** No descendant selectors into
  `footer`, and no inspection of its children.
- **A pending change always shows a route.** At `pending` with no `footer`, the region prints
  `decideWith`. At other stages, an absent footer renders no region.

### New taxonomy: Reversibility tier

| Taxonomy | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Reversibility tier** (4) | `undoable` · `time-boxed` · `counterable` · `irreversible` | whether a change can be taken back, and how | Action Impact Card | **none.** Reversibility has no colour and no icon |

| Tier | Means | Card label | Example |
|---|---|---|---|
| `undoable` | One action restores the exact prior state, at any time. | "Can be undone" | Disable a rule; add a tag |
| `time-boxed` | One action restores the exact prior state until a deadline. | "Can be undone until 11 Nov, 08:30 UTC" | Rule change with a 14-day rollback; file quarantine held 30 days |
| `counterable` | The prior state cannot be restored, but a counter-action (in GRC and saga terms, a compensating action) restores function. | "Cannot be undone — can be countered" | Revoke sessions (users sign in again); reset a credential |
| `irreversible` | Nothing restores it. | "Cannot be undone" | Delete data with no copy; send a message outside the organisation |

The value is `counterable`, not `compensable`. Agents and hosts read the value, and a word whose
meaning can be guessed drifts less. Outside GRC and saga patterns, "compensable" reads as "eligible
for compensation".

Reversibility is not Severity, Risk or Status. An irreversible change is not a critical event,
and an undoable one is not low risk. A host does not derive one from another. The Autonomy Ladder
and the Approval Queue combine tier and blast radius to route a change; this card only states them.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Four tiers.** `undoable`, `time-boxed`, `counterable`, `irreversible`. There is no
  `"partial"`, no `"low"` and no `"unknown"`. A Severity, Risk or Status value does not compile.
  `reversibility-closed-set` · compiler
- **The tier decides what goes with it.** `time-boxed` requires `rollback.until`. `counterable`
  requires `counterAction` and forbids `rollback`. `irreversible` requires `reason` and forbids
  `rollback`. A rollback on an irreversible change does not compile. `reversibility-shape-by-tier` · compiler
- **No unknown tier.** Reversibility is required, and a host that cannot tell must choose the
  lower tier: `irreversible` before `counterable`, `counterable` before `time-boxed`. The tier
  comes from what the operation can do, never from the agent's claim about it.
  `reversibility-fail-closed` · convention
- **Five stages, each with its own props.** `preview`, `pending`, `applied`, `failed`,
  `rolled-back`. The props are a union over `stage`. `result` is required from `applied` on and
  forbidden before it. `rolledBack` is required at `rolled-back` and forbidden elsewhere.
  `onRollback` is allowed only at `applied` and `failed`. `impact-stage-closed-set` · compiler
- **A count is a number or a stated gap.** `Count` is `exact`, `atLeast` with a reason, or
  `unknown` with a reason. A bare number, `null` or `undefined` does not compile. The card never
  renders an unknown count as 0. `impact-count-states-gap` · compiler
- **The blast radius is named.** `blastRadius` is required and is a single `Scope`. A card with no
  blast radius does not compile. Meaning never rides on a position in an array.
  `impact-blast-radius-named` · compiler
- **Say what breaks, or claim nothing does.** `consequences` is required. `[]` prints "Nothing
  expected to break", followed by the observed window it rests on. `impact-consequences-required` · compiler
- **The literal is shown.** `operation.literal` and `operation.target` are required and render on
  the card, directly under the summary. The literal is shown in full up to 12 lines. A longer
  literal shows its first 12 lines and "Show all *n* lines", which expands in place. It is never
  cut silently, never moved into a tooltip and never replaced by the summary.
  `impact-literal-shown` · runtime
- **The headline is the host's.** `summary` is written by the host from `operation`. The
  proposer's words render only as `proposerReason`, last before the footer, labelled "Why the
  agent proposes this" (or "Why *name* proposes this" for a person).
  `impact-summary-from-operation` · convention
- **Reading order before action.** In DOM and reading order the card runs: freshness line,
  summary, literal, diff, reversibility, blast radius and scope, used elsewhere, consequences,
  observed window, coverage, alternative, proposer's reason, then the footer. Focus on open goes
  to the card's heading, never into the footer. `impact-reading-order` · runtime
- **Every count says when.** Scope prints "as of" `computedAt` in `timeZone`, zone included. At
  `preview` and `pending` the scope label is "match today", and the card says once: "Counts are
  a hint at that time, not a guarantee." `impact-counts-carry-time` · runtime
- **Say how much of the period was observed.** The card always prints "Observed *N* of *M*
  days", where *M* is `expectedObservationDays` and *N* is the number of full days in `observed`,
  capped at *M*. When `observed` spans less than seven full days, the card also names the weekdays
  it did not cover: "Not observed: Fri, Sat, Sun, Mon — weekly patterns on those days are not in
  this estimate." When *M* is more than seven and *N* < *M*, the card names the gap in days. For
  each `knownSchedules` entry with a `lastRun`, the card places that run against the window. If it
  falls inside, the schedule was observed. If it falls before the window, it was not. If it falls
  after the window, an earlier run may or may not have fallen inside it, so the card fails closed
  and prints "not confirmed in the observed window". An entry with `observed: false` is printed as
  given. When `observed` is `{ none }`, the card prints "Observed 0 of *M* days", every
  consequence must be `inferred`, and the card says the estimate has no observed data.
  `impact-observation-gap-named` · runtime
- **Observed and inferred are labelled.** Each consequence shows its basis in words: "seen in
  traffic" or "inferred". `impact-consequence-basis-shown` · runtime
- **Coverage is its own line.** "Sites reporting: 2 of 4 (missing: Pune-2, Leeds)". It is never
  merged with a count, a tier or a risk value, and `{ unreported: true }` prints "Evidence coverage
  not reported". `impact-coverage-separate` · runtime
- **Stale is derived and said first.** The estimate is stale when `computedAt` is older than
  `staleAfterMinutes`, or when `inputsChangedAt` is later than `computedAt`. Staleness is decided
  only by the exported `isEstimateStale(props, now)`, tested once on that function. When stale,
  the first line says so with the age and offers Recompute, or, without `onRecompute`, prints
  `recomputeWith`. The Approval Queue calls the same function. `impact-stale-derived` · runtime
- **Recompute keeps the old numbers in view.** While recomputing, the previous estimate stays,
  marked "as of 08:20 UTC — recomputing". It is never blanked, and counts never animate.
  `impact-recompute-keeps-numbers` · runtime
- **Rollback needs a reason.** Rollback opens a reason field in the card. An empty or
  whitespace-only reason does not submit, and the reason travels with the event to the ledger.
  `impact-rollback-requires-reason` · runtime
- **Rollback lives on the card while the window is open.** At `applied` and `failed`, for
  `undoable`, and for `time-boxed` until `until`, the Rollback button is on the card. After the
  deadline it is replaced by "Rollback closed at …". For `counterable` the card shows the
  counter-action in words, not a Rollback button. `impact-rollback-on-card` · runtime
- **A pending change always shows its route.** At `pending` with no `footer`, the footer region
  prints `decideWith`. A pending change never renders with no visible way to decide it.
  `impact-pending-has-route` · runtime
- **Partial results are counted.** At `applied` and `failed`, `result` renders as "Applied to 37
  of 40 · 3 failed", with the failed items reachable from the card. `impact-partial-result-counted` · runtime
- **The text summary is complete.** The card exposes a plain-text summary carrying the stage,
  summary, tier with deadline, the blast radius and every other scope count with its time, the
  first consequence and the unobserved days. It is the narrow fallback, the ledger line and the
  agent serialisation. `impact-text-summary-complete` · runtime
- **Every response has a state.** Recompute and Rollback each have pending, failed and conflict
  states, and a failure offers a next step. `impact-every-response-designed` · runtime
- **A shared target says where it is used.** When the target is referenced by other rules,
  policies or views, the host passes `usedElsewhere`, and the card shows the count before the
  consequences. `impact-shared-target-shows-use` · convention
- **Change to an existing object shows before → after.** An update to something that exists
  passes `diff`. A create or delete shows its single side ("Rule: — → created"). A change with no
  visible difference is not ready to approve. `impact-diff-for-updates` · convention
- **Offer the safer route.** When the host can achieve the goal with a higher tier (disable with
  a hold instead of delete), it passes `alternative`, and the card shows it before the proposer's
  reason. Clean-up disables first; it never deletes first. `impact-offer-safer-route` · convention
- **Labels claim only what the data knows.** "312 devices matched the rule's conditions at 08:20",
  not "312 devices are affected". `impact-labels-claim-only-data` · convention
- **The card never decides.** It has no approve, deny or save control of its own. Those come
  through `footer` from a container. A chat-style screen renders an Approval Queue of one.
  `impact-card-never-decides` · convention
- **The slot contract holds.** The card owns the footer region's padding, border and position. The
  container owns its contents. The card never styles into the slot or reads from it.
  `impact-footer-slot-contract` · convention
- **Below its minimum width it degrades to text**, never clips or overflows; the literal wraps and
  is never clipped at any width. `impact-degrades-below-minimum` · browser
- **After a rollback the person keeps their place.** The card does not scroll, collapse or
  re-mount; focus moves to the rollback line. `impact-keeps-place` · browser

**Proof plan:** 6 compiler (6 fixtures), 14 runtime (14 unit tests, `impact-stale-derived` on the
function), 2 browser (on the container-width harness shared with the Verdict Card), 8 convention —
30 rules, 22 of them with proofs.

### Sort order for containers

Both this spec and the Approval Queue use one default order, so a queue never sorts by a score the
card does not show:

1. **Tier**, most severe first: `irreversible`, `counterable`, `time-boxed`, `undoable`.
2. **Blast radius** — `blastRadius.count` — largest first. `unknown` sorts above every number: a
   count nobody can state is the most dangerous one. `atLeast n` sorts as *n*, and on a tie it
   sorts above `exact n`.
3. **`computedAt`**, oldest first.

The Queue may offer other sorts, but it never offers a single impact score: none exists, and a
score would hide which fact drives it.

## Token bindings

| Part | Token |
|---|---|
| Card surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4` |
| Padding / gaps | `--vela-space-15` around, `--vela-space-10` between blocks, `--vela-space-5` inside a block |
| Freshness line (current) | `--vela-text-de-emphasized`, Meta |
| Freshness line (stale) | `--vela-text-heading`, SemiBold, Body; icon `--vela-icon-strong` |
| Summary | `--vela-text-heading`, H5 |
| Literal block | `--vela-bg-raised`, border `--vela-border-subtle`, radius `--vela-radius-3`, `--vela-text-default`, `--vela-font-family-mono`, Meta size |
| Diff `before` | `--vela-text-de-emphasized`, line-through, in `<del>` |
| Diff `after` | `--vela-text-default`, in `<ins>`, no underline |
| Tier word | `--vela-text-default`; `--vela-font-weight-semibold` for `counterable` and `irreversible`, regular otherwise. **No icon.** |
| Scope counts | `--vela-text-default`, Body; count numerals tabular |
| Gaps (`atLeast`, `unknown`), "as of" times, basis labels | `--vela-text-de-emphasized`, Meta |
| Unobserved-days line | `--vela-text-default`, Body |
| Proposer's reason | `--vela-text-default`, Body, label in `--vela-text-de-emphasized` |
| Links | `--vela-text-link` |
| Rollback, Recompute, Show all | Button `regular`, `variant="standard" appearance="hollow"`. Rollback of an applied change is a consequence, so its confirm button inside the reason field is `variant="destructive" appearance="filled"`. |

**Icons (Lucide).** Tiers are words only, like confidence: the obvious glyph for "cannot be
undone" (`circle-slash`) is a block mark in most firewall consoles. Two glyphs remain:
`clock-alert` for a stale estimate (shared with the Verdict Card's "outdated") and `move-right`
for before → after, `aria-hidden`.

**Tokens:** the mono family `--vela-font-family-mono` and the Figma text style `Mono/Meta`
(Meta's size and line-height with a mono family). No colour tokens: reversibility, scope and stage
carry no colour. The literal block pairs `--vela-text-default` on `--vela-bg-raised`, asserted in
`PAIRS` in both themes.

## Sizes

None. One size; the container decides the layout.

## States

| State | What renders |
|---|---|
| Preview | Freshness "Estimate as of 08:20 UTC"; full card; scope labelled "match today"; no rollback. |
| Preview, recomputing | Previous estimate stays, marked "as of 08:20 UTC — recomputing"; `aria-busy` on the card body. |
| Pending | As preview; the footer carries the container's controls. |
| Pending, no footer | As preview; the footer region prints `decideWith` ("Decide this in the Approval Queue."). |
| Stale | First line: "Estimate is 3 h old — inputs changed at 10:05 UTC." Recompute offered, or `recomputeWith` printed. |
| Short observation | "Observed 3 of 7 days · Not observed: Fri, Sat, Sun, Mon"; any unobserved known schedule named. |
| Partial coverage | Coverage line names the missing sources; affected counts are `atLeast`, each with its reason. |
| No observed data | "No observed data: *reason*." Every consequence is labelled "inferred". |
| Nothing expected to break | "Nothing expected to break, based on traffic from 27 to 29 Oct (observed 3 of 7 days)." Unobserved days still named. |
| Applied | "Applied at 09:00 UTC to 40 of 40." Tier line with deadline; Rollback while open. |
| Applied, partly failed | Stage `failed`: "Applied to 37 of 40 · 3 failed: *message*." Failed items reachable; Rollback for the 37 while open. |
| Failed entirely | "Not applied: *message*." Next step (Retry through the container, or who to ask). No rollback: nothing changed. |
| Rolled back | "Rolled back by A. Rao at 11:40 UTC — *reason*." The original operation and its estimate stay visible beneath. |
| Rollback closed | "Rollback closed at 08:30 UTC on 11 Nov." |
| Counterable, applied | "Cannot be undone — to counter: *counterAction*." No Rollback button. |
| Irreversible | Tier line "Cannot be undone: *reason*." in SemiBold, above scope, at every stage. |
| Rollback failed | Inline: "Rollback not done: *message*." Retry; the reason draft is kept. |

Nothing animates except composed spinners. Expanding the literal is instant.

## Responsive behaviour

The card sizes against its container (`@container`). Widths are provisional until breakpoint
tokens land.

| Container width | Layout |
|---|---|
| ≥ 480 | Scope as a two-column definition list (kind · count); diff lines on one row each; footer on one line. |
| 320–479 | One column; scope stacks kind over count; diff `before` and `after` may wrap onto two lines, with the arrow staying with `after`. |
| 280–319 | One column; literal block wraps (`pre-wrap`, breaks anywhere); footer controls stack full width. |
| < 280 (minimum) | **Text summary** plus an "Open change" link. |

The literal wraps at every width and is never clipped or scrolled out of view horizontally: a
command that is half hidden is a command the person did not read.

The text summary, exactly:

```
Change (pending): Narrow rule “Partner VPN egress” from all ports to 443 and 80
Can be undone until 11 Nov 2026 08:30 UTC
Blast radius as of 28 Oct 2026 08:20 UTC: at least 312 devices (2 of 4 sites not reporting) · also 3 partner organisations · 1 rule
Breaks: Partner build servers — uploads on port 8080 would be blocked, Tue–Wed 02:00–04:00 UTC (seen in traffic)
Observed 3 of 7 days · Not observed: Fri, Sat, Sun, Mon · Not in window: Partner release uploads, Fridays (last run 24 Oct)
```

Further consequences are counted ("+2 more") in the summary, never dropped silently. **Compact
density** tightens block gaps to `--vela-space-5` and padding to `--vela-space-10`; type size and
the 24px minimum target do not change. On a SOC wall display, show the text summary.

## Accessibility

- The card is an `<article>` labelled by its summary, prefixed with the stage: "Pending change:
  Narrow rule …".
- The literal is a `<pre><code>` with an accessible name "Operation: *tool* on *target*". "Show all
  *n* lines" is a button with `aria-expanded`.
- Diff lines read in words for assistive technology: "Ports, from 1–65535 to 443, 80". The visible
  arrow is `aria-hidden`, and `<del>`/`<ins>` carry visually hidden "from" and "to", because most
  screen readers do not announce them.
- Tier, stage, counts, gaps and basis are all words. No colour carries meaning on this card.
- An unknown count is announced as "unknown", with its reason, never as zero.
- Turning stale while open is announced once, politely. Nothing is assertive.
- The rollback reason is a labelled Text Area. Its error is a message linked by
  `aria-describedby`.
- After a rollback, focus moves to the rollback line.
- Times are `<time datetime>` with the zone in the visible text.
- Both themes are real.

## Built from

- **Button** (core) for Recompute, Rollback, Show all.
- **Text Area** for the rollback reason.
- **Popover** for a full `sample` list behind "+N more", and for a scope `viewAt` preview when the
  host gives no link. Never for the literal, the tier or a consequence.
- **Dialog** only to confirm a rollback that is itself irreversible.
- **Toast**, optional, to announce a completed rollback. Never the only record.
- **Icon** (Lucide export): the two glyphs above.
- Inside it later: **Agent Provenance badge** replaces `proposedBy`. **Compact Inline Diff**
  replaces the built-in diff lines when it lands.
- Around it: **Approval Queue** (fills `footer` and binds to `version`), **Rule Builder** (stage
  `preview`, recompute on edit), **Agent Action Ledger** (opens the card from an entry).

## Figma mapping

Library file: **Vela Design System** → page `Action Impact Card`. Main set: `Tier` (4) × `Stage`
(5) = **20 variants**. A `Freshness` property (`Current`, `Stale`, `Recomputing`) applies to
`Preview` and `Pending` only. Booleans: `Has diff`, `Has gap` (any `atLeast` or `unknown` count),
`Partial coverage`, `Has alternative`, `Has footer`. The `Rollback` line is a nested set,
`Action Impact Card / Rollback`, with a `State` axis: `Open`, `Closed`, `Counter-action`, `None`.
The builder locks it to `Counter-action` for `Counterable` and to `None` for `Irreversible`.

| Figma property | Code prop |
|---|---|
| `Tier` | `reversibility.tier` |
| `Stage` | `stage` |
| `Freshness` | derived from `computedAt`, `staleAfterMinutes`, `inputsChangedAt` and recompute in flight |
| `Has diff` | `diff.length > 0` |
| `Has gap` | `blastRadius.count` or any `scope[].count` that is `atLeast` or `unknown` |
| `Partial coverage` | `coverage.read < coverage.of` |
| `Has alternative` | `alternative` passed |
| `Has footer` | `footer` passed — the slot is an instance swap, empty by default |
| `Rollback` (instance swap) | tier, stage and deadline |
| `Summary`, `Literal`, `Coverage` (text) | `summary`, `operation.literal`, coverage line |

Every fill, stroke and text binds a variable; the literal text binds the `Mono/Meta` text style.

## Anti-patterns

- ❌ `tier="low"`, `tier="critical"` or a Risk Pill standing in for reversibility → wrong taxonomy (will not compile).
- ❌ `{ tier: "irreversible", rollback: … }` → there is nothing to roll back (will not compile).
- ❌ `count: 0` when a site is not reporting → `{ atLeast: n, reason }` or `{ unknown: reason }`; a gap is not a zero.
- ❌ The agent's sentence as the headline → the host writes the summary from the literal call.
- ❌ The literal behind "Show details" or in a tooltip → it sits under the summary.
- ❌ Red/green diff colouring → before is struck through and de-emphasised; colour would cross into Severity.
- ❌ A coloured badge or an icon for "irreversible" → the word carries it, in SemiBold; a block glyph would collide with the host's.
- ❌ `tier: "compensable"` → the value is `counterable`.
- ❌ Sorting a queue by the largest count across different kinds → sort by `blastRadius`.
- ❌ Relying on the first entry of `scope` to mean the blast radius → name it in `blastRadius`; position carries no meaning.
- ❌ Flattening the stage union into one props type → the stage rule stops being provable.
- ❌ An Approve button inside the card → approval belongs to the Approval Queue's footer.
- ❌ "312 devices affected" → "312 devices matched at 08:20 UTC"; counts are hints with a time.
- ❌ Blanking the estimate while recomputing → keep the last numbers, marked with their time.
- ❌ A 3-day estimate presented as complete → name the weekdays not observed.
- ❌ Delete offered with no disable-with-hold alternative when one exists → pass `alternative`.

## Decisions taken in review (28–29 Oct 2026)

1. **Tier names** — `counterable`; "compensating action" stays in the prose for GRC readers.
2. **Footer slot or own decision bar** — footer slot only; a chat-style screen is an Approval Queue
   of one; `decideWith` keeps a pending card's route visible.
3. **Tier glyphs** — words only for all four tiers.
4. **Observation period** — host-set `expectedObservationDays` (default 7), "Observed N of M days"
   always printed; `knownSchedules` is a union, so the card places a dated run itself.
5. **No single score** — the default sort is tier, then blast radius, then age; `blastRadius` is a
   named, required prop.
