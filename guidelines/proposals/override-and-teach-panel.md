# Override & Teach Panel

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

Turns one person's override into a lesson the agent keeps, but only on purpose, and only after the
person has seen what the agent will store and what it would have changed. An override on its own
teaches nothing. The panel shows the person's own words beside the agent's version of them, which
future cases the lesson covers, and which way it moves the agent: stricter, or more lenient — as
the person meant it and as the replay shows it would act. Before
anything is saved it checks the lesson against lessons already in use, scans it, and replays it over
recent verdicts that people have already reviewed. A lesson that would make the agent more lenient
needs a second person. Every lesson expires, has its own record, and stops when the evidence turns
against it.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless), for Combobox and Popover.
**Spec stage:** pressure-tested, 29 Oct 2026, with the repo thread's review folded in. Its six open
answers were confirmed by Omkar on 31 Oct 2026.

> **Changed 1 Nov 2026 — breaking.** With the [Filter Grammar](../contracts/filter-grammar.md),
> a lesson's conditions are the grammar's `PositiveConjunction<F>` over the host's `Fields`, from
> `defineFields`. A condition no longer carries `fieldTrust`, `source` or `writtenBy`: who could
> have set a value is the field's declared `trust`. The operators are the grammar's positive ones
> for each field's type, so a `domain` field takes `is-subdomain-of`, never `ends-with`. The
> readback is the grammar's `readback` with `markTrust`. `fromItem` moves to a list beside the
> conditions. The rule count is unchanged.

## Intent

A person teaching an agent should be able to answer six questions from the panel before saving.
What exactly will the agent keep? Which future cases will it touch? Does it make the agent stricter
or more lenient? Does it clash with something the agent already knows? What would it have done to
the cases people have already decided? And when does it stop?

What it answers:

- **EU AI Act, Article 15(4).** A high-risk system that keeps learning after it is placed on the
  market must be built to remove or reduce, as far as possible, the risk that biased outputs feed
  future inputs ("feedback loops"), and those loops must be handled with suitable mitigation. A
  lesson is exactly such a loop. The panel's mitigations are the replay against reviewed outcomes,
  the second person for lenient lessons, expiry, and suspension on the first overturned case.
  **Article 14(4)(d)** (decide not to use, override): the override stays a decision of its own.
  Teaching is a second, separate choice.
- **OWASP Agentic Top 10 (Dec 2025), ASI06, Memory & Context Poisoning.** Its mitigations, read in
  the OWASP document on 29 Oct 2026, include scanning new memory writes "before commit",
  preventing "automatic re-ingestion of an agent's own generated outputs into trusted memory",
  expiring "unverified memory to limit poison persistence", and snapshots, rollback and version
  control. A lesson is a memory write. So nothing is stored automatically, every write is scanned
  and versioned, every lesson expires, and a lesson can be retired with the verdicts it changed
  sent back for review. **ASI09, Human-Agent Trust Exploitation:** lenient is never the easy path.
  **ASI10, Rogue Agents:** every stage change is an event for the Agent Action Ledger.
- **NIST AI RMF 1.0, MANAGE 4.1.** Post-deployment monitoring includes "mechanisms for capturing
  and evaluating input from users", with "appeal and override … change management". The panel is
  that mechanism for one agent, and each lesson's record is its evaluation.
- **Ensign et al., FAT\* 2018** ("Runaway Feedback Loops in Predictive Policing", PMLR 81).
  A system that only learns from the cases it chose to look at can run away from the truth. For a
  security agent: a lesson that lets cases through also removes the reviews that would prove it
  wrong. So a lenient lesson carries its own record of the cases it touched, and is suspended the
  first time one of them is overturned.
- **Amershi, Cakmak, Knox & Kulesza, AI Magazine 35(4), 2014** ("Power to the People"). People
  are "not necessarily willing to be simple oracles", and "have a strong tendency to give more
  positive rewards than negative rewards". In a security console the same lean shows up as a lean
  towards *benign*: most alerts are noise, and closing them is relief. So the lenient direction is
  the one that gets the extra check.
- **Kulesza, Burnett, Wong & Stumpf, IUI 2015** ("Principles of Explanatory Debugging"). When the
  system explained its predictions and people explained corrections back, participants understood
  the system 52% better and fixed its mistakes up to twice as efficiently. So the panel shows the
  agent's version of the lesson, and the replay shows what the lesson would do, before it is kept.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026; Microsoft's phishing triage agent
  documentation re-read 29 Oct 2026, page updated 2 Jul 2026).** One vendor ships an override →
  teach loop. Its documented shape: an override is recorded for audit only unless the person also
  chooses to teach; the agent's translation of the feedback is previewed; a basic safety and
  conflict check runs; lessons are listed as in use, in conflict or not in use; rejecting a lesson
  needs an administrator role; one piece of feedback per alert; no bulk management. **What this
  spec adds, labelled as its own proposal:** a direction for every lesson; a replay against cases
  people already reviewed; conditions marked by who could have set their values; a second person
  for lenient lessons; expiry; a per-lesson record; and suspension on the first overturn. No
  vendor's labels or screens are reused.

**A lesson is guidance, not evidence.** It tells the agent where to look and how to weigh what it
finds: "check the payment account against the vendor list". It never makes a fact true. When an
agent applies a lesson, the lesson appears in the Evidence Locker as a memory item written by an
agent, so a claim about the world that rests only on a lesson is a weak claim, and Accept is
withheld on it.

Limits: the panel shows the check the host ran. It cannot judge whether a lesson is wise, only
whether it would have contradicted decisions people already made, in the window replayed. A replay
sees past verdicts, not future attackers; a lesson can be safe on last month's cases and still be
exploited next week. The panel covers lessons about verdicts only. Lessons about actions (a denied
or rolled-back change) and about scores are out of scope for now (see *Open questions*).

## When to use Override & Teach Panel

- A person has overridden a verdict on the **Verdict Card** and wants the agent to learn from it →
  **Override & Teach Panel**, opened from "Teach the agent" on the card.
- The override itself → the **Verdict Card**. The panel never records or changes a verdict.
- A lesson that needs a second person → the panel hands an **Action Impact Card** to the **Approval
  Queue**, in the approve lane. The panel is not a second decision surface.
- One lesson already in use: its record, its expiry, retiring it → the panel at its `in-use`,
  `suspended` or `ended` stage.
- All of an agent's lessons in one list → a **Table** of the panel's `summary` rows. That list is a
  page pattern, not a component. Flag the gap if a team needs bulk handling: none is offered, on
  purpose.
- Changing how much the agent may do on its own → **Autonomy Ladder**. A lesson changes what the
  agent concludes, not what it is allowed to do.
- How sure the agent says it is → **Calibrated Confidence Gate**. A lesson does not set a
  confidence band.
- A rule a person writes for a detection or a policy → **Rule Builder with dry-run impact**
  (Phase 2b). A lesson is guidance to an agent, not a rule a system enforces.

## Props

