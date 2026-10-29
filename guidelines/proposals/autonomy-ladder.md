# Autonomy Ladder

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

Shows, and lets an authorised person set, how far one agent may act alone on one kind of action.
It also explains, for any single change, which rung that change landed on and why. The ladder
changes no system. It changes a permission, with a reason, in the open.

The spec covers two components and two functions, which ship together:

- **`AutonomyLadder`** — the permission view for one agent and one action class: the four rungs,
  the current ceiling, any cap, per-target limits, the track record, the step-down rule, who is
  alerted, and the history.
- **`AutonomyRoute`** — a short inline line for one change: "Route: You approve each —
  irreversible change (safety limit)". It sits in a container's slot, such as the Approval
  Queue's decision area inside an Action Impact Card footer.
- **`resolveRoute(input)`** — the one pure function that decides a change's rung. The ladder, the
  route line, the Approval Queue and the Rule Builder all call it.
- **`validatePolicy(policy)`** — a second pure function that finds what a policy gets wrong while
  still compiling: band labels that do not exist, missing or duplicate cells, bands out of order,
  and a grid that gives more autonomy to a bigger or less reversible change.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless)

> **Changed 29 Oct 2026 — breaking.** With the [Agent Provenance Badge](agent-provenance-badge.md),
> `agent` is `Provenance["agent"]`, which adds a required `id`, so the ladder, the route line and
> the badge name an agent the same way.

## Intent

A security lead should be able to answer five questions from the ladder alone. How far may this
agent act alone on this action? Where is it held back, and by whom? What is its record on this
action? What makes it step down, and who hears about it? And for any one change: why did this
change land where it did?

What it answers:

- **EU AI Act, Article 14(3).** "The oversight measures shall be commensurate with the risks,
  level of autonomy and context of use." The ladder makes the level of autonomy an explicit,
  per-action setting, and the route line shows the measure that applied to each change.
  **Article 14(4)(a), (b) and (d)** — monitor operation, stay aware of automation bias, and decide
  not to use the output. Every rung keeps a human act, and no rung removes the person. The stop
  button of 14(4)(e) is the Stop control's job.
- **Microsoft Taxonomy of Failure Modes v2.0 (4 Jun 2026).** Human-in-the-loop bypass is "the most
  consistently exploited failure mode, at very high frequency". Approvals were bypassed through
  "consent fatigue, manipulation of probabilistic invocation" and incremental escalation. The
  post's hardening advice maps onto four decisions here:
  - It asks for "deterministic HitL invocation". So whether a person sees a change is decided by
    `resolveRoute` from host policy, never by the agent's judgment. "Ask if unsure" is therefore
    not a rung (see *Departures*).
  - Incremental escalation is answered twice: the system never climbs a rung on its own, and a
    person climbs one rung at a time.
  - It warns against granting elevated permissions to sub-agents "based on self-asserted role".
    So a delegated sub-agent never routes above the agent that delegated to it.
  - It asks for "tiered approval requirements that scale with action reversibility and blast
    radius". So the policy is a tier × blast-radius grid, printed on the ladder.
- **OWASP Agentic Top 10 (Dec 2025).** ASI03, Identity and Privilege Abuse: limits are set per
  agent identity and per target class, and delegation cannot raise them. ASI09, Human-Agent Trust
  Exploitation: proven actions can climb, so approvals stay rare enough to be read. Climbs need a
  visible record and a reason. ASI10, Rogue Agents: a stated step-down rule, run by the host,
  moves the agent down and alerts named people.
- **NIST AI RMF, MEASURE 2.8.** Track override statistics. The track record shows overrides and
  rollbacks per action, beside the control that would raise the rung.
- **Claude Code and the OpenAI Agents SDK.** In both, deny rules win in every mode and review
  timeouts fail closed. Here `person-acts` wins over every other limit, and a missing policy cell
  fails closed to `person-approves`.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** Only Google SecOps ships a
  user-settable ladder (a risk ceiling plus per-tool overrides). No vendor shows a person why a
  given action landed where it did.
- **The permission ladder on omkarux.com** (the page at `/next/agent-alone/`, marked "Exploring",
  no data yet). It supplies four ideas this spec keeps:
  - a ladder set separately for each action;
  - two dials — how much the agent may do alone, and what it can reach (an ordinary laptop
    versus a domain controller);
  - stepping down, with a reason, when accuracy drops;
  - a per-action track record: how often right, what it cost when it wasn't, and who fixed it.

  It also supplies the rule that no agent can edit or silence the alert list.

Limits: the ladder shows and sets permissions. It does not measure the agent's accuracy; the
host supplies the track record and runs the step-down rule. A route is only as good as the policy
and the impact estimate it reads.

### Departures from the public page

The public page has four rungs, named by what the agent does: Ask every time · Ask if unsure ·
Act, then tell · Act alone. This spec names rungs by what the person does, and changes two of
them:

