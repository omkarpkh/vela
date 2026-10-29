# Approval Queue

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

The one place a person decides on what agents propose and reviews what agents did. It holds every
change waiting on a person, in four lanes named by what the person does. Each item is an Action
Impact Card; the Queue owns the card's footer and fills it with the decision bar and the route. A
change that nobody decides in time does not run. Approving fast and in bulk is possible only for
changes that pass a stated bar, and the Queue slows the person down when approvals come too fast.

The spec covers one component and one function, which ship together:

- **`ApprovalQueue`** — the lanes, the rows, the open item, the decision bars, the bulk path, the
  burst warnings and the "Didn't run" tray.
- **`meetsBulkBar(item, now)`** — the one pure function that says whether an item may be approved
  in bulk, and if not, which gaps stop it. The Queue and any host-side batch tool call it.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless)

## Intent

A person working the Queue should be able to answer five questions without leaving it. What is
waiting on me, and what happens if I do nothing? Which of these can I safely clear together, and
which need a closer look? Why is each one here and not running on its own? Is the route I am
deciding on still the route the system gives? And what did agents already do that I have not
reviewed?

What it answers:

- **EU AI Act, Article 14(4).** (b) Stay aware of automation bias: the Queue warns when approvals
  come faster than a person can read, and closes the bulk path while they do. (d) Decide not to
  use, override or reverse: Deny, Stop and Roll back are always one action away and never harder
  than Approve. (a) Monitor operation: the review lane holds what agents did on their own.