```tsx
import { defineFields } from "@omkarux/vela"   // the Filter Grammar, in the core entry

// The host's fields for emails, declared once. Labels are people's words; keys are the text form's.
const emailFields = defineFields({
  "sender.domain": { label: "Authenticated sender domain", type: "domain",
                     trust: { kind: "system-record", source: "Mail gateway (DMARC-aligned From)" } },
  "subject":       { label: "Subject", type: "text",
                     trust: { kind: "untrusted", writtenBy: "the email's sender" } },
  "vendor.listed": { label: "Payment account on the vendor list", type: "boolean",
                     trust: { kind: "system-record", source: "Vendor master" } },
})

<OverrideTeachPanel
  stage="draft"
  fields={emailFields}
  agent={{ id: "agt_triage", name: "Triage agent", version: "2.4", model: "example-large-2026-07" }}
  taughtFrom={{
    verdictId: "vd_9c07", version: 2, caseLabel: "Case CS-4180",
    from: "suspicious", to: "benign",
    by: "A. Rao", at: "2026-10-29T09:12:00Z",
    reason: "Northwind's monthly invoice. Sent from northwind.example, DMARC pass, and the bank account matches the vendor list.",
  }}
  draft={{
    lessonId: "ls_31", version: 3,
    words: "Monthly invoices from Northwind are expected. Check the domain is really theirs and the bank account is the one on the vendor list.",
    appliesTo: {
      conditions: {
        grammar: 1,
        root: { kind: "group", join: "and", items: [
          { kind: "condition", field: "sender.domain", operator: "is", value: "northwind.example" },
          { kind: "condition", field: "subject", operator: "contains", value: "Invoice" },
          { kind: "condition", field: "vendor.listed", operator: "is", value: true },
        ] },
      },
      fromItems: [{ condition: 2, item: "ev4" }],   // the subject was copied from evidence item ev4
    },
    translation: {
      kind: "ready", version: 2, forDraftVersion: 3,
      text: "When the authenticated sender domain is northwind.example, the subject contains 'Invoice', and the payment account in the email is on the vendor list, treat the email as benign. Check the vendor list on every email; this lesson is not proof that an account is genuine.",
    },
    expiresAt: "2027-01-27T09:12:00Z",
  }}
  check={check}             // a Check, below
  onTranslate={translate}
  onCheck={runCheck}
  onSave={save}             // offered only when the route is "save"
  onSendForApproval={send}  // offered only when the route is "second-person"
  onClose={close}
  timeZone="UTC"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `stage` | `"draft" \| "awaiting-approval" \| "in-use" \| "suspended" \| "ended"` | — | **Required. These five only.** Lifecycle, not a taxonomy: no tokens, no colour. The props are a union over `stage` (below). |
| `fields` | `Fields<S>` | — | **Required.** The host's `defineFields` schema for the records a lesson matches: each field's label, type and declared `trust`. Every condition's field is one of its keys, and the panel reads a condition's trust from it, never from the condition. |
| `agent` | `Provenance["agent"] & { model: string }` | — | **Required.** The agent being taught, as it runs now. Shown with the **Agent Provenance Badge**'s agent wording. Compared with `check.checkedAgainst`. |
| `taughtFrom` | `Override` | — | **Required.** The override the lesson came from. A lesson always starts from one decided case. |
| `draft` | `Draft` | — | **Required.** The lesson: the person's words, what it applies to, the agent's version, the expiry. At `in-use` and later it is the saved lesson. |
| `check` | `Check` | — | **Required from `awaiting-approval` on.** Optional at `draft`: absent means "Not checked yet". A check binds to the draft version it read. |
| `secondPerson` | `"lenient-only" \| "always"` | `"lenient-only"` | **These two only.** Host policy. `always` sends stricter lessons to a second person too. There is no "never". |
| `replayDays` | `number` | `30` | The window a check replays, printed with the word "default" while the host has not set it. An assumption to measure. |
| `lessonDays` | `number` | `90` | Default life of a new lesson, printed with "default" while unset. Capped at `VELA_MAX_LESSON_DAYS`, and at `replayDays` for a lenient lesson that was not replayed. An assumption to measure. |
| `expiryNoticeDays` | `number` | `7` | How long before expiry a **stricter** lesson says "Expires in *n* days — renew to keep it", in the panel and as a Ledger note. Printed with "default" while unset. An assumption to measure. |
| `size` | `"panel" \| "summary"` | `"panel"` | **These two only.** `summary`: the one-line text summary, for a row in a list of lessons, opening the panel from the row. |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |
| `clock` | `() => Date` | `() => new Date()` | For tests and replays. Standing, expiry and staleness read it. |
| `teachWith` | `string` | — | Shown when no save handlers are passed: who can teach this agent ("Ask a Tier 2 analyst"). |

```ts
type Verdict = "malicious" | "suspicious" | "benign" | "inconclusive"   // the Verdict Card's set
type LessonDirection = "stricter" | "lenient"

type Override = {
  verdictId: string; version: number; caseLabel: string
  from: Verdict                 // the agent's verdict, or its lean
  to: Verdict                   // the person's verdict; may equal `from` (agreed with the lean)
  by: string; at: string; reason: string
}

// A lesson's scope is the Filter Grammar's (guidelines/contracts/filter-grammar.md), imported from
// the core entry, never redeclared here:
import type { Fields, PositiveConjunction, PositiveCondition } from "@omkarux/vela"
// PositiveConjunction<F> is one group, `join: "and"`, of at least one PositiveCondition<F>, and no
// inner group. So conditions are always ANDed: a lesson applies only when every condition holds.
// There is no OR and no negation. Alternatives are separate lessons, each checked on its own.
//
// A PositiveCondition<F> is `{ kind: "condition"; field; operator; value }`: `field` is a key of the
// host's Fields, and the operator and value are those the field's type allows, positive only. Per
// type: text — is, is-one-of, contains, starts-with, ends-with; identifier — is, is-one-of,
// starts-with; domain — is, is-one-of, is-subdomain-of; ip — is, is-one-of, in-range; number — is,
// greater-than, at-least, less-than, at-most, between; time — before, after, between, within-last;
// enum — is, is-one-of; boolean — is. Every type also takes is-set. No `is-not-set`, and none of the
// seven negations.
//
// A condition carries no trust of its own. Who could have set the value it matches on is the
// field's declared `trust` (the Evidence Locker's Content trust set: system-record with `source`;
// agent-output or untrusted with `writtenBy`), so no condition can claim a field is more trusted
// than its declaration says.

// Where a condition's value was copied from, kept beside the conditions, not inside them: the
// grammar rejects any key it does not know, so a `fromItem` inside a condition would make
// `validateQuery` and `readback` refuse the lesson. `condition` counts the conditions as they read,
// from 1, as the grammar's errors do. At most one entry per condition, and only for a condition the
// lesson has.
type FromItem = { condition: number; item: string }     // `item`: the Evidence Locker item's id

type Translation =
  | { kind: "ready"; version: number; forDraftVersion: number; text: string }   // what the agent will store
  | { kind: "pending" }
  | { kind: "failed"; message: string }
  | { kind: "not-yet" }