- **"Ask if unsure" becomes a policy condition, not a rung.** If the agent's own sense of being
  unsure decides whether a person sees a change, that is the "probabilistic invocation" the
  Microsoft post names as a bypass. Here the policy can lower a route when the producer reports a
  `low` or `unrated` confidence band. Confidence can only lower a rung, never raise one.
- **"Act alone" is not offered.** Every rung keeps a human act. The highest rung,
  `person-reviews-after`, means the agent acts and every action lands in a person's review list.
- **Added:** `person-acts`, where the agent may only recommend. This is the rung that wins over
  everything, the way deny rules win in Claude Code and the Agents SDK. Also added:
  `person-can-stop`, where the agent acts after a hold unless a person stops it. It is for fast
  containment that can be undone.

## When to use Autonomy Ladder

- Setting or reviewing how far an agent may act alone on one action class → **`AutonomyLadder`**.
- Showing why one change needs approval, or does not → **`AutonomyRoute`**, inside the
  container's slot.
- Deciding on a change → **Approval Queue**. The ladder sets the route; the Queue holds the
  decision.
- What happened after an agent acted → **Agent Action Ledger**.
- Halting an agent now → **Stop control**. Lowering a rung changes future routes. It does not stop
  work in flight.
- A score that says how sure the agent was → **Calibrated Confidence Gate**. The ladder reads the
  band and never shows a number.
- All of an agent's actions on one screen → a page of ladders, one per action class (a page
  pattern, not this component).

## Props

### `AutonomyLadder`

```tsx
<AutonomyLadder
  agent={{ id: "agt_contain", name: "Containment agent", version: "3.1" }}
  action={{ id: "isolate-host", label: "Isolate host", tool: "edr.hosts.isolate" }}
  ceiling="person-reviews-after"
  reach={[
    { targetClass: "Domain controllers", ceiling: "person-approves",
      reason: "One wrong isolation stops sign-in at every site." },
  ]}
  trackRecord={{
    window: { from: "2026-07-30T00:00:00Z", to: "2026-10-28T00:00:00Z" },
    runs: 200, confirmed: 195, overridden: 2, rolledBack: 3, unreviewed: 0, overdueReviews: 0,
    costWhenWrong: ["Build server offline 40 min", "Finance laptop offline 2 h", "Print server offline 25 min"],
    fixedBy: ["A. Rao", "J. Kim"],
  }}
  policy={containmentPolicy}
  alertsTo={{ names: ["Security lead", "SOC on-call"], setBy: "Security lead" }}
  history={[
    { by: "system", kind: "step-down", at: "2026-10-12T09:10:00Z",
      scope: "action", from: "person-can-stop", to: "person-approves",
      reason: "3 of the last 20 runs were rolled back. The rule allows 2." },
    { by: "person", name: "M. Iyer", at: "2026-10-20T11:00:00Z",
      scope: "action", from: "person-approves", to: "person-reviews-after",
      reason: "20 runs since the step-down, none rolled back. Root cause fixed in 3.1." },
  ]}
  canEdit
  onChangeCeiling={changeCeiling}
  timeZone="UTC"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `agent` | `Provenance["agent"]` — `{ id; name; version }` | — | **Required.** The agent this permission is for, named as the **Agent Provenance Badge** names it. *(Breaking change, 29 Oct 2026: `id` added and required.)* |
| `action` | `{ id: string; label: string; tool: string }` | — | **Required.** One action class, one tool. A compound action is split before it reaches a ladder. |
| `ceiling` | `AutonomyRung` | — | **Required.** The highest rung this action may route to on any target. |
| `cap` | `{ rung: AutonomyRung; setBy: string; reason: string }` | — | A limit set outside the ladder by the policy owner. The ceiling cannot be raised above it here. |
| `reach` | `ReachLimit[]` | `[]` | Per-target-class limits — the second dial. `{ targetClass, ceiling, reason }`. |
| `trackRecord` | `TrackRecord` | — | **Required.** The record, or `{ none: string }` with a reason. |
| `policy` | `AutonomyPolicy` | — | **Required.** The host's routing data, printed on the ladder. |
| `alertsTo` | `{ names: [string, ...string[]]; setBy: string }` | — | **Required, at least one name.** Who is alerted on a step-down. Shown, never edited, here. |
| `history` | `RungChange[]` | `[]` | Every change of ceiling or reach limit, newest first. |
| `canEdit` | `boolean` | `false` | The viewer may change the ceiling and reach limits. |
| `onChangeCeiling` | `(e: CeilingChange) => Promise<void>` | — | **Required when `canEdit` is true.** |
| `editWith` | `string` | — | Shown when the viewer cannot edit: who can ("Ask the security lead"). |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |

The policy the example reads. It is host data, shown here in full because the ladder prints it:

```ts
const containmentPolicy: AutonomyPolicy = {
  id: "containment", version: 4, owner: "Security lead", updatedAt: "2026-10-20T10:00:00Z",
  radiusUnit: "hosts",
  bands: [{ label: "1 host", upTo: 1 }, { label: "2–10", upTo: 10 }, { label: "more than 10", upTo: null }],
  cells: [
    { tier: "undoable",     band: "1 host",       rung: "person-reviews-after" },
    { tier: "undoable",     band: "2–10",         rung: "person-can-stop" },
    { tier: "undoable",     band: "more than 10", rung: "person-approves" },
    { tier: "time-boxed",   band: "1 host",       rung: "person-can-stop" },
    { tier: "time-boxed",   band: "2–10",         rung: "person-approves" },
    { tier: "time-boxed",   band: "more than 10", rung: "person-approves" },
    { tier: "counterable",  band: "1 host",       rung: "person-approves" },
    { tier: "counterable",  band: "2–10",         rung: "person-approves" },
    { tier: "counterable",  band: "more than 10", rung: "person-acts" },
    { tier: "irreversible", band: "1 host",       rung: "person-approves" },
    { tier: "irreversible", band: "2–10",         rung: "person-acts" },
    { tier: "irreversible", band: "more than 10", rung: "person-acts" },
  ],
  lowConfidence: { bands: ["low", "unrated"], rung: "person-approves" },
  holdMinutes: 10,
  reviewWithinHours: 24,
  stepDown: { rule: "Steps down one rung when more than 2 of the last 20 runs are rolled back or overridden, or when any review is overdue." },
}
```

### `AutonomyRoute`

```tsx
<AutonomyRoute route={resolveRoute(input)} policy={containmentPolicy} />
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `route` | `AutonomyRouteResult` | — | **Required.** The result of `resolveRoute`. Never built by hand. |
| `policy` | `Pick<AutonomyPolicy, "id" \| "version" \| "owner">` | — | **Required.** Named on the line, so a person can see whose policy routed the change. |