- **Microsoft Taxonomy of Failure Modes v2.0 (4 Jun 2026).** Human-in-the-loop bypass "was the most
  consistently exploited failure mode, at very high frequency", reached "through consent fatigue,
  manipulation of probabilistic invocation, and incremental escalation chains". The post's advice
  includes "consent-fatigue exploitation signals" and approval prompts summarised "from the
  underlying tool calls (not from the agent's own description)". Here: every item is an Action
  Impact Card, whose headline comes from the operation. Routes come only from `resolveRoute`. And
  the burst warning is the consent-fatigue signal, made visible to the person it targets.
- **OWASP Agentic Top 10 (Dec 2025).** ASI09, Human-Agent Trust Exploitation: the bulk bar, the
  reason required to approve over a gap, and the burst warning. ASI03, Identity and Privilege
  Abuse: who decided is stamped by the host from the session, never sent by the client, and a
  person cannot approve a change they proposed. ASI10, Rogue Agents: every decision is an event
  bound to the exact version, policy version and rung, for the Agent Action Ledger.
- **Claude Code and the OpenAI Agents SDK.** Review timeouts fail closed, and denied actions land
  in a retry tray. Here an undecided change expires and does not run, and expired, denied and
  stopped changes land in "Didn't run", where they can be requested again.
- **NIST AI RMF, MEASURE 2.8.** Track override statistics. Every Queue decision is an event the
  Ledger counts; the review lane's Confirm and Roll back feed the ladder's track record.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** No vendor ships an approval
  deadline that fails closed, or a warning about approval bursts.
- **A self-initiated proposed-changes study (synthetic data).** Three ideas carry over, improvised:
  - a group you can clear together ("Accept all 3", which you opt out of);
  - a group that needs a look first, where the gap is stated first and approving anyway asks for a
    reason;
  - after a decision, the admin keeps their place.
  The study's staged-rollout zone is not here; see *When to use*.
- **Romeo & Conti 2026.** Forcing functions beat explanations, and people prefer the interface
  without them. So the forcing is light and targeted: it applies only to gap items and during a
  burst, and the ordinary path stays fast.

Limits: the Queue shows and records decisions. It does not execute changes, run timers on the
server, or measure an agent's accuracy; the host does all three. A countdown on screen is a
display of the host's deadline, not the deadline itself. **Host contract:** the host refuses any
decision on an expired item. The Queue's own check at the click is a courtesy, not the guarantee.

## When to use Approval Queue

- Deciding on one or many proposed changes, or reviewing what agents did → **Approval Queue**.
  A one-off approval, including in a chat-style screen, is a Queue of one.
- Describing one change → **Action Impact Card** (the Queue's item).
- Why a change is in a given lane → **`AutonomyRoute`**, shown in each item's footer.
- Setting how far an agent may act alone → **Autonomy Ladder**.
- A conclusion about a case, with no change → **Verdict Card**. Verdicts are not queued here.
- A record of everything decided → **Agent Action Ledger**.
- Halting an agent now → **Stop control**. The Queue's Stop stops one held change, not the agent.
- One inbox for a SOC lead, with verdicts and changes side by side → a page pattern, written with
  the Hand-off card. Verdicts stay on the Verdict Card: a verdict changes no system, so it has no
  route, no rung and no expiry to queue on.
- A change rolled out in waves, monitored between them → a Rollout Wave tracker, **not in the
  kit**. Flag the gap. The Queue approves the first step; it does not run the waves.

## Props

```tsx
<ApprovalQueue
  items={items}
  onDecide={decide}
  onRecompute={recompute}
  onRequestAgain={requestAgain}
  burst={{ approvals: { count: 10, withinMinutes: 5 }, arrivals: { count: 20, withinMinutes: 10 } }}
  recentApprovals={{ count: 2, withinMinutes: 5 }}
  status="ready"
  timeZone="UTC"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `QueueItem[]` | — | **Required.** Everything waiting, to review, or that didn't run. The Queue sorts it; the order passed is ignored. |
| `onDecide` | `(e: QueueDecisionEvent) => Promise<DecisionResult>` | — | **Required.** The host applies the decision, stamps who made it from the session, and returns the result. |
| `onRecompute` | `(actionId: string) => Promise<void>` | — | Passed to each card. Offered when its estimate is stale. |
| `onRequestAgain` | `(actionId: string) => Promise<void>` | — | Offered in "Didn't run". The host asks the proposer for a new version. |
| `burst` | `{ approvals: Threshold; arrivals: Threshold }` | `approvals` 10 in 5 min; `arrivals` 20 in 10 min, per agent | Host-set thresholds for the burst warnings. Printed in the warning, with the word "default" while the host has not set them. The defaults are assumptions to measure, not findings. |
| `recentApprovals` | `{ count: number; withinMinutes: number }` | — | Approvals this person made elsewhere (another tab, the API). The Queue adds its own. |
| `status` | `"loading" \| "ready" \| { partial: { failed: [string, ...string[]] } } \| { error: string }` | — | **Required.** The load state. `partial` names the sources that failed. While `loading`, nothing expires on screen and nothing is announced; the expiry announcement waits for `ready`. |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |
| `clock` | `() => Date` | `() => new Date()` | For tests and replays. Every route, staleness check and countdown reads it. |

```ts
type Threshold = { count: number; withinMinutes: number }

type Permission =
  | { decide: true }
  | { decide: false; reason: string; decideWith: string }   // e.g. "You proposed this change." / "Ask the security lead."

// Waiting on a person. The Queue resolves its route; it never accepts one.
type PendingItem = {
  kind: "pending"
  card: Omit<ActionImpactCardProps & { stage: "pending" }, "footer" | "decideWith">
  routeInput: Omit<RouteInput, "now" | "change">   // policy, ceiling, cap, reach, confidence, delegation, overdueReviews
  route?: never                                      // a precomputed route does not compile
  arrivedAt: string                                  // ISO 8601
  expiresAt: string                                  // fail-closed deadline: undecided by then → does not run
  delivery: { to: [string, ...string[]]; at: string } | { notDelivered: string }
  actIn?: { tool: string; href: string }            // host tool, literal call pre-filled; used in the `act` lane
  permission: Permission
}

// "Delivered" means host evidence that a named person was shown the item: it was opened in a
// console, or acknowledged on a paging tool. A notification that was only sent is not delivery.

// Ran under `person-reviews-after`; waiting for a person to look.
type ToReviewItem = {
  kind: "to-review"
  card: Omit<ActionImpactCardProps & { stage: "applied" | "failed" }, "footer" | "decideWith">
  policy: Pick<AutonomyPolicy, "id" | "version" | "owner" | "reviewWithinHours">
  appliedAt: string
  permission: Permission
}

// Closed without running.
type DidNotRunItem = {
  kind: "did-not-run"
  card: Omit<ActionImpactCardProps & { stage: "pending" }, "footer" | "decideWith">
  outcome:
    | { kind: "expired"; at: string }
    | { kind: "denied"; at: string; by: string; reason?: string }
    | { kind: "stopped"; at: string; by: string; reason?: string }
    | { kind: "dismissed"; at: string; by: string; reason: string }
    | { kind: "not-done"; at: string; by: string }   // handed off, then expired before the host reported it done
}

type QueueItem = PendingItem | ToReviewItem | DidNotRunItem
```

### Lanes

Lanes are derived, never passed. A pending item's lane comes from its resolved rung. They are
named by what the person does, like the rungs, and shown in this order:

| Lane | Holds | Order reason | Lane heading |
|---|---|---|---|
| `stop-window` | pending, rung `person-can-stop` | the only lane that runs if nobody acts | "Runs unless you stop it" |
| `approve` | pending, rung `person-approves` | fails closed at its deadline | "You approve each" |
| `act` | pending, rung `person-acts` | the agent may only recommend; the person acts in their own tool | "You act — the agent recommends" |
| `review` | `to-review` items | already ran | "You review after" |
| `did-not-run` | `did-not-run` items | closed | "Didn't run" (collapsed by default) |

A pending item whose rung resolves to `person-reviews-after` should not be in the Queue: under that
rung the host runs it without asking. If one arrives, the Queue places it in `approve`, never in
`stop-window`. An unexpected route falls to the stricter lane.

Within `approve`, items are grouped: **"Ready — meets the bar"** first, then **"Check first"**.
The `act` lane has no "Ready" group: nothing in it is ever handled in bulk. Within every lane and
group, the order is the Action Impact Card's *Sort order for containers*: tier (irreversible
first), then `blastRadius.count` (with `unknown` above every number), then `computedAt` oldest
first. The `review` lane puts overdue reviews first, then follows the same order.

### Decisions

Each lane has its own closed set of decisions. A decision from another lane does not compile.

| Lane | Decisions | Reason |
|---|---|---|
| `stop-window` | `stop` · `release-now` | `stop`: optional. `release-now` (skip the rest of the hold): **required**. |
| `approve` | `approve` · `deny` | `approve`: **required when the item has a gap**, optional otherwise. `deny`: optional. |
| `act` | `hand-off` · `dismiss` | `hand-off`: **required when the item has a gap**, optional otherwise. `dismiss`: **required**. |
| `review` | `confirm` · `roll-back` | `confirm`: none, but one at a time (see *Hard constraints*). `roll-back`: **required** (the card's rule). |

**There is no Defer.** Leaving an item where it is already defers it. A Defer button that does not
extend the deadline only reorders the list, and lets an item expire unread with a click that looks
like action.

**`act` hands off; it does not run.** Under `person-acts` the agent may only recommend, so the Queue
never executes the change. Hand off opens `actIn.href` — the host's own tool, with the literal call
pre-filled — so the person acts under their own identity and that tool's controls. The item then
reads "Opened in *tool* by you at 10:05 UTC — waiting for the host to report it done", and still
expires if the host never does. Without `actIn`, the lane prints "Do this in your own tool.
*decideWith*." and offers only Dismiss. Because `act` holds the strictest changes, Hand off follows
every Approve rule: withheld when stale, a reason over any gap, never in bulk, and withheld during
a burst.

The rule behind the column: **the safe direction is never harder than the risky one.** Deny and
Stop take one action and need no reason. Approving over a gap, skipping a hold or dismissing an
agent's recommendation each need a reason, because each is the direction a manipulated person
would be pushed.

```ts
type Bound = {
  actionId: string; version: number
  policyVersion: number
  at: string
  by?: never                       // who decided is stamped by the host from the session
}

type QueueDecisionEvent =
  | Bound & { lane: "stop-window"; rung: "person-can-stop"; decision: "stop"; reason?: string }
  | Bound & { lane: "stop-window"; rung: "person-can-stop"; decision: "release-now"; reason: string }
  | Bound & { lane: "approve"; rung: "person-approves"; decision: "approve"; reason?: string; gaps: BulkGap[] }
  | Bound & { lane: "approve"; rung: "person-approves"; decision: "deny"; reason?: string }
  | Bound & { lane: "act"; rung: "person-acts"; decision: "hand-off"; reason?: string; gaps: BulkGap[] }
  | Bound & { lane: "act"; rung: "person-acts"; decision: "dismiss"; reason: string }
  | Bound & { lane: "review"; decision: "confirm" }
  | Bound & { lane: "review"; decision: "roll-back"; reason: string }

type DecisionResult =
  | { ok: true }
  | { ok: false; conflict: "version" | "policy" | "route" | "stale" | "expired"; message: string }
  | { ok: false; error: string }
```

The Queue sets `rung` and `policyVersion` from the route it resolved **at the moment of the
click**, not from the one on screen (see *Hard constraints*). Every bulk decision is sent as one
event per item, so a bulk decision can partly succeed (see *States*).

### `meetsBulkBar`

```ts
type BulkGap =
  | "tier-not-reversible"        // tier is counterable or irreversible
  | "estimate-stale"             // isEstimateStale(card, now)
  | "radius-not-exact"           // blastRadius.count is atLeast or unknown
  | "coverage-partial"           // coverage.read < coverage.of, or unreported
  | "observation-short"          // observed fewer days than expectedObservationDays
  | "schedule-not-observed"      // a known schedule fell outside the window
  | "low-confidence"             // the route carries a low-confidence reason
  | "no-observed-data"           // observed is { none }

export function meetsBulkBar(item: PendingItem, now: Date): { ok: true } | { ok: false; gaps: [BulkGap, ...BulkGap[]] }
```

The bar is fixed by Vela, not by the host, and it is printed above the group: **"Ready means:
undoable or time-boxed · exact count · full coverage · fully observed · fresh estimate · no
low-confidence reason."** A host that wants a stricter bulk path withholds `approve` permission;
it cannot loosen the bar.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Each lane has its own decisions.** `QueueDecisionEvent` is a union over lane. A `release-now`
  in the approve lane, a `confirm` on a pending item, a `run` or `defer` anywhere, or an `approve`
  with no `rung` does not compile. `queue-decisions-closed-by-lane` · compiler
- **Every pending item expires.** `expiresAt` is required on `PendingItem`. There is no item that
  waits forever. `queue-pending-has-expiry` · compiler
- **The Queue resolves routes; it never accepts one.** `PendingItem` carries `routeInput` and
  forbids `route`. A host cannot hand the Queue a route its own logic made.
  `queue-route-not-accepted` · compiler
- **The Queue owns the footer.** `card` omits `footer` and `decideWith`; passing either does not
  compile. `queue-owns-footer` · compiler
- **A decision is bound and anonymous.** Every event carries `actionId`, `version`,
  `policyVersion` and, for pending lanes, `rung`. It forbids `by`: the host stamps identity from
  the session. `queue-decision-bound` · compiler
- **One function routes, at render and at the click.** The Queue calls `resolveRoute` with
  `clock()` to place every item, again whenever a policy version, item version or the minute
  changes, and once more inside the click handler. If the route at the click differs in rung or
  policy version from the one on screen, the decision is not sent. The item shows "The route
  changed while you were reading: now *rung* — *reasons*", the draft reason is kept, and the item
  moves lanes if its rung moved. The click handler also refuses when `clock()` has reached
  `expiresAt`, and shows "This change expired at 10:30 UTC and will not run". A host answer of
  `conflict: "expired"` renders the same way. `queue-decision-rebinds-route` · runtime
- **Stale estimates are not approved.** If `isEstimateStale` is true for the open item, or for any
  item in a bulk selection, Approve is withheld, not disabled. A sentence gives the age, and
  Recompute is offered. A stale item can still be denied. Hand off in the `act` lane is withheld
  the same way. `queue-stale-withholds-approval` · runtime
- **Undecided means not run.** At `expiresAt`, a pending item in `approve` or `act`, or an
  undelivered item in `stop-window`, leaves its lane for "Didn't run" with outcome `expired`. Every
  approve item states its deadline as an absolute time and its consequence: "Decide by 10:30 UTC
  — if no one does, it will not run." `queue-fail-closed-expiry` · runtime
- **A hold starts on delivery.** In `stop-window`, the countdown starts at `delivery.at` plus the
  policy's `holdMinutes`. While `delivery` is `{ notDelivered }`, the item reads "Not delivered to
  anyone yet: *reason* — it will not run until delivered", and it expires like an approve item.
  "Delivered" is host evidence that a named person was shown the item, not a sent notification.
  `queue-hold-starts-on-delivery` · runtime
- **Bulk only past the bar.** "Approve *n*" is offered only over items where `meetsBulkBar` is ok,
  only when no burst warning stands, and only when the person may decide every item. The group's
  checkboxes start checked, so the person opts out. A confirm Dialog lists every selected item by
  its text summary before anything is sent. If some items are refused at the click or by the host,
  the result reads "Approved 2 of 3 · 1 not sent: the route changed — open it to decide." Each
  refused item stays in its group, opened to its reason. `queue-bulk-needs-bar` · runtime
- **A gap is stated first, and approving over it needs a reason.** An item in "Check first" opens
  with its gaps in words, above the card, before the decision bar: "2 of 4 sites not reporting ·
  observed 3 of 7 days". Approve opens a reason field, and the event carries the gaps it was given
  over. `queue-gap-approval-needs-reason` · runtime
- **A burst slows the person down.** When this person's approvals, counted from
  `recentApprovals` plus the Queue's own, reach `burst.approvals` within its window, the Queue
  shows one Contextual Alert (warning) above the lanes: "You approved 11 changes in the last 5
  minutes. Approvals this fast are how consent-fatigue attacks work. Bulk approval is paused; open
  each change before approving it. (Default threshold: 10 in 5 min.)" The last part names the
  threshold, and says "default" while the host has not set one. Approvals, hand-offs and review
  confirms all count. While the warning stands, bulk approval is withheld; Release now and Hand off
  are withheld with the same sentence; and Approve on a row is withheld until that item is opened.
  It clears when the window passes. `queue-approval-burst-slows` · runtime
- **An arrival burst is named.** When one agent's new items reach `burst.arrivals` within its
  window, the Queue shows a warning that names the agent and the rate: "Containment agent proposed
  23 changes in 10 minutes." Bulk approval of that agent's items is withheld while it stands.
  `queue-arrival-burst-named` · runtime
- **The route is in every footer.** Each item's footer holds, in this order, the `AutonomyRoute`
  line, the deadline or hold line, and the lane's decision bar. A row in the list carries the
  route's rung label and the deadline. `queue-route-in-footer` · runtime
- **No self-approval.** When the host marks an item `{ decide: false }`, its decision bar is
  replaced by the reason and `decideWith`, and the item is excluded from bulk.
  `queue-permission-shown` · runtime
- **Every state has a design.** Loading, empty ("Nothing is waiting for you"), empty under a filter,
  partial (the failed sources named, with Reload), error (with Reload), and no permission on every
  item ("You can view this queue. *decideWith*.") each have a designed state. A failure always
  offers a next step. `queue-every-state-designed` · runtime
- **The text summary is complete.** The Queue exposes a plain-text summary. It counts each lane,
  names the next deadline and the next hold, and states any burst warning. It is the narrow
  fallback and the agent serialisation. `queue-text-summary-complete` · runtime
- **Confirm is one at a time.** In the `review` lane, Confirm is offered only from the opened item,
  never in bulk, and each Confirm counts toward `burst.approvals`. Confirms feed the Ladder's
  "confirmed" count, which is what a person climbs a rung on. A sweep of 40 confirms would launder
  the track record, which is the incremental-escalation path the Microsoft post names. Roll back
  stays one action. `queue-confirm-one-at-a-time` · runtime
- **Overdue reviews come first.** In the `review` lane, items past `appliedAt +
  reviewWithinHours` sort first and say so: "Overdue since 09:00 UTC — new actions of this kind wait
  out a hold until it is cleared." `queue-review-overdue-first` · runtime
- **After a decision the person keeps their place.** The decided item stays where it was, as one
  line ("Approved by you at 10:02 UTC · queued to run"), until the person leaves the Queue or
  collapses it. The list does not jump. Focus moves to the next item in the same lane, or to the
  lane heading when the lane is empty. `queue-keeps-place` · browser
- **Below its minimum width the Queue degrades to text.** It never clips or overflows.
  `queue-degrades-below-minimum` · browser
- **The safe direction is never harder.** Deny and Stop are each one action with no required
  reason, on every item and at every width. No layout puts Approve where Deny is not.
  `queue-safe-direction-never-harder` · convention
- **Lanes are never tabs.** All lanes are on one page, in the order above. A tab would hide
  `stop-window`, the lane that runs if nobody looks. `queue-lanes-never-tabs` · convention
- **No urgency styling.** Deadlines and holds are words with an absolute time, plus remaining time
  updated once a minute. They are never red, never animated, never ticking by the second, and never
  a live region. A deadline that fails closed costs nothing when it passes, so the screen must not
  make it feel like an emergency. `queue-no-urgency-styling` · convention
- **One decision surface.** No other component approves, denies or stops a proposed change. Cards,
  routes and ladders describe; the Queue decides. `queue-one-decision-surface` · convention
- **The slot contract holds.** The Queue fills each card's footer as container content and does
  not style into the card. `AutonomyRoute` sits in the footer as slot content.
  `queue-slot-contract` · convention
- **Labels claim only what the data knows.** "Not delivered to anyone yet" rather than "Nobody is
  on call". "Approved — queued to run" until the host reports it ran.
  `queue-labels-claim-only-data` · convention

**Proof plan:** 5 compiler (5 fixtures), 14 runtime (14 unit tests; `meetsBulkBar` tested once, on
the function, inside `queue-bulk-needs-bar`), 2 browser (on the shared container-width harness,
plus a list-and-detail page), 6 convention — 27 rules, 21 with proofs.

## Token bindings

| Part | Token |
|---|---|
| Queue surface | `--vela-bg-global`; lanes are sections, not cards |
| Lane heading | `--vela-text-heading`, H5, with the count in `--vela-text-de-emphasized` |
| Group heading ("Ready — meets the bar", "Check first") | `--vela-text-heading`, H6 |
| Bar sentence | `--vela-text-de-emphasized`, Meta |
| Row | `--vela-bg-container`, divider `--vela-border-subtle`; row padding `--vela-space-10` |
| Row, open | `--vela-bg-selected`, border `--vela-border-active` (pairs asserted in `PAIRS`) |
| Row summary | `--vela-text-default`, Body; rung label in SemiBold |
| Deadline and hold lines | `--vela-text-default`, Body; the absolute time in SemiBold; remaining time `--vela-text-de-emphasized`, Meta |
| Gap list ("Check first") | `--vela-text-default`, Body, above the card, gap words in SemiBold |
| Decided line | `--vela-text-de-emphasized`, Meta |
| Burst and load warnings | **Contextual Alert**: `severity="warning"` for bursts; `severity="minor"` for a partial load; `severity="major"` for a failed load, because changes can run or expire unseen |
| Decision bar | Button `regular`. Approve, Hand off, Confirm: `variant="primary" appearance="filled"`, the one filled primary in the open item. Deny, Stop, Dismiss: `variant="standard" appearance="filled"`, so the safe direction is never visually weaker than Approve. Release now, Roll back: `variant="destructive" appearance="hollow"`. Approve *n*: `variant="primary" appearance="hollow"` until the confirm Dialog, where it is filled. Hand off is a link styled as a Button, because it leaves the Queue; it says so: "Open in *tool*". |

**New tokens needed:** none. **Icons:** none. Lanes, deadlines and gaps are words.

## Sizes

None. The density step tightens rows; the container decides the layout.

## States

| State | What renders |
|---|---|
| Loading | Lane headings with "Loading…"; `aria-busy` on the list. No skeleton rows that could be mistaken for items. Nothing expires or is announced until `ready`. |
| Empty | "Nothing is waiting for you." with the time it was last checked. "Didn't run" stays reachable. |
| Partial | Contextual Alert (minor): "Proposals from *Policy agent* could not be loaded. Reload." The loaded lanes render. |
| Error | Contextual Alert (major): "The queue could not be loaded: *message*. Changes in 'Runs unless you stop it' may run without anyone seeing them, and changes waiting for approval may expire." Reload. |
| Stop window | Row: "Runs at 10:22 UTC unless you stop it · 8 min left". Stop and Release now in the footer. |
| Not delivered | Row: "Not delivered to anyone yet: *reason* — it will not run until delivered. Expires 10:30 UTC." |
| Approve, ready | Group "Ready — meets the bar (3)", the bar sentence, checkboxes checked, "Approve 3" (hollow). |
| Approve, check first | Group "Check first (2)"; each row shows its gaps; the open item states them above the card; Approve asks for a reason. |
| Stale item | Approve withheld: "Estimate is 3 h old — recompute before approving." Recompute; Deny stays. |
| Approval burst | Warning above the lanes, naming the threshold ("default" if unset); "Approve *n*", Release now and Hand off withheld; row Approve withheld until the item is opened. |
| Bulk, partly sent | "Approved 2 of 3 · 1 not sent: the route changed — open it to decide." The refused item stays in its group, opened to its reason. |
| Expired at the click | In the open item: "This change expired at 10:30 UTC and will not run." The item moves to "Didn't run". |
| Act, handed off | "Opened in *tool* by you at 10:05 UTC — waiting for the host to report it done. Expires 10:30 UTC." |
| Act, no hand-off tool | "Do this in your own tool. *decideWith*." Only Dismiss is offered. |
| Review, opened | Confirm and Roll back in the footer. No checkboxes in this lane. |
| Arrival burst | Warning naming the agent and rate; bulk approve withheld for that agent's items. |
| Route changed | In the open item: "The route changed while you were reading: now *rung* — *reasons*." Draft kept; the item moves lanes if needed. |
| Version conflict | "This change was revised while you were reading (now version 3)." New card renders; draft kept. |
| Decided | One line in place: "Approved by you at 10:02 UTC · queued to run". |
| Decision failed | Inline under the bar: "Not saved: *message*." Retry; the reason draft is kept. |
| No permission (item) | Decision bar replaced: "*reason*. *decideWith*." |
| Expired | Leaves its lane; in "Didn't run": "Expired at 10:30 UTC — nobody decided. Request again." |
| Review overdue | First in the review lane: "Overdue since 09:00 UTC — …". |
| Did not run | Collapsed lane with a count. Each row shows its outcome, who and why, and "Request again". |

Nothing animates except composed spinners. Remaining time updates once a minute without motion. An
item expiring while the Queue is open is announced once, politely: "*summary* expired and will not
run."

## Responsive behaviour

The Queue sizes against its container (`@container`). Widths are provisional until breakpoint
tokens land.

| Container width | Layout |
|---|---|
| ≥ 960 | Lanes as a list on the left; the open item's card and footer on the right, beside the list. |
| 640–959 | One column; the open item expands in place under its row. |
| 320–639 | One column; rows show the card's text summary and the deadline; opening an item gives it the full width, with a "Back to queue" link that returns focus to its row. |
| < 320 (minimum) | **Text summary** plus an "Open queue" link. |

The decision bar wraps; Deny and Stop are never pushed below Approve. The Queue's text summary,
exactly:

```
Approval queue, 29 Oct 2026 10:14 UTC
Runs unless you stop it: 2 (next runs 10:22 UTC)
You approve each: 5 — 3 ready, 2 to check first (next expires 10:30 UTC)
You act: 1
You review after: 4 (1 overdue)
Didn't run today: 3
Warning: you approved 11 changes in 5 minutes — bulk approval paused
```

Lanes with nothing in them print "0". The warning line appears only while a burst stands. **Compact
density** tightens rows to `--vela-space-5` padding; type and the 24px minimum target do not
change. On a SOC wall display, show the text summary.

## Accessibility

- The Queue renders `<section aria-label="Approval queue">`, a region landmark. It never renders
  `<main>`: that landmark belongs to the host page, which places the Queue inside its own. Each lane
  is a nested `<section>` with a heading, in lane order, so heading navigation walks the lanes from
  most to least time-critical.
- Rows are a list in each lane. The open row carries `aria-current="true"`.
- Group checkboxes have labels naming the item. "Approve *n*" names its count and opens a Dialog
  that lists every item before anything is sent.
- Deadlines are `<time datetime>` with the zone in the visible text. Remaining time is not a live
  region; only an expiry while open is announced, politely.
- Burst warnings are Contextual Alerts at `warning`, so they are polite. A failed load is `major`,
  so it is assertive.
- Reason fields are labelled Text Areas, with errors linked by `aria-describedby`.
- After a decision, focus moves to the next item in the lane, or to the lane heading.
- No colour carries meaning. Both themes are real.

## Built from

- **Action Impact Card** for every item. The Queue fills its `footer`.
- **`AutonomyRoute`** and **`resolveRoute`** (Autonomy Ladder) for the route line and every lane.
- **`isEstimateStale`** (Action Impact Card) for withholding approval; **`meetsBulkBar`** (here)
  for the bulk path.
- **Table** primitives or a list for rows; **Checkbox** for the bulk group.
- **Dialog** for the bulk confirm.
- **Text Area** for reasons.
- **Button** (core) for every decision.
- **Contextual Alert** (core) for burst and load warnings.
- **Toast**, optional, to confirm a saved decision. Never the only record, and never where Undo or
  Request again lives.
- Later: the **Filter Bar** (Phase 2b) filters the Queue by agent, tier or target. Until then,
  the Queue has no filter of its own, and "empty under a filter" applies to host-side filtering.
- Feeds: the **Agent Action Ledger** (every decision event) and the **Autonomy Ladder**'s track
  record (Confirm, Roll back, overrides).

## Figma mapping

Library file: **Vela Design System** → page `Approval Queue`. Three sets and one example frame.

- `Approval Queue / Row`: `Lane` (`Stop window`, `Approve`, `Act`, `Review`, `Didn't run`) ×
  `State` (`Default`, `Open`, `Decided`, `No permission`) = **20 variants**. Booleans: `Has gap`
  (Approve and Act), `Handed off` (Act only), `Overdue` (Review only), `Not delivered` (Stop window
  only).
- `Approval Queue / Decision bar`: `Lane` (4, no `Didn't run`) × `Mode` (`Ready`, `Reason open`,
  `Withheld`, `Saving`, `Failed`) = **20 variants**. It is nested as the Action Impact Card's
  `footer` instance swap, under the route line.
- `Approval Queue / Burst warning`: `Kind` (`Approvals`, `Arrivals`) — a configured Contextual
  Alert instance with the sentence as a text property.
- Example frame `Approval Queue — worked example`: a synthetic case's proposals at 1440 wide, all
  four lanes and the tray. It is an example, not a component.

| Figma property | Code |
|---|---|
| `Lane` | derived from `resolveRoute(...).rung` and `item.kind` |
| `State` | open item, decided item, `permission.decide` |
| `Has gap` | `meetsBulkBar(item, now).ok === false` |
| `Handed off` / `Overdue` / `Not delivered` | a `hand-off` decision recorded; `appliedAt + reviewWithinHours` passed; `delivery.notDelivered` |
| `Mode` (Decision bar) | reason field open, approval withheld, request in flight, request failed |

The builder never places a `Decision bar` with Approve but no Deny, never places checkboxes in the
Review or Act lanes, and never colours a deadline. Every fill, stroke and text binds a variable.

## Anti-patterns

- ❌ Passing `route` on an item, or computing the lane in host code → the Queue calls `resolveRoute`; a precomputed route does not compile.
- ❌ An approval request with no deadline → every pending item has `expiresAt`, and undecided means not run.
- ❌ A red, ticking countdown → an absolute time and minutes left; failing closed is not an emergency.
- ❌ "Approve all" over every item → bulk only over items that meet the printed bar, opted out, confirmed in a Dialog.
- ❌ Deny behind a menu while Approve is a filled button → the safe direction is never harder.
- ❌ A required reason to Deny or Stop → reasons are asked of the risky direction only.
- ❌ A Defer button → leaving an item already defers it; a button that only reorders lets things expire unread.
- ❌ A Run button that executes a `person-acts` change → hand off to the host's tool; the agent may only recommend.
- ❌ "Confirm all" in the review lane → one at a time; bulk confirms would launder the track record.
- ❌ Rendering `<main>` → the host owns it; the Queue is a labelled `<section>`.
- ❌ Counting a sent notification as delivery → delivery is evidence a named person was shown the item.
- ❌ Lanes as tabs → `stop-window` would be hidden; all lanes on one page.
- ❌ Approving on the route shown when the page loaded → the Queue re-resolves at the click and refuses on a change.
- ❌ `by: currentUser` in the decision event → the host stamps identity from the session (will not compile).
- ❌ A hold that starts when the agent proposes → it starts when the item reaches a named person.
- ❌ Removing a decided item at once, so the list jumps → it stays in place as one line.
- ❌ A proposer approving their own change → the host marks it `decide: false`; the Queue shows who can.
- ❌ Staged rollout waves inside the Queue → that is a Rollout Wave tracker, not in the kit.

## Decisions taken in review (29 Oct 2026)

1. **Hold on delivery** — kept. `person-can-stop` fails closed until a named person has been shown
   the item; "delivered" is host evidence of that, not a sent notification.
2. **Burst thresholds** — the defaults stay, labelled "default" in the warning; they are
   assumptions to measure.
3. **Defer** — dropped. The approve lane is Approve · Deny.
4. **Release now during a burst** — withheld, with the same sentence as bulk approval.
5. **Verdicts** — kept out of the Queue. One SOC inbox is a page pattern, to be written with the
   Hand-off card.
6. **`act`** — hands off to the host's own tool and follows every Approve rule. It does not execute.