type Draft<F extends Fields = Fields> = {
  lessonId: string
  version: number                      // increments on every edit to words or conditions
  words: string                        // the person's own words, kept verbatim, never sent to the agent's memory
  appliesTo: {
    conditions: PositiveConjunction<F> // never empty; all must hold
    fromItems?: FromItem[]             // which values were copied from evidence, and from which item
  }
  // There is no readback to pass. The panel words it once, with the grammar:
  // readback(conditions, fields, { markTrust: true, full: true, now: clock(), timeZone,
  //   strings: { booleans: { true: "yes", false: "no" } } })
  // `full` because the readback is also the text summary and the Ledger line.
  translation: Translation
  expiresAt: string                    // ISO 8601; approved with the lesson
  renewalOf?: { version: number }      // set when this draft renews a lesson in use
}

type Check = {
  checkedAt: string
  forDraftVersion: number
  forTranslationVersion: number
  checkedAgainst: { agentVersion: string; model: string }
  conflicts: Conflict[]                                        // [] claims none
  scan: { by: string; flags: { hint: string }[] } | { notRun: string }   // flags: [] means clear
  replay: Replay | { notRun: string }
}
// The replay runs the agent applying the exact stored restatement (`forTranslationVersion`), not
// the conditions alone: the conditions are the readable scope; the restatement is what the agent
// applies, and it can reach further than they do.
type Conflict = { lessonId: string; version: number; text: string; why: string; href?: string }

type Replay = {
  window: { from: string; to: string }
  replayed: number                         // verdicts the lesson was run against
  of: Count                                // all verdicts by this agent in the window (the Action Impact Card's Count)
  changed: { from: Verdict; to: Verdict; count: number }[]   // [] claims it would have changed none
  outcome: {
    matchesReview: number                  // its new verdict equals what a person (or later evidence) settled
    againstReview: number                  // its new verdict differs from what was settled
    unreviewed: number                     // nobody settled those cases
    againstSample?: { verdictId: string; caseLabel: string; settled: Verdict; by: string; href?: string }[]
  }
}

type LessonRecord = {
  since: string
  applied: number                          // verdicts on which the agent cited this lesson
  overturnedByPerson: number
  overturnedByEvidence: number
  confirmedOnReview: number
  confirmedByAccept: number
  unreviewed: number
}
// The Gate's precedence, one count per verdict: overturned by a person → overturned by evidence →
// confirmed on review → confirmed by Accept → unreviewed. The five counts must equal `applied`.

type Approval =
  | { by: "teacher-alone"; name: string; at: string }
  | { by: "second-person"; name: string; at: string; queueItem: string }   // the approve-lane item it came through

type Ended = { how: "retired" | "expired" | "declined" | "withdrawn"; by: string; at: string; reason: string }

type LessonEvent = {
  lessonId: string; version: number
  agent: { id: string; version: string }
  kind: "saved" | "sent-for-approval" | "withdrawn" | "retired" | "rechecked" | "renewed"
  reason?: string; at: string
}   // the host stamps the person from the session
// Automatic changes (expired, suspended, expiry notice) are the host's to emit; `lessonStanding`
// says when they are due.

// The public props are a union over `stage`. Do not flatten it: `teach-stage-carries-proof` is a
// compiler rule only because of this union.
type OverrideTeachPanelProps<F extends Fields = Fields> = CommonProps<F> & (
  | { stage: "draft"; check?: Check;
      onTranslate?: (draftVersion: number) => Promise<void>
      onCheck?: (e: { draftVersion: number; translationVersion: number }) => Promise<void>
      onSave?: (e: LessonEvent & { check: Check }) => Promise<SaveResult>
      onSendForApproval?: (e: LessonEvent & { check: Check }) => Promise<SaveResult>
      onClose: () => void }
  | { stage: "awaiting-approval"; check: Check; sentAt: string; queueHref?: string; approveWith: string
      onWithdraw?: (e: LessonEvent & { reason: string }) => Promise<SaveResult> }
  | { stage: "in-use"; check: Check; approval: Approval; record: LessonRecord
      onRetire?: (e: LessonEvent & { reason: string }) => Promise<SaveResult>
      onRecheck?: () => Promise<void>; onRenew?: () => Promise<void> }
  | { stage: "suspended"; check: Check; approval: Approval; record: LessonRecord
      suspended: { at: string; why: string }
      onRetire?: (e: LessonEvent & { reason: string }) => Promise<SaveResult>
      onRecheck?: () => Promise<void> }
  | { stage: "ended"; check: Check; approval?: Approval; record?: LessonRecord; ended: Ended }
)

// CommonProps<F>: fields (F), agent, taughtFrom, draft (Draft<F>), secondPerson, replayDays,
// lessonDays, expiryNoticeDays, size, timeZone, clock, teachWith — the table above.

type SaveResult =
  | { ok: true; version: number }
  | { ok: false; message: string }
  | { ok: false; conflict: "newer-version"; version: number }

export const VELA_MAX_LESSON_DAYS = 365
```

### The pure functions

Five exports, each tested once, on the function. The panel and the Approval Queue call the same
functions, so the route a teacher sees is the route the approver sees.

```ts
// Which way one change of verdict moves the agent. Ranks: benign 0, inconclusive 1, suspicious 2,
// malicious 3. Lenient when `to` is benign (including benign → benign), or when `to` ranks below
// `from`. Stricter otherwise (including malicious → malicious). There is no third answer.
export function lessonDirection(from: Verdict, to: Verdict): LessonDirection

// The two directions of one lesson, and the one every rule uses.
// intent: lessonDirection(taughtFrom.from, taughtFrom.to) — what the person meant.
// effect: from the replay — lenient if any `changed` row is lenient by lessonDirection; stricter if
//   none is (including `changed: []`); "not-replayed" when there is no replay, or its counts do not
//   add up.
// used: lenient if either is lenient; stricter otherwise. Fails towards the extra check.
type LessonDirections = {
  intent: LessonDirection
  effect: LessonDirection | "not-replayed"
  used: LessonDirection
  letThrough?: number          // when intent is stricter and effect lenient: the cases it would have let through
}
export function lessonDirections(taughtFrom: Override, check?: Check): LessonDirections

type LessonRoute =
  | { route: "save"; reasons: [] }
  | { route: "second-person"; reasons: [RouteReason, ...RouteReason[]] }
  | { route: "blocked"; reasons: [BlockReason, ...BlockReason[]] }
type RouteReason =
  | "lenient" | "policy-always" | "scan-flagged" | "scan-not-run" | "replay-not-run"
type BlockReason =
  | "not-checked" | "check-stale" | "translation-not-ready" | "conflict"
  | "lenient-without-exact-system-record" | "lenient-against-review" | "replay-does-not-add-up"
  | "expiry-too-long" | "unreplayed-life-too-long" | "renewal-not-replayed"

// Blocked beats second person beats save. Every reason that applies is listed, not only the first.
// Every direction rule reads `lessonDirections(taughtFrom, check).used`.
export function lessonRoute<F extends Fields>(input: {
  fields: F; taughtFrom: Override; draft: Draft<F>; check?: Check
  agent: CommonProps["agent"]; secondPerson: "lenient-only" | "always"
  replayDays: number; now: Date
}): LessonRoute

// Whether a lesson the host marks as in use should still be in use, worked out from its own data.
// It depends on the used direction: what makes a lenient lesson stop would, for a stricter one,
// quietly make the agent more lenient.
type StandingNote =
  | { kind: "not-rechecked"; checkedAgainst: { agentVersion: string; model: string } }   // stricter only
  | { kind: "expires-soon"; at: string }                                                 // stricter only