### Types and the functions

```ts
type AutonomyRung = "person-acts" | "person-approves" | "person-can-stop" | "person-reviews-after"

type Band = { label: string; upTo: number }               // inclusive upper bound
type OpenBand = { label: string; upTo: null }             // the last band has no upper bound

type PolicyCell =
  | { tier: "undoable" | "time-boxed" | "counterable"; band: string; rung: AutonomyRung }
  | { tier: "irreversible"; band: string; rung: "person-acts" | "person-approves" }

type AutonomyPolicy = {
  id: string; version: number; owner: string; updatedAt: string
  radiusUnit: string                                       // what the bands count, e.g. "hosts"
  bands: [...Band[], OpenBand]                             // ascending; every count has a band
  cells: PolicyCell[]                                      // tier × band → rung
  lowConfidence?: { bands: ("moderate" | "low" | "unrated")[]; rung: "person-acts" | "person-approves" }
  holdMinutes?: number                                     // needed by any route at person-can-stop
  reviewWithinHours?: number                               // needed by any route at person-reviews-after
  stepDown: { rule: string }                               // the host's trigger, printed verbatim
}

type ReachLimit = { targetClass: string; ceiling: AutonomyRung; reason: string }

type TrackRecord =
  | { window: { from: string; to: string }; runs: number; confirmed: number; overridden: number;
      rolledBack: number; unreviewed: number; overdueReviews: number
      costWhenWrong?: string[]; fixedBy?: string[] }
  | { none: string }

// Each run is counted in exactly one category, by precedence:
//   rolled back → overridden → confirmed → unreviewed.
// A run that was overridden and then rolled back counts as rolled back only.
// `unreviewed` counts runs no person has looked at yet; `overdueReviews` counts the subset of those
// older than `policy.reviewWithinHours`.

type RungChange =
  | { by: "person"; name: string; at: string; scope: "action" | { targetClass: string };
      from: AutonomyRung; to: AutonomyRung; reason: string }
  | { by: "system"; kind: "step-down"; at: string; scope: "action" | { targetClass: string };
      from: AutonomyRung; to: AutonomyRung; reason: string }

type CeilingChange = { actionId: string; scope: "action" | { targetClass: string };
  from: AutonomyRung; to: AutonomyRung; reason: string; policyVersion: number; at: string }
// No `by`. Who made the change is stamped by the host from the signed-in session, never sent from
// the client: an identity the client asserts is the "self-asserted role" the Microsoft post warns
// about. Do not add it.

type RouteInput = {
  policy: AutonomyPolicy
  ceiling: AutonomyRung
  cap?: { rung: AutonomyRung; setBy: string; reason: string }
  reach?: ReachLimit                                       // the limit for this change's target, if any
  change: Pick<ActionImpactCardProps,
    "reversibility" | "blastRadius" | "computedAt" | "staleAfterMinutes" | "inputsChangedAt">
  confidence?: "high" | "moderate" | "low" | "unrated"     // gateBand(reading, now).band from the Calibrated
                                                           //   Confidence Gate — never the producer's raw band
  delegatedFrom?: { rung: AutonomyRung }                   // the delegating agent's route, for a sub-agent
  overdueReviews?: number                                  // from the action's track record
  now: Date
}

type RouteReason =
  | { kind: "policy-cell"; tier: string; band: string }
  | { kind: "ceiling"; rung: AutonomyRung }
  | { kind: "reach-limit"; targetClass: string; rung: AutonomyRung }
  | { kind: "cap"; rung: AutonomyRung; setBy: string }
  | { kind: "irreversible-limit" }
  | { kind: "unknown-radius-limit" }
  | { kind: "partial-radius"; atLeast: number; routedAs: string }   // the band it was routed as
  | { kind: "stale-estimate-limit" }
  | { kind: "low-confidence"; band: string; gate: GateReason }   // the Gate's `because`, e.g. "thin" (Calibrated Confidence Gate)
  | { kind: "delegated-limit"; rung: AutonomyRung }
  | { kind: "no-policy-cell"; tier: string; band: string }
  | { kind: "hold-not-set" }
  | { kind: "review-window-not-set" }
  | { kind: "review-backlog-limit"; overdue: number }
  | { kind: "policy-envelope"; tier: string; band: string }   // a smaller or more reversible cell was stricter

// Not called `Route`: host apps almost always import a router type of that name.
type AutonomyRouteResult = {
  rung: AutonomyRung
  because: [RouteReason, ...RouteReason[]]
  policyVersion: number          // the policy version the route was resolved against
  resolvedAt: string             // ISO 8601: the `now` it was resolved at
}

type PolicyProblem =
  | { kind: "unknown-band"; cell: PolicyCell }                       // a cell names a band that does not exist
  | { kind: "missing-cell"; tier: string; band: string }
  | { kind: "duplicate-cell"; tier: string; band: string }
  | { kind: "bands-not-ascending"; at: string }
  | { kind: "non-monotonic"; looser: { tier: string; band: string }; stricter: { tier: string; band: string } }

export function resolveRoute(input: RouteInput): AutonomyRouteResult
export function validatePolicy(policy: AutonomyPolicy): PolicyProblem[]
```