type LessonStanding =
  | { standing: "in-use"; notes: StandingNote[] }
  | { standing: "suspended"; because: "overturned" | "new-agent-version" | "new-model" | "no-second-person" | "record-does-not-add-up" }
  | { standing: "expired"; at: string }
export function lessonStanding(input: {
  taughtFrom: Override; draft: Draft; check: Check; approval: Approval
  record: LessonRecord; agent: CommonProps["agent"]; expiryNoticeDays: number; now: Date
}): LessonStanding

// The Approval Queue item for a lesson that needs a second person (see "Through the Approval Queue").
export function lessonQueueItem<F extends Fields>(input: {
  fields: F; taughtFrom: Override; draft: Draft<F>; check: Check; agent: CommonProps["agent"]
  teacher: string; arrivedAt: string; expiresAt: string
}): Pick<PendingItem, "card" | "permission"> & { ceiling: "person-approves" }
```

**What blocks, what needs a second person, what saves.**

| Situation | Route |
|---|---|
| No check, or the check is for an older draft, translation, agent version or model | blocked: "Check again — the lesson changed after the last check." |
| The agent's version of the lesson is not ready, or failed | blocked |
| Any conflict with a lesson in use | blocked, each conflict listed with its text |
| Lenient, and no condition matches exactly (`is` or `is-one-of`) on a field whose declared trust is `system-record` | blocked: "A lesson that lets cases through must match exactly on at least one value an outsider cannot set." |
| Lenient, and the replay goes against any settled case | blocked, the cases listed: "Narrow the lesson, or correct those cases first if they were settled wrongly." |
| Replay counts do not add up | blocked: "Replay counts do not add up — not shown." |
| `expiresAt` more than `VELA_MAX_LESSON_DAYS` after now | blocked |
| Lenient, not replayed, and `expiresAt` more than `replayDays` after now | blocked: "Not replayed: a lenient lesson may live at most 30 days (default)." |
| Lenient renewal (`renewalOf`), not replayed | blocked: "A lenient lesson is renewed only after a replay." |
| Lenient, otherwise clean | second person |
| Stricter, with `secondPerson="always"` | second person |
| Scan flagged anything, or did not run | second person, the scanner's hints shown |
| Replay did not run (lenient or stricter) | second person, with the host's reason. For a lenient lesson the route sentence adds: "Not replayed: the second person approves without seeing what it would have changed." |
| Stricter, scan clear, replay run, no conflict | save, on the teacher's own say |

"Lenient" and "stricter" in this table are the **used** direction. A lesson meant to be stricter
whose replay would have let any case through is treated as lenient, everywhere.

Stricter lessons can rest on untrusted values ("the QR code in the attachment points outside our
tenant") and can go against settled benign cases. Both make the agent send more to people, which is
the safe direction, so neither makes saving harder. The replay still shows them.

**Why "exactly".** A partial match on a system record still lets an outsider in.
- **Domains.** The panel used to allow `ends-with` on any field, and an authenticated domain that
  *ends with* "northwind.example" also matches evilnorthwind.example, which anyone can register.
  With the Filter Grammar, a `domain` field has no `contains` or `ends-with`: `is-subdomain-of`
  replaces them, and matches on label boundaries only. That closes the gap.
- **Still not exact.** `is-subdomain-of` matches every subdomain, and a subdomain can be run by
  someone else: a hosted service, a forgotten DNS record. `contains`, `starts-with` and `ends-with`
  on a `text` system record, `in-range`, the number and time comparisons and `is-set` all match more
  than one value too.

So a lenient lesson's outsider-proof condition must be `is` or `is-one-of`, on a field whose
declared trust is `system-record`.

**Retiring routes the opposite way.** Retiring a lenient lesson makes the agent stricter, so the
teacher's own say is enough and it takes effect at once. Retiring a stricter lesson makes the agent
more lenient, so it goes to a second person through the Approval Queue, as a lenient lesson would.

**Standing by direction.**

| Event | Lenient lesson | Stricter lesson |
|---|---|---|
| A verdict it changed is overturned | suspended | stays in use; the count shows |
| New agent version or model | suspended until re-checked | stays in use: "Checked against 2.4; now running 2.5 — not re-checked, still applied because it only sends more to people". Check again offered |
| Re-checked on the new version, and the effect is now lenient | — | treated as lenient from then on: suspended until a second person approves it, unless one already did |
| Approved by the teacher alone | suspended (should never happen) | in use |
| `expiresAt` reached | expired | expired. "Expiry was approved with the lesson." Shown `expiryNoticeDays` ahead, in the panel and as a Ledger note, so someone can renew it first |
| Record counts do not add up | suspended | suspended |

Expiry is the one automatic way a stricter lesson stops. It is authorised once, when the lesson is
saved, by whoever saved it; nothing later shortens it.

### Through the Approval Queue

A lesson that needs a second person is not decided in the panel. `lessonQueueItem` builds an
**Action Impact Card** at stage `pending` and the Queue item's permission, and the host adds it to
the **Approval Queue** with the route's ceiling at `person-approves`, so the Queue can never place it
in a lane that runs on its own.

| Card field | From the lesson |
|---|---|
| `summary` | "Teach Triage agent 2.4 a lenient lesson: *readback*." When intent and effect differ: "…a lesson meant to be stricter that would have let 2 cases through: *readback*." *readback* is the grammar's full readback with `markTrust`, the same sentence the panel shows. |
| `operation` | `{ tool: "agent.memory.write", target: "lesson/ls_31", language: "json", literal }` — the literal is the lesson as it will be stored: the agent's version, the conditions as the grammar's object after `normalise`, and the expiry. Never the teacher's words alone. |
| `reversibility` | `counterable`, with `counterAction`: "Retire the lesson and send the verdicts it changed back for review." Verdicts already closed under it are not undone by retiring. |
| `blastRadius` | `{ kind: "verdicts it would have changed in the last 30 days", count: { exact: changed total } }`, or `{ unknown }` with the replay's reason — "Not replayed: the second person approves without seeing what it would have changed" |
| `observed` | the replay window, or `{ none }` with the reason |
| `coverage` | `{ read: replayed, of, unit: "verdicts replayed" }` |
| `consequences` | one line per `changed` row, `basis: "observed"`, plus every settled case it goes against (stricter only; a lenient one is blocked) |
| `proposedBy` | `{ kind: "person", name: teacher }` |
| `proposerReason` | the teacher's own words |
| permission | `{ decide: false, reason: "You taught this lesson.", decideWith: approveWith }` for the teacher |

Approve saves the lesson at the version the approver saw; Deny ends it as `declined`, with the
reason. If the Queue item expires undecided, the lesson ends as `expired`, with the reason "Not
approved before *time*": no approval means it does not go into use. The Queue's own rules — decisions bind to a version, no self-approval, no bulk past its bar
— apply unchanged.

### New closed sets

| Set | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Lesson direction** (2) | `stricter` · `lenient` | which way a lesson moves the agent: towards sending more to people, or towards letting more through | Override & Teach Panel | **none.** Words only |

Lesson direction is derived by `lessonDirection` and `lessonDirections`, never passed. It never crosses Verdict, Severity,
Risk, Status or any other set: a lenient lesson is not a low-risk lesson. The five stages and the
four ways a lesson ends are lifecycles, like the Action Impact Card's stages: closed, but with no
tokens and no colour.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Closed sets.** `stage`, `secondPerson`, `size`, `ended.how`, and the route and standing reasons
  accept only their sets. A condition is the grammar's `PositiveCondition<F>`: its `field` is a key
  of the host's `Fields`, and its operator and value are those the field's type allows, positive
  only. A condition has no trust of its own to set; trust is the field's declared `trust`, which has
  no `"unknown"`. There is no `secondPerson="never"`, no negated operator (`"is-not"`,
  `"does-not-contain"`, `"is-not-set"`), and no `contains` or `ends-with` on a `domain` field. A
  Verdict, Severity, Risk or Status value passed as a direction or stage does not compile.
  `teach-closed-sets` · compiler
- **A lesson has a scope, and every condition must hold.** `appliesTo.conditions` is a
  `PositiveConjunction<F>`: one group whose `join` is `"and"`, with at least one condition and no
  inner group. An empty `items`, `join: "or"` or a nested group does not compile, so an OR cannot be
  built. `is-one-of` takes a non-empty list, and each operator takes its own shape of value, as the
  grammar says. The readback is the grammar's, so it joins conditions with "and", never "or".
  `teach-scope-required` · compiler
- **A check declares everything.** `conflicts`, `scan` and `replay` are required. `[]`,
  `{ flags: [] }` and `{ notRun }` are explicit claims, printed as such: "No conflicts", "Scan
  clear (*by*)", "Not replayed: *reason*". `teach-check-declared` · compiler
- **Each stage carries its proof.** `check` is required from `awaiting-approval` on; `approval` and
  `record` at `in-use` and `suspended`; `suspended` at `suspended`; `ended` at `ended`. A save
  handler at a later stage, or a retire handler at `draft`, does not compile.
  `teach-stage-carries-proof` · compiler
- **An override never teaches by itself.** Opening the panel stores nothing. Closing it with
  "Keep the override only" stores nothing and sends no event. There is no auto-save and no
  pre-filled consent. The person's words are never sent to the agent's memory; only the agent's
  version is, once approved. `teach-never-automatic` · runtime
- **The direction is said, before anything else is decided, and the stricter reading never wins
  by default.** The panel calls `lessonDirections` and prints the used direction in the first block,
  in words: "This lesson makes Triage agent 2.4 more lenient: it would let similar cases through." /
  "…stricter: it would send similar cases to a person." When intent and effect differ, it names
  both: "You meant this to be stricter, but the agent's version would have let 2 cases through."
  Before a replay, it says "As you meant it — not replayed yet". Lenient is set in SemiBold, stricter
  in Regular, with no colour, no icon. Caution is louder than reassurance.
  `teach-direction-said` · runtime
- **What is saved is what was shown.** Every save, send and approval carries `forDraftVersion`
  and `forTranslationVersion`. Editing the words or a condition marks the agent's version "Out of
  date — ask the agent again" and the check "Check again". If the host rejects a save as a newer
  version, the panel keeps the person's words and conditions, shows "The lesson changed while you
  were reading", and renders the newer one. `teach-stores-what-was-shown` · runtime
- **The route is shown, with every reason.** The panel calls `lessonRoute` and prints the route
  sentence directly above the controls, listing every reason that applies, not only the first.
  Only the matching control is offered: Save for `save`, "Send for approval" for `second-person`,
  neither for `blocked`. A withheld control is not rendered disabled; its reason stands in its
  place. `teach-route-shown` · runtime
- **A lenient lesson needs an exact value an outsider cannot set.** When the used direction is
  lenient and no condition uses `is` or `is-one-of` on a field whose declared trust, read from
  `fields`, is `system-record`, the route is blocked. A sender display name, a subject or a file name
  alone can never let cases through, and neither can a partial match on a system record, such as
  `is-subdomain-of`. Because conditions are ANDed, the outsider-proof condition always applies.
  `teach-lenient-needs-system-record` · runtime
- **A lenient lesson may not overrule settled cases.** When the used direction is lenient and
  `replay.outcome.againstReview` is more than 0, the route is blocked and the settled cases are
  listed with who settled them. The way out is to narrow the lesson, or to correct the settled
  cases first if they were wrong. `teach-lenient-against-review-blocked` · runtime
- **A conflict blocks.** Any `conflicts` entry blocks the route. Each conflict shows the other
  lesson's id, version, text (inert) and why the host thinks they clash, with a link to that
  lesson. Resolving it means rewriting this lesson or retiring the other, which routes on its own.
  `teach-conflict-blocks` · runtime
- **The replay is counts, and the counts add up.** The replay renders as natural frequencies with
  its window and coverage: "In 29 Sep – 28 Oct, run against 212 of 240 verdicts (28 not
  retained), this lesson would have changed 14: 12 Suspicious → Benign, 2 Malicious → Benign. Of
  those 14, 9 match what was settled, 3 go against it, 2 were never reviewed." Never a percentage
  alone, never a score. `matchesReview + againstReview + unreviewed` must equal the sum of
  `changed`, and `replayed` cannot exceed an exact `of`. If either fails: "Replay counts do not add
  up — not shown", and the route is blocked. The replay is labelled with the restatement it ran
  ("Replayed with the agent's version 2 of this lesson"): it runs what will be stored, not the
  conditions alone. `teach-replay-in-counts` · runtime
- **Values from untrusted content are marked.** A condition on a field whose declared trust is
  `untrusted` renders its value in the Evidence Locker's quote block, labelled "could have been set
  by *writtenBy*", everywhere it appears: the conditions, the readback, the agent's version and the
  text summary. The words are the grammar's: the readback is `readback` with `markTrust`, which also
  marks `agent-output` fields, and the condition rows use the same `couldHaveBeenSetBy` string.
  The agent's version is rendered as inert text: no markup, no links, hidden characters escaped as
  the Locker escapes them. `teach-untrusted-values-marked` · runtime
- **The second person is someone else.** `lessonQueueItem` returns the route's ceiling as
  `person-approves` and a `permission` of `decide: false` for the teacher. The panel never offers
  the teacher an approve control for their own lesson. `teach-second-person-differs` · runtime
- **Every lesson expires.** A new draft's `expiresAt` defaults to `lessonDays` after now, printed
  "Expires 27 Jan 2027 (default 90 days)" while the host has not set it. Longer than
  `VELA_MAX_LESSON_DAYS` blocks the route; so does a lenient lesson with no replay living longer
  than `replayDays`. Renewing makes a new version (`renewalOf`) that is checked and routed as a new
  lesson; a lenient renewal without a replay is blocked. A lesson never extends itself.
  `teach-expiry-capped` · runtime
- **Standing is derived, not passed, and depends on direction.** At `in-use`, the panel calls
  `lessonStanding`, which follows the *Standing by direction* table. A lenient lesson with any
  overturned verdict, a new agent version or model, or no second person; any lesson past
  `expiresAt`; or any record that does not add up, renders as suspended or expired, first line, with
  the reason: "Should be suspended: 1 verdict this lesson changed was overturned by a person on 2
  Nov. The host still marks it in use." A stricter lesson is never stopped by a version change: it
  stays in use with its "not re-checked" note, so a model swap never quietly makes the agent more
  lenient. Its expiry shows `expiryNoticeDays` ahead, with "Expiry was approved with the lesson".
  `teach-standing-derived` · runtime
- **The lesson's record adds up.** The record uses the Gate's precedence and wording: "Applied 23
  times since 14 Oct · 6 reviewed: 5 confirmed, 1 overturned by a person · 17 unreviewed." The five
  counts must equal `applied`; if not, "Record counts do not add up — not shown", and the standing is
  suspended. `teach-record-adds-up` · runtime
- **Retiring routes the opposite way.** Retiring a lenient lesson is offered to anyone with
  `onRetire` and takes effect at once. Retiring a stricter lesson is offered as "Send for approval
  to retire" and goes to the Approval Queue. After a retire, the panel offers "Send the *n* verdicts
  it changed back for review". `teach-retire-routes-opposite` · runtime
- **Every change has a reason and an event.** Withdraw, retire and renew need a non-empty reason;
  whitespace does not submit. Save and send carry the teacher's words as the reason. Every one
  emits a `LessonEvent` with the lesson id and version and the agent's id and version, for the
  Agent Action Ledger. `teach-change-has-reason-and-event` · runtime
- **Reading order before action.** In DOM and reading order: heading, the override it came from,
  direction, your words, what it applies to, the agent's version, expiry, the check (conflicts,
  scan, replay), the route sentence, then the controls. On open, focus goes to the heading.
  `teach-reading-order` · runtime
- **The text summary is complete.** The panel exposes a plain-text summary (see *Responsive
  behaviour*): id and version, stage or standing, agent, direction, the agent's version of the
  lesson, every condition in the grammar's full readback with `markTrust` (so each value an
  outsider or an agent could have set names who), who taught and approved it, expiry, and the record
  or the route. It is the `summary` size, the narrow fallback and the Ledger line.
  `teach-text-summary-complete` · runtime
- **Every response has a state.** Translating, checking, saving and sending each have pending,
  failed and newer-version states. A failure names the host's message and offers a retry; the
  person's words are never lost. `teach-every-response-has-state` · runtime
- **Fits its container.** At 280 px the panel renders its text summary with "Open lesson"; at 320 the
  stacked layout; at 480 the side-by-side layout with the replay as a Table. No horizontal scroll at
  any width. Tested on the shared container-width harness. `teach-container-width` · browser
- **The UI is not the boundary.** The panel shows the route. The host enforces the same route on
  its server: it refuses a lenient lesson without a second person, a blocked lesson, and a
  self-approval, whatever the client sends. It runs every replay with the agent applying the exact
  restatement named by `forTranslationVersion`, and it emits the automatic events `lessonStanding`
  calls for (expired, suspended, expiry notice). A lesson's conditions that arrive untyped (a stored
  draft, an agent's suggestion) go through `validateQuery` against the same `Fields`, and anything
  that is not one `and` group of positive conditions is refused, never repaired.
  `teach-host-enforces-route` · convention
- **The agent translates from the person, not from the case.** The host builds the agent's
  version of the lesson from the person's words and the conditions only. It does not hand the
  translator the case's untrusted items, so an instruction hidden in an email cannot ride into
  memory inside a lesson. `teach-translate-from-person` · convention
- **An applied lesson is cited.** Whenever the agent applies a lesson, the host lists it among the
  verdict's evidence as a `memory` item with the lesson's id and version (see *Changes this makes
  to other specs*), so the Verdict Card and the Evidence Locker can say so, and the lesson's record
  can count it. `teach-applied-lesson-cited` · convention

**Proof plan:** 4 compiler (4 fixtures), 18 runtime (18 unit tests; `lessonDirection`,
`lessonDirections`, `lessonRoute`, `lessonStanding` and `lessonQueueItem` each tested once, with one
case per table row), 1 browser (on the shared container-width harness), 3 convention — 26 rules, 23 with proofs.

## Changes this makes to other specs

Applied in this same change to `evidence-locker.md` and `verdict-card.md`. Both are additions, not
breaking changes.

1. **Evidence Locker.** A `memory` item may carry `lesson: { id: string; version: number; href?:
   string }`. An item with `lesson` requires `trust: "agent-output"`, with `writtenBy` naming the
   agent ("Triage agent 2.4, from A. Rao's lesson"), so `weakWorldClaims` treats a claim resting
   only on a lesson as weak. Its label: "From the agent's memory — lesson ls_31 v3, taught by A. Rao
   on 29 Oct, approved by S. Iyer". New rule `locker-lesson-is-agent-output` · compiler, so the
   Locker has 20 rules, 17 with proofs.
2. **Verdict Card.** A new optional `onTeach?: (e: DecisionEvent) => void`, offered as "Teach the
   agent" in the Overridden and Agreed-with-lean states only, never before a decision. When
   `evidence.items` holds a memory item with `lesson`, the card prints one line under the
   rationale: "The agent says it applied lesson ls_31 (v3): *text*." — the agent's citation, not a
   check. New rule `verdict-lesson-named` · runtime, so the Verdict Card has 29 rules, 23 with
   proofs.

No change to the Gate: a verdict a lesson shaped still counts in the agent's own record, keyed by
version and model, and also in the lesson's record. No change to the Approval Queue, the Action
Impact Card or the Ladder: the lesson uses them as they are.

## Token bindings

| Part | Token |
|---|---|
| Panel surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4`, padding `--vela-space-15`, block gap `--vela-space-10` |
| Heading ("Teach Triage agent 2.4" / "Lesson ls_31 · version 3") | `--vela-text-heading`, H5; version and id `--vela-text-de-emphasized`, Meta |
| The override it came from | `--vela-text-default`, Body; who and when `--vela-text-de-emphasized`, Meta |
| Direction sentence | `--vela-text-heading`, Body — SemiBold for lenient, Regular for stricter. No colour. When intent and effect differ, both on one line, the effect in SemiBold |
| Your words (Text Area) | Text Area's own tokens; label `--vela-text-default`, Body |
| Condition row | field (its `label`) and operator (the grammar's operator words) `--vela-text-default`, Body; value `--vela-text-default`, Body, SemiBold; trust label, from the field's declared `trust`, `--vela-text-de-emphasized`, Meta |
| Untrusted value | the Evidence Locker's quote block: `--vela-bg-raised`, start border `--vela-border-default` at `--vela-stroke-2`, `--vela-font-family-mono` at Meta size |
| The agent's version | `--vela-bg-raised`, border `--vela-border-subtle`, padding `--vela-space-10`, `--vela-text-default`, Body; "Out of date" `--vela-text-heading`, Meta, SemiBold |
| Check lines | `--vela-text-default`, Body; counts in SemiBold; window and coverage `--vela-text-de-emphasized`, Meta |
| Conflict, scan flag, block | **Contextual Alert** (core): `warning` for a block, `info` for a scan flag that only routes. Never `major` or `critical`: nothing has failed |
| Route sentence | `--vela-text-heading`, Body, SemiBold |
| Save / Send for approval | Button `regular`, `variant="primary" appearance="filled"` — the one filled primary on the panel |
| Keep the override only, Close | Button `regular`, `variant="standard" appearance="hollow"` |
| Record | `--vela-text-default`, Body; overturned count SemiBold |
| Times, ids | `--vela-text-de-emphasized`, Meta |

**New tokens needed:** none. **PAIRS:** none new. **Icons:** none. Direction is words.

## Sizes

| Size | Use |
|---|---|
| `panel` | The full panel, in a side panel or its own page. |
| `summary` | The text summary as one row, for a list of an agent's lessons in a Table. Opens the panel. |

## States

| State | What renders |
|---|---|
| Draft, not checked | Direction; words; conditions; "The agent's version: not asked yet" with "Ask the agent"; "Not checked yet" with Check. Route: blocked — not checked. "Keep the override only" always offered. |
| Translating | The agent's version region `aria-busy="true"`: "Asking Triage agent 2.4 since 09:14 UTC". The words stay editable. |
| Translation failed | "The agent could not restate this lesson: *message*." Retry. Route blocked. |
| Out of date | After an edit: the agent's version struck through and labelled "Out of date — ask the agent again"; the check "Check again". |
| Checked, blocked | The route sentence lists every reason. Example: "Not saved. A lenient lesson may not overrule settled cases: 3 verdicts confirmed Malicious on review would have become Benign — CS-4102 (M. Iyer), CS-4117 (A. Rao), CS-4151 (S. Iyer). Narrow the lesson, or correct those cases first if they were settled wrongly." |
| Checked, second person | "Needs a second person: this lesson is lenient. Send it to the Approval Queue; a security lead decides." "Send for approval". |
| Checked, save | "Stricter, scan clear, replayed, no conflicts. You can save it." Save. |
| Meant stricter, acts lenient | Direction line: "You meant this to be stricter, but the agent's version would have let 2 cases through." The route follows the lenient rules. |
| Not replayed, lenient | "Needs a second person. Not replayed: the second person approves without seeing what it would have changed. Life capped at 30 days (default)." |
| Saving / sending | Controls `aria-busy`; content stays. |
| Save failed | Inline under the controls: "Not saved: *message*." Retry; words kept. |
| Newer version | "The lesson changed while you were reading." Newer version renders; words kept. |
| Awaiting approval | "Sent for approval at 09:20 UTC — waiting for a security lead." Link to the Queue item. The teacher may withdraw, with a reason. Nothing is in use yet. |
| In use | Standing line "In use since 29 Oct"; the agent's version; conditions; the record; expiry; Retire (or "Send for approval to retire"), Check again, Renew. |
| Should be suspended | First line, from `lessonStanding`: "Should be suspended: … The host still marks it in use." The lesson renders as suspended. |
| Suspended | "Suspended on 2 Nov: 1 verdict this lesson changed was overturned by a person." Check again (routes as new), Retire. |
| Suspended, new agent version (lenient) | "Checked against Triage agent 2.4; now running 2.5 — not re-checked." Check again. |
| In use, not re-checked (stricter) | "Checked against Triage agent 2.4; now running 2.5 — not re-checked, still applied because it only sends more to people." Check again. |
| In use, expiring soon (stricter) | "Expires in 5 days — renew to keep it. Expiry was approved with the lesson." Renew. |
| Ended | "Retired by S. Iyer on 14 Nov — *reason*" / "Expired on 27 Jan 2027" / "Declined by S. Iyer — *reason*" / "Withdrawn by A. Rao — *reason*". The lesson and its record stay readable. After a retire: "Send the *n* verdicts it changed back for review", *n* from the record's `applied`. |
| No permission | "You can read this lesson. *teachWith*." No controls. |

**The worked example, in order.** A. Rao overrides Suspicious → Benign on CS-4180 and opens the
panel. The direction reads lenient. Her first draft matches on the authenticated sender domain and
the subject. The check replays it over 30 days: 14 verdicts changed, 3 of them against settled
cases — invoice fraud sent from a genuine but compromised Northwind mailbox. Blocked. She adds the
condition "Payment account on the vendor list is yes", a system record. The agent restates the
lesson; the second check changes 11 verdicts, all Suspicious → Benign: 9 match, 0 against, 2 never
reviewed. The route is "second person". She sends it; S. Iyer approves it in the Approval Queue.

## Responsive behaviour

**Minimum width: 320px.** Below it, the text summary. **Full layout from: 480px.**

The panel sizes against its container (`@container`). Widths are provisional until breakpoint
tokens land.

| Container width | Layout |
|---|---|
| ≥ 480 | "Your words" and "The agent's version" side by side; conditions as rows; the replay's `changed` rows and the record as a **Table** (`density="compact"`) under the sentence. |
| 320–479 (minimum for the panel) | One column, the reading order above; the replay as its sentence and a list. |
| < 320 | **Text summary** plus "Open lesson". |

The text summary, exactly (the in-use example):

```
Lesson ls_31 v3 · in use · Triage agent 2.4 · lenient
Agent's version: "When the authenticated sender domain is northwind.example, the subject contains 'Invoice', and the payment account in the email is on the vendor list, treat the email as benign. Check the vendor list on every email; this lesson is not proof that an account is genuine."
Applies to: Authenticated sender domain is "northwind.example", and Subject (could have been set by the email's sender) contains "Invoice", ignoring hidden characters, and Payment account on the vendor list is yes
Taught by A. Rao 29 Oct 2026 09:12 UTC, from Case CS-4180 (Suspicious → Benign) · approved by S. Iyer 29 Oct 2026 09:41 UTC
Expires 27 Jan 2027 (default 90 days)
Record since 29 Oct: applied 0 times
```

The "Applies to" line is the grammar's full readback with `markTrust`, exactly as `readback`
returns it: a field that isn't a system record names who could have set it, and a system record
needs no mark. The panel's condition rows name each system record's `source`. A draft's last line
is its route instead: `Route: blocked — a lenient lesson may not overrule settled
cases (3)`. **Compact density** tightens the block gap to `--vela-space-5`; type does not change.

## Accessibility

- The panel is a `<section aria-label="Teach Triage agent 2.4 — lesson ls_31">`, never `<main>`
  and never a modal Dialog: the person must be able to read the case beside it.
- Each block is a headed group in reading order. The direction is text, not an icon.
- "Your words" is a labelled Text Area: "Your words — what should the agent have noticed?". The
  agent's version is read-only text with its own heading, never an editable field, so nobody edits
  what the agent will store without asking the agent again.
- Conditions are a list; each untrusted value's label is part of its accessible name.
- The route sentence is linked to the control it governs with `aria-describedby`. When a check
  finishes, the route is announced once, politely ("Check finished: needs a second person"). Not a
  live region otherwise.
- Times are `<time datetime>` with the zone in the visible text.
- No colour carries meaning. Both themes are real.

## Built from

- **Text Area** (Phase 1) for the words and every reason; **Combobox** (Phase 1) for choosing a
  condition's field from the host's `Fields`, by label, and its operator from the grammar's positive
  operators for that field's type; **Input** (core) for a value.
- **Button** (core); **Contextual Alert** (core) for conflicts, scan flags and blocks.
- **Popover** (Phase 1) for a conflicting lesson's full text from its conflict line.
- **Table** (core) for the replay rows and the record at ≥ 480.
- **Toast** (Phase 1), optional, to announce a save. Never the only place the result is shown.
- **Evidence Locker** (Phase 2): its quote block and its escapes; and the lesson as a memory item
  once in use. Its Content trust set reaches the panel through the Filter Grammar's `FieldTrust`.
- **Agent Provenance Badge** (Phase 2) wording for the agent in the heading.
- **Calibrated Confidence Gate** (Phase 2): the record's precedence and wording, reused for
  `LessonRecord`.
- **Action Impact Card** and **Approval Queue** (Phase 2), through `lessonQueueItem`, for every
  lesson that needs a second person and every retire of a stricter lesson; the **Autonomy Ladder**'s
  `ceiling` input, set to `person-approves`.
- Opened from the **Verdict Card** (Phase 2), "Teach the agent". Events go to the **Agent Action
  Ledger** (Phase 2, next).
- **Filter Grammar** (core contract, `src/grammar/`, Experimental): `defineFields` and `Fields` for
  the host's fields and their declared trust; `PositiveConjunction<F>` for a lesson's conditions,
  which keeps the AND-only, positive-only limits in the type; `validateQuery` for conditions that
  arrive untyped; `normalise` for the stored form; and `readback` with `markTrust` for every
  sentence that names a condition. This replaced the host's `field` strings and the panel's own
  operator set on 1 Nov 2026, a breaking change to the proposal.

Not buildable before Phase 1's Text Area, Combobox, Popover and Toast exist.

## Figma mapping

Library file: **Vela Design System** → page `Override & Teach Panel`. Three sets and one example
frame.

- `Override & Teach / Panel`: `Stage` (`Draft`, `Awaiting approval`, `In use`, `Suspended`,
  `Ended`) × `Direction` (`Stricter`, `Lenient`) = **10 variants**.
- `Override & Teach / Condition`: `Field trust` (`System record`, `Agent output`, `Untrusted`) =
  **3 variants**, with field (its label), operator (its words) and value as text properties.
- `Override & Teach / Route`: `Route` (`Save`, `Second person`, `Blocked`) × `Replay` (`Run`, `Not
  run`) = **6 variants**. Booleans: `Conflict`, `Scan flag`, `Out of date`, `Intent differs`.
- Example frame `Override & Teach — worked example`: CS-4180 at 1440 wide, the blocked check beside
  the second check.

| Figma property | Code |
|---|---|
| `Stage` | `stage`, or the standing from `lessonStanding` when it differs |
| `Direction` | `lessonDirections(taughtFrom, check).used` |
| `Intent differs` | `intent !== effect`, with `effect` not `not-replayed` |
| `Field trust` | `fields[condition.field].trust.kind`: the field's declared trust, never the condition's |
| `Route` | `lessonRoute(...).route` |
| `Replay` | `check.replay` is a `Replay`, not `{ notRun }` |
| `Conflict` / `Scan flag` / `Out of date` | `check.conflicts.length > 0`; `scan.flags.length > 0`; `check.forDraftVersion !== draft.version` |

No variant colours a direction or a route. Every fill, stroke and text binds a variable.

## Anti-patterns

- ❌ Every override quietly becomes a lesson → teaching is a second, explicit choice; "Keep the override only" stores nothing.
- ❌ Saving the person's words straight into memory → the agent restates them; the person approves the restatement; only that is stored.
- ❌ A lesson with no scope ("Northwind emails are fine") → at least one condition (will not compile).
- ❌ Letting cases through on a display name or a subject → a lenient lesson needs a value an outsider cannot set, matched exactly.
- ❌ "Domain ends with 'northwind.example'" or "contains 'northwind'" as the outsider-proof condition → neither exists on a `domain` field (will not compile): evilnorthwind.example matches both. `is-subdomain-of` is still partial, so `is` or `is-one-of`.
- ❌ A field's label as `field`, or trust written on a condition → a key of the host's `defineFields`; who could have set a value is the field's declared `trust`.
- ❌ A readback the host writes for each lesson → the grammar's `readback` with `markTrust`, so "could have been set by …" is worded in one place.
- ❌ "Sender domain is X **or** subject contains 'Invoice'" → conditions are ANDed; alternatives are separate lessons.
- ❌ Trusting the override's direction alone → the replay of the stored restatement decides too; the more lenient reading is used.
- ❌ Suspending a stricter lesson on a model swap → it stays applied, marked "not re-checked"; stopping it would quietly loosen the agent.
- ❌ "Lesson accuracy 94%" → counts with the window: "would have changed 11; 9 match, 0 against, 2 never reviewed".
- ❌ The teacher approving their own lenient lesson → a second person, through the Approval Queue.
- ❌ A separate approve button inside the panel → one decision surface: the Approval Queue.
- ❌ A lesson that lives for ever → every lesson expires; renewing is a new check.
- ❌ A lenient lesson still in use after a case it changed was overturned → suspended, first line, with why.
- ❌ Lessons carried silently onto a new agent version → "checked against 2.4; now running 2.5 — not re-checked".
- ❌ A lesson cited as proof ("known partner, per lesson") → a lesson is agent-written memory; a world-claim resting on it alone is weak.
- ❌ Green for stricter, red for lenient → words and weight; colour would read as Severity or Risk.
- ❌ Retiring a stricter lesson on one person's say → it makes the agent more lenient; it routes like a lenient lesson.
- ❌ Bulk approve or bulk retire of lessons → one at a time; each has its own replay.
- ❌ Giving the translator the email that prompted the lesson → translate from the person's words and the conditions only.

## Decisions taken in review (29 Oct 2026), confirmed by Omkar (31 Oct 2026)

Answered on 29 Oct 2026 on the repo thread's advice; all six confirmed by Omkar on 31 Oct 2026, as
answered. On question 6 he added: prioritise the Filter Grammar, so `field` stops being a host
string.

1. **Lenient lesson with no replay** — *Second person, with compensating limits:* its life is
   capped at the replay window (30 days by default); it cannot be renewed without a replay; the
   route sentence says "Not replayed: the second person approves without seeing what it would have
   changed". Blocking would push teams without replay to switch the agent off instead.
2. **Suspend on the first overturn** — *Yes, lenient lessons only.* "First" is the only honest
   threshold without a sample; each overturn is in the lesson's record, so a threshold can be set
   later from data.
3. **Lessons in the record key** — *No.* The Gate stays keyed by agent version and model. A verdict
   that cites a lesson counts in both records.
4. **Lessons beyond verdicts** — *Verdicts only for now;* actions and scores after the Ledger, with
   their own direction rules.
5. **Defaults** — *Agreed:* 90 days' life, capped at 365; a 30-day replay; and a 7-day expiry notice
   for stricter lessons. All labelled defaults, in "Assumptions to measure".
6. **`field` as host strings until the Filter Grammar** — *Yes,* with the later breaking change
   flagged now. One refinement: the operator is a closed, positive set already, so AND-only and
   no-negation hold today rather than by host convention.
   **Closed for good, 1 Nov 2026.** The Filter Grammar has merged, and a lesson's conditions are
   its `PositiveConjunction<F>` over the host's `Fields`. `field` is a declared key, never a host
   string, and AND-only and no-negation are held by the grammar's type.

Still open: none for this component.