**How `resolveRoute` decides.** Every source of a limit proposes a rung. The route is the
**lowest** of them, and `because` lists every reason that proposed that lowest rung. The sources:
the policy cell for the change's tier and blast-radius band; the action's ceiling; the reach limit
for the target; the cap; the safety limits below; the confidence rule; the delegating agent's
route. Nothing can raise a rung above what the policy cell gives.

**The policy is read as its safe envelope.** A grid can compile and still give a bigger blast
radius, or a less reversible tier, *more* autonomy than a smaller or more reversible change.
`resolveRoute` never follows such a cell. For a change at tier *t* and band *b*, the policy cell
used is the lowest rung among all cells whose tier is *t* or more reversible and whose band is *b*
or smaller. Reversibility order, most first: `undoable`, `time-boxed`, `counterable`,
`irreversible`. On a well-formed grid this is the cell itself. On a flawed one, the route takes the
stricter neighbour, and `because` carries `policy-envelope` naming that cell. `validatePolicy`
reports the same flaw as `non-monotonic`, so the printed grid and the route never silently
disagree.

**Which band a count falls in.** An `exact` count uses its own band. An `atLeast n` count could
be any number from *n* upwards, so it is routed as **every band from *n*'s band to the open last
band**, and the lowest of those cells wins. In the example policy, an undoable change touching
"at least 1 host" is routed as "more than 10" → `person-approves`, with the reason "at least 1
host; routed as more than 10". The gap costs exactly what the policy says the worst case would
cost, no more. An `unknown` count has no lower bound to start from, so it keeps the flat safety
limit below.

**Safety limits** hold whatever the policy says.

| Condition | Caps the route at | Reason |
|---|---|---|
| Tier is `irreversible` (also guarded at compile time for typed policies) | `person-approves` | `irreversible-limit` |
| `blastRadius.count` is `unknown` | `person-approves` | `unknown-radius-limit` |
| `isEstimateStale(change, now)` is stale | `person-approves` | `stale-estimate-limit` |
| No cell matches the tier and band | `person-approves` | `no-policy-cell` |
| The route would be `person-can-stop` and `holdMinutes` is not set | `person-approves` | `hold-not-set` |
| The route would be `person-reviews-after` and `reviewWithinHours` is not set | `person-can-stop` | `review-window-not-set` |
| `overdueReviews` is more than 0 | `person-can-stop` | `review-backlog-limit` |

The last two close a gap the four public rungs leave open. "You review after" with nobody
reviewing is "acts alone" by another name. So an unattended review list stops new actions from
running unattended: they wait out a hold instead, until the backlog clears.

### New taxonomy: Autonomy rung

| Taxonomy | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Autonomy rung** (4) | `person-acts` · `person-approves` · `person-can-stop` · `person-reviews-after` | what the person does when an agent takes this action | Autonomy Ladder | **none.** A rung has no colour |

| Rung | The person… | The agent… | Label on the ladder |
|---|---|---|---|
| `person-acts` | does the action | recommends only; cannot execute | "You act — the agent recommends" |
| `person-approves` | approves each action before it runs; no approval by the deadline means it does not run (the Queue's fail-closed timer) | acts after approval | "You approve each" |
| `person-can-stop` | can stop each action during a hold of `holdMinutes` | acts when the hold ends | "Runs unless you stop it within *n* min" |
| `person-reviews-after` | reviews each action after it ran; it lands in their review list | acts, then reports | "You review after" |

The rungs are ordered, least autonomy first. A rung is not a Risk level, a Severity or a
Reversibility tier: `person-approves` does not mean high risk, and an undoable change is not
automatically allowed to run unattended. Only the host's policy maps tier and radius to a rung.
Vela never derives one from the other.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Four rungs.** `person-acts`, `person-approves`, `person-can-stop`, `person-reviews-after`. A
  number, a "level 3" or an `"autonomous"` value does not compile. `ladder-rung-closed-set` · compiler
- **An irreversible cell is capped.** A `PolicyCell` with `tier: "irreversible"` accepts only
  `person-acts` or `person-approves`. A policy authored in code with an irreversible cell at
  `person-can-stop` does not compile. `ladder-irreversible-cell-capped` · compiler
- **Confidence only lowers.** `policy.lowConfidence.rung` accepts only `person-acts` or
  `person-approves`. There is no confidence rule that raises a route. `ladder-confidence-only-lowers` · compiler
- **Every count has a band.** `bands` ends in an open band (`upTo: null`), so no count falls off
  the grid. `ladder-bands-cover-every-count` · compiler
- **A step-down rule is stated.** `policy.stepDown.rule` is required. No ladder exists that can be
  climbed without saying what brings it down. `ladder-step-down-stated` · compiler
- **Someone hears a step-down.** `alertsTo.names` is a non-empty tuple. `ladder-alerts-named` · compiler
- **The system only steps down.** The history type has no system climb: an entry with
  `by: "system"` must be `kind: "step-down"`. `ladder-system-only-steps-down` · compiler
- **One function routes.** `resolveRoute` is pure and deterministic: the same input gives the
  same route. It returns the lowest proposed rung and every reason that proposed it. The ladder,
  `AutonomyRoute`, the Approval Queue and the Rule Builder all call it. The rule is tested once, on
  the function. `ladder-route-is-pure` · runtime
- **Safety limits hold against the data.** Policies arrive as data, often JSON from a host API, so
  the compile-time guard is not enough. `resolveRoute` applies every safety limit in the table
  above, whatever the policy says. It also never routes a delegated sub-agent above
  `delegatedFrom.rung`. `ladder-safety-limits` · runtime
- **A route says why.** `AutonomyRoute` prints the rung label and, in words, every reason in
  `because`, with the policy owner and version: "Route: You approve each — irreversible change
  (safety limit) · policy v4, Security lead". A rung shown without its reasons is a defect.
  `ladder-route-says-why` · runtime
- **Climb one rung at a time.** In edit mode the ladder offers any rung below the current one and
  at most one rung above it. Higher rungs are withheld, with a sentence: "Rungs open one at a time.
  Next: Runs unless you stop it." `ladder-climb-one-rung` · runtime
- **Every change has a reason.** Raising or lowering the ceiling, or a reach limit, needs a
  non-empty reason. The reason travels with the event to the Agent Action Ledger.
  `ladder-change-needs-reason` · runtime
- **Climbing needs a record, in view.** A climb is withheld when the track record is `{ none }`,
  or when its counts do not add up. The record renders above the edit control in reading order,
  never behind a tab or a popover. `ladder-climb-needs-record` · runtime
- **An overdue review is shown.** When `overdueReviews` is more than 0, the ladder prints it above
  the rungs: "3 reviews overdue (older than 24 h) — new actions wait out a hold until they are
  cleared." It is never folded into the record's other counts. `ladder-review-backlog-shown` · runtime
- **The record adds up.** Each run is counted once, by precedence: rolled back, then overridden,
  then confirmed, then unreviewed. `confirmed + overridden + rolledBack + unreviewed` must equal
  `runs`, and `overdueReviews` cannot exceed `unreviewed`. If either fails, the ladder shows an
  inline warning, "Track record counts do not add up — not shown", and withholds climbing.
  `ladder-track-record-adds-up` · runtime
- **The policy is checked.** The ladder calls `validatePolicy` and renders any problems above the
  grid as one Contextual Alert (warning), each in words: "Cell 'undoable × 2-10' names no band —
  did you mean '2–10'?"; "undoable × more than 10 allows more than undoable × 2–10". Climbing is
  withheld while any problem stands. The rule is tested once, on the function.
  `ladder-policy-validated` · runtime
- **The cap holds.** No rung above `cap.rung` is offered. The cap is shown with who set it and
  why. It is not editable from the ladder. `ladder-cap-holds` · runtime
- **A reach limit never lifts the ceiling.** A reach limit above the action's ceiling renders as
  "Limited by the action's ceiling: *rung*". The effective limit for that target is the lower of
  the two. `ladder-reach-clamped` · runtime
- **The text summary is complete.** Both components expose a plain-text summary (see *Responsive
  behaviour*). It is the narrow fallback, the ledger line and the agent serialisation.
  `ladder-text-summary-complete` · runtime
- **Every response has a state.** A ceiling change has pending, failed and conflict states. A
  conflict is a newer policy version or a newer history entry. A failure offers a next step.
  `ladder-every-response-designed` · runtime
- **After a change the person keeps their place.** Nothing scrolls or re-mounts. Focus moves to
  the new history entry. `ladder-keeps-place` · browser
- **Below its minimum width the ladder degrades to text.** It never clips or overflows.
  `AutonomyRoute` is text and wraps like text. `ladder-degrades-below-minimum` · browser
- **Rungs are named by what the person does.** No capability levels, no "level 0–5", no
  "autonomous / semi-autonomous", in labels or values. A security host routes on consent, not
  capability. `ladder-rungs-named-by-person` · convention
- **No colour ramp.** Rungs carry no colour: no green-to-red scale, and no risk or severity token
  on a rung. The current rung is marked as *selected*, with the word "Current".
  `ladder-no-colour-ramp` · convention
- **Routing is data.** A host never hard-codes a route in its own code. Every route comes from
  `resolveRoute` over a `policy` the ladder can print. `ladder-routes-only-via-policy` · convention
- **No agent edits the alert list.** `alertsTo` is set outside the ladder, by the person named in
  `setBy`, and no agent identity can change or silence it. `ladder-alerts-not-agent-editable` · convention
- **"Confirmed" means a person confirmed it.** A run that was simply not rolled back or overridden
  is `unreviewed`, not `confirmed`. `ladder-labels-claim-only-data` · convention
- **One action class per ladder.** A compound action — isolate the host *and* disable the user —
  is split into its parts before it reaches a ladder or an approval. This follows the Microsoft
  post's advice to decompose compound actions before approval. `ladder-compound-actions-split` · convention

**Proof plan:** 7 compiler (7 fixtures), 13 runtime (13 unit tests; `ladder-route-is-pure`,
`ladder-safety-limits` and `ladder-policy-validated` on the functions), 2 browser (on the shared
container-width harness), 6 convention — 28 rules, 22 with proofs.

**For the Approval Queue.** A route can change with no new version of the change: the clock passes
`staleAfterMinutes`, the policy moves to a new version, a step-down lands, or a review goes
overdue. So the Queue re-runs `resolveRoute` at the moment of decision. The decision binds to
`(actionId, version, policyVersion, rung)`. If any of the four differs from what the person saw,
the decision is refused, and the conflict state shows the new route. This is why
`AutonomyRouteResult` carries `policyVersion` and `resolvedAt`.

## Token bindings

| Part | Token |
|---|---|
| Ladder surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4`, padding `--vela-space-15`, block gap `--vela-space-10` |
| Heading ("Isolate host · Containment agent 3.1") | `--vela-text-heading`, H5 |
| Rung, not current | `--vela-text-default`, Body; border `--vela-border-subtle`; radius `--vela-radius-3` |
| Rung, current | background `--vela-bg-selected`, border `--vela-border-active`, the word "Current" in SemiBold |
| Rung above cap | `--vela-text-de-emphasized`, with the words "Above cap" — not the disabled grey of a control, because it is information, not a dead button |
| Rung "what the person does" line | `--vela-text-de-emphasized`, Meta |
| Reach rows, track record, step-down rule, alert list | `--vela-text-default`, Body; owners and dates `--vela-text-de-emphasized`, Meta |
| Policy grid | Table primitives; header `--vela-text-heading`, cells `--vela-text-default`, rules `--vela-border-subtle` |
| History entries | `--vela-text-de-emphasized`, Meta; divider `--vela-border-subtle` |
| Route line | `--vela-text-default`, Body; the rung label in SemiBold; reasons and policy name `--vela-text-de-emphasized`, Meta |
| Edit controls | Radio Group for the rung; Text Area for the reason; Button `regular`, `variant="primary" appearance="filled"` to save (the one filled primary on the view), `variant="standard" appearance="hollow"` to cancel |
| Record and policy warnings | **Contextual Alert**, `severity="warning"` (core). Each is an event about the data, so Severity is the right taxonomy here. |

**New tokens needed:** none. **Contrast pairs**, asserted in `PAIRS` in both themes:
`--vela-text-default` and `--vela-text-heading` on `--vela-bg-selected` (4.5:1, text), and
`--vela-border-active` on `--vela-bg-container` (3:1, UI boundary).

**Icons:** none. Rungs, limits and reasons are words. This avoids a lock or shield that the host's
console already uses for something else.

## Sizes

None. One size; the container decides the layout.

## States

| State | What renders |
|---|---|
| View | The four rungs, least autonomy first; "Current" on the ceiling; cap and reach limits; record; step-down rule; alert list; policy grid; history. |
| View, no permission | No edit control; one line: "You can view this permission. *editWith*." |
| Edit | The record and step-down rule stay above the control. Radio Group offers lower rungs and one rung up. Higher rungs are withheld with their sentence. Reason field below. |
| Climb withheld — no record | "No track record yet: *reason*. Rungs above *current* open after a record exists." |
| Climb withheld — record does not add up | Contextual Alert (warning): "Track record counts do not add up — not shown." |
| Climb withheld — policy problems | Contextual Alert (warning) above the grid, listing each problem in words. The grid still prints, with the flawed cells marked "see warning". |
| Route, envelope applied | "Route: You approve each — undoable × 2–10 is stricter than this cell · policy v4, Security lead." |
| At cap | The current rung is the cap: "Capped at *rung* by *setBy*: *reason*." No rung above is offered. |
| Saving | Edit controls `aria-busy`; content stays. |
| Saved | A new history entry at the top; focus moves to it. |
| Save failed | Inline: "Not saved: *message*." Retry; the reason draft is kept. |
| Conflict | "The policy or this permission changed while you were editing (now v5)." The new state renders; the draft is kept. |
| Stepped down | The newest history entry reads "Stepped down from *from* to *to* on 12 Oct — *reason*. Alerted: Security lead, SOC on-call." |
| Reviews overdue | Above the rungs: "3 reviews overdue (older than 24 h) — new actions wait out a hold until they are cleared." |
| Route, not yet calibrated | "Route: You approve each — not yet calibrated (the Gate treats the agent's High as unrated) · policy v4, Security lead." |
| Route, partial radius | "Route: You approve each — at least 1 host; routed as more than 10 · policy v4, Security lead." |
| Route, unrestricted | "Route: You review after — policy v4: undoable × 1 host." |
| Route, limited | "Route: You approve each — reach limit: Domain controllers · policy v4, Security lead." |
| Route, several limits | Every reason at the winning rung, in source order: safety limits first, then cap, reach, ceiling, confidence, delegation, policy cell. |

Nothing animates except composed spinners.

## Responsive behaviour

Both components size against their container (`@container`). Widths are provisional until
breakpoint tokens land.

| Container width | `AutonomyLadder` layout |
|---|---|
| ≥ 640 | Rungs in one row, least autonomy on the left, as four steps; the policy grid in full (tiers as rows, bands as columns). |
| 320–639 | Rungs as a vertical list, least autonomy first; the policy grid stacks into one block per tier, each band on its own line. |
| < 320 (minimum) | **Text summary** plus an "Open permission" link. |

`AutonomyRoute` has no minimum width. It is a line of text and wraps like one; reasons never
truncate.

The ladder's text summary, exactly:

```
Isolate host · Containment agent 3.1 — ceiling: You review after
Limit: Domain controllers — You approve each (one wrong isolation stops sign-in at every site)
Record, 30 Jul–28 Oct 2026: 200 runs · 195 confirmed · 2 overridden · 3 rolled back · 0 unreviewed (0 overdue)
Steps down when: more than 2 of the last 20 runs are rolled back or overridden, or any review is overdue · alerts: Security lead, SOC on-call
Last change: 20 Oct 2026 11:00 UTC, M. Iyer raised to You review after — "20 runs since the step-down, none rolled back"
Policy v4, Security lead
```

The route's text summary is the line itself.

**Compact density** tightens block gaps to `--vela-space-5`; the 24px minimum target for rungs in
edit mode does not change.

## Accessibility

- `AutonomyLadder` is a `<section>` labelled by its heading. The rungs are an ordered list
  (`<ol>`), least autonomy first. The current rung carries `aria-current="true"` and the visible
  word "Current".
- In edit mode the rungs are a Radio Group, in the same order. Withheld rungs are not radios.
  Their sentence is plain text after the group, so a screen-reader user hears why the list stops.
- The reason is a labelled Text Area. An empty-reason error is a message linked by
  `aria-describedby`.
- The policy grid is a real table with row and column headers: tier by band.
- `AutonomyRoute` is plain text inside its container. It is not a live region. When a route
  changes because of a recompute, the container announces the change.
- After a save, focus moves to the new history entry.
- Times are `<time datetime>` with the zone in the visible text.
- No colour carries meaning. Both themes are real.

## Built from

- **Radio Group** for the rung choice; **Text Area** for the reason.
- **Table primitives** for the policy grid.
- **Button** (core) to save and cancel.
- **Contextual Alert** (core) for the record and policy warnings.
- **Toast**, optional, to confirm a saved change. Never the only record.
- **Agent Provenance Badge**: `agent` is `Provenance["agent"]`, so the ladder, the route line and
  the badge name an agent the same way.
- The **Calibrated Confidence Gate** supplies the band that the confidence rule reads.
- Reads from: the **Action Impact Card**'s `reversibility`, `blastRadius` and `isEstimateStale`,
  through `RouteInput.change`.
- Placed by: the **Approval Queue** and the **Rule Builder**, which put `AutonomyRoute` into the
  slot they own. `AutonomyRoute` is slot content: it never styles its container, never assumes its
  padding, and hugs its text.

`AutonomyLadder` has no slot of its own. Unlike the Action Impact Card, it is a decision surface:
the decision it holds is a permission, so its edit controls are its own.

## Figma mapping

Library file: **Vela Design System** → page `Autonomy Ladder`. Three sets.

- `Autonomy Ladder`: `Ceiling` (4) × `Mode` (`View`, `Edit`) = **8 variants**. Booleans: `Has cap`,
  `Has reach limits`, `Has step-down`, `Has record`, `Can edit`.
- `Autonomy Ladder / Rung`, nested four times in each ladder: `Rung` (4) × `Marker` (`None`,
  `Current`, `Above cap`, `Withheld`) = 16 variants. The builder places the four rungs in order and
  never lets a `Withheld` rung sit below `Current`.
- `Autonomy Route`: `Rung` (4) × `Limited` (`No`, `Yes` — a safety limit is among the reasons) =
  8 variants, with a `Reasons` text property.

| Figma property | Code prop |
|---|---|
| `Ceiling` | `ceiling` |
| `Mode` | edit mode, entered when `canEdit` and the person chooses Change |
| `Has cap` | `cap` passed |
| `Has reach limits` | `reach.length > 0` |
| `Has step-down` | any `history` entry with `by: "system"` |
| `Has record` | `trackRecord` is not `{ none }` |
| `Can edit` | `canEdit` |
| `Rung` / `Marker` (Rung set) | each rung against `ceiling`, `cap` and the one-rung climb |
| `Rung` / `Limited` (Route set) | `route.rung`; `Yes` when `route.because` holds a `*-limit` reason |

Every fill, stroke and text binds a variable. The current rung binds `bg/selected` and
`border/active`. No other colour.

## Anti-patterns

- ❌ `ceiling={3}`, `"level-3"` or `"autonomous"` → rungs are named by what the person does (will not compile).
- ❌ A green-to-red ramp across the rungs → rungs carry no colour; "Current" is a selection.
- ❌ `{ tier: "irreversible", rung: "person-can-stop" }` in a policy → irreversible caps at approval (will not compile; still refused at runtime from JSON).
- ❌ "Ask if unsure" as a rung → whether a person sees a change is never the agent's call; use `policy.lowConfidence`.
- ❌ A system job that raises a rung after a good week → the system only steps down; people climb, one rung at a time.
- ❌ A route shown as a bare rung, "Needs approval" → print every reason, with the policy and its owner.
- ❌ A host `if (tier === "undoable") autoRun()` → route only through `resolveRoute` over the printed policy.
- ❌ A sub-agent routed at its own ceiling → never above the agent that delegated to it.
- ❌ Counting "not rolled back" as "confirmed" → that is `unreviewed`.
- ❌ "You review after" with no review window or an ignored backlog → set `reviewWithinHours`; an overdue review holds new actions.
- ❌ Capping every `atLeast` count at approval → route it as the highest band it could fall in.
- ❌ Exporting a type called `Route` → it collides with the host's router; the type is `AutonomyRouteResult`.
- ❌ Sending `by` from the client in a `CeilingChange` → the host stamps identity from the session.
- ❌ Approving on a route resolved before the policy or the clock moved → the Queue re-resolves and binds to the policy version and rung.
- ❌ An alert list an agent can edit or mute → set outside the ladder, by the named person.
- ❌ One ladder for "Isolate host and disable user" → split the compound action.
- ❌ The track record behind a "History" tab while the climb control is in view → the record sits above the control.

## Decisions taken in review (29 Oct 2026)

1. **`person-can-stop`** — kept, and allowed on `counterable` changes: revoking a compromised
   session is the case it exists for.
2. **Climbing** — one rung at a time; no two-person climb in Vela. A host that wants a second
   approver gates `onChangeCeiling`.
3. **Partial radius** — no floor. An `atLeast` count routes as the highest band it could fall in;
   the safe-envelope reading and the `non-monotonic` check guard against a lenient top band.
4. **Target classes** — free text for now. A closed criticality set would collide with Risk in
   agents' hands; reopen when a second component needs the same field.
