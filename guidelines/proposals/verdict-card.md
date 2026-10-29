# Verdict Card

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

A read-and-decide card for one agent verdict on one case. It says what the agent concluded, how
sure it is and why, what it read and when, what it could not see, and whether the case has moved
on since. It carries the human decision on that verdict — Accept, Override, Undo — and records it.
It changes nothing on its own.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless)

> **Changed 29 Oct 2026 — breaking.** With the [Calibrated Confidence Gate](calibrated-confidence-gate.md),
> `confidence` is a full `ConfidenceReading` instead of a band word, the Confidence band taxonomy
> moves to the Gate, and Accept follows the band the Gate allows (`gateBand`), not the band the
> agent states.

## Intent

An analyst should be able to answer six questions from the card without opening anything else:
where is the answer, when was it made, has the case moved on, which severity counts, can I check
it, and what happens when I act. These come from the public verdict-card study on omkarux.com
(the page at `/verdict-card/`) and its eight rules. This spec generalises that widget into a Vela
component and keeps its limit: no analyst testing yet (n = 0), so every rule here is a claim to
test, not a measured result.

What it answers:

- **EU AI Act, Article 14 (human oversight).** The overseer must be able to interpret the output,
  decide not to use it, override it and reverse it. The card renders the rationale and the inputs
  (interpret), withholds Accept when the verdict is stale or weak (decide not to use), requires a
  reason for Override (override) and keeps Undo on the card (reverse). Stopping an agent is the
  Stop control's job, not this card's.
- **OWASP Agentic Top 10, ASI09 (human-agent trust exploitation).** Accept is never the easy path
  past a weak verdict: it is withheld at low or unrated confidence, for an inconclusive result and
  while the verdict is outdated. **ASI10 (rogue agents / audit).** Every decision is emitted as an
  event naming the person, the verdict version and the agent, for the Agent Action Ledger.
- **Microsoft Taxonomy of Failure Modes v2.0 (Jun 2026).** Human-in-the-loop bypass was the most
  exploited failure. The card states what Accept and Override do in each system from the host's
  own effect description, never from the agent's summary of itself.
- **Rajhans 2025 (n = 24).** Confidence shown alone gets a glance and little inspection.
  Confidence with a rationale gives the best calibration. So the card never renders confidence
  without the rationale beside it.
- **Li et al., CHI 2025.** Displayed confidence is contagious: users' own confidence aligns to it
  and stays aligned. So confidence is a word, never a percentage, and carries no colour. Caution
  is louder than reassurance: `low` and `unrated` render in SemiBold, `high` in Regular.
- **Romeo & Conti 2026 (review of 35 experiments).** Explanations alone do not cut automation
  bias; cognitive forcing functions do, though users prefer the simpler, worse interface. The card
  uses the mildest forcing that holds: the rationale and the "not seen" list come before the
  decision buttons in reading order, and focus never lands on Accept by default.
- **Rastogi et al., CCS 2025 (n = 248); Alahmadi et al., USENIX Security 2022.** Analysts accept
  lower accuracy when explanations are evidence-backed and relevant, and ignore alarms without
  context or a next step. Every claim on the card says where it can be checked.

Limits: the card shows where a claim can be checked, not whether it holds. It sees one case; it
cannot see a related alert that landed in a different case.

## When to use Verdict Card

- One agent verdict on one case, with a human decision to make → **Verdict Card**.
- A verdict as a value in a table row or a list → the card's **text summary**, not the card.
  A compact verdict chip is **not in the kit**. Flag the gap.
- An agent that wants to *act* (isolate a host, disable a user) → **Action Impact Card** inside
  an **Approval Queue**. A verdict is a conclusion; an action is a change.
- A risk score on an object → **Risk Pill**, or **Score Badge with Explanation** (Phase 2b).
- An event the user must read → **Contextual Alert**.
- Teaching the agent from an override → **Override & Teach panel**, which the card opens.
- Two producers disagreeing on one case → one card per producer, stacked, with one disagreement
  line above both. That arrangement is a page pattern, not part of this component.

## Props

```tsx
<VerdictCard
  verdictId="vd_8f21"
  version={3}
  verdict="malicious"
  confidence={reading}            // a ConfidenceReading: stated band "low", with its record (see the Gate)
  rationale="Two sign-ins from new countries within 9 minutes, then a mailbox rule that forwards invoices externally."
  analysedAt="2026-10-28T08:32:00Z"
  dataCutoff="2026-10-28T08:25:00Z"
  timeZone="UTC"
  examined={[
    { label: "Sign-in events, 7 days", count: 412, checkAt: { label: "Case CS-4133 · Events", leavesCase: false } },
    { label: "Mailbox rules", count: 3, checkAt: { label: "Mail admin console", href: "…", leavesCase: true } },
  ]}
  notSeen={[{ label: "Endpoint telemetry for LT-0912", reason: "Connector offline since 06:10 UTC" }]}
  newerEvidence={{ state: "arrived", items: [{ label: "Alert: impossible travel", at: "2026-10-28T08:40:00Z" }] }}
  severities={[{ owner: "Detection rule", label: "High" }, { owner: "Case", label: "Medium" }]}
  source={{ name: "Triage agent", version: "2.4" }}
  decision={{ state: "none" }}
  history={[]}
  onAccept={accept}
  acceptEffect={{ summary: "Marks the case as confirmed malicious and adds a note to the case wall.", systems: ["This case"], undo: { kind: "available" } }}
  onOverride={override}
  overrideEffect={{ summary: "Records your verdict and reason; the agent's verdict stays in the history.", systems: ["This case"], undo: { kind: "available" } }}
  onUndo={undo}
  onReanalyse={reanalyse}
/>
```

The verdict and its confidence are one discriminated union. A conclusion carries a band; an
inconclusive result carries none:

```ts
type VerdictAndConfidence =
  | { verdict: "malicious" | "suspicious" | "benign"; confidence: ConfidenceReading }   // from the Calibrated Confidence Gate
  | { verdict: "inconclusive"; confidence?: never }
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `verdictId` | `string` | — | **Required.** Stable id of this verdict. |
| `version` | `number` | — | **Required.** Increments on every re-analysis. Every decision carries it. |
| `verdict` | `"malicious" \| "suspicious" \| "benign" \| "inconclusive"` | — | **Required. These four only.** The Verdict taxonomy (below). |
| `confidence` | `ConfidenceReading` | — | **Required for a conclusion; forbidden for `inconclusive`.** The stated band with its record, shown as the inline Calibrated Confidence Gate. The Confidence band taxonomy is owned by the Gate. |
| `rationale` | `string` | — | **Required, non-empty.** The conclusion in full, in the producer's words. For `inconclusive`, why no conclusion was reached. Never truncated on the card. |
| `analysedAt` | ISO 8601 string with offset | — | **Required.** When the producer made this version. |
| `dataCutoff` | ISO 8601 string with offset | — | **Required.** Time of the newest data the producer used. Not the same as `analysedAt`. |
| `timeZone` | IANA zone name | the viewer's zone | Zone the card prints times in. The abbreviation is always printed. A console with a shared clock passes `"UTC"`. |
| `examined` | `[Examined, ...Examined[]]` | — | **Required, at least one.** What the producer read. `{ label, count?, checkAt }`. |
| `notSeen` | `NotSeen[]` | — | **Required; pass `[]` when nothing was missing.** `{ label, reason }`. Absence is an explicit claim, never a default. |
| `newerEvidence` | `{ state: "none" } \| { state: "unchecked" } \| { state: "arrived"; items: { label, at }[] }` | — | **Required.** Whether the case has moved on. `unchecked` means the host cannot tell. |
| `severities` | `{ owner: string; label: string }[]` (0–3) | `[]` | The host's severity ratings, each in its owner's own words. Never mapped onto Vela's Severity taxonomy. |
| `source` | `{ name: string; version: string }` | — | **Required.** Who produced the verdict. Replaced by an **Agent Provenance badge** slot once that spec lands. |
| `decision` | `{ state: "none" } \| { state: "accepted"; by; at; undoUntil? } \| { state: "overridden"; by; at; verdict; reason; sameAsLean: boolean; undoUntil? }` | — | **Required.** The human decision on *this version*. |
| `history` | `Revision[]` | `[]` | Earlier versions and decisions, newest first. `{ version, verdict, confidence?, at, by: "agent" \| "person", name, reason? }`. |
| `onAccept` | `(e: DecisionEvent) => Promise<void>` | — | Omit when the viewer cannot decide. **Requires `acceptEffect`.** |
| `acceptEffect` | `ActionEffect` | — | What Accept does, in words, in each system it touches. |
| `onOverride` | `(e: DecisionEvent & { verdict; reason; sameAsLean }) => Promise<void>` | — | **Requires `overrideEffect`.** |
| `overrideEffect` | `ActionEffect` | — | As above. |
| `onUndo` | `(e: DecisionEvent) => Promise<void>` | — | Shown only while a decision exists and its undo is available. |
| `onReanalyse` | `() => Promise<void>` | — | Optional. Offered beside Override whenever Accept is withheld. |
| `decideWith` | `string` | — | Shown when no decision handlers are passed: who can decide ("Ask a Tier 2 analyst"). |

```ts
type ActionEffect = {
  summary: string                 // the effect, written by the host from the real operation
  systems: string[]               // every system it touches, e.g. ["This case", "Ticketing"]
  undo: { kind: "available"; until?: string } | { kind: "none"; reason: string }
}
type DecisionEvent = { verdictId: string; version: number; at: string }
type Examined = { label: string; count?: number; checkAt: { label: string; href?: string; leavesCase: boolean } }
type NotSeen = { label: string; reason: string }
```

### New taxonomies

Two closed sets are introduced here. They sit beside Severity, Risk and Status and never cross
them. They join the taxonomy table in `DESIGN.md` when this component is built.

| Taxonomy | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Verdict** (4) | `malicious` · `suspicious` · `benign` · `inconclusive` | a producer's or a person's conclusion about a case, or the statement that none was reached | Verdict Card | `--vela-{text,icon}-verdict-*`. Two roles, no background |
| **Confidence band** (4) | `high` · `moderate` · `low` · `unrated` | how sure the producer says it is of a conclusion | **Calibrated Confidence Gate** (was: Verdict Card) | **none.** Confidence has no colour |

Why four verdicts. `suspicious` and `inconclusive` are different claims. "Suspicious" is a
conclusion: worth attention, not confirmed. "Inconclusive" is no conclusion: there was not enough
evidence to judge. A third claim, "malicious at low confidence", is a conclusion the producer
doubts; it is a band, not a verdict. Collapsing any two loses a distinction an analyst acts on.
Shipping vocabulary checked on 28 Oct 2026: Dropzone documents Malicious / Suspicious / Benign /
Inconclusive. Prophet documents benign / malicious / inconclusive. Intezer reports confirmed
threats, false positives and "suspicious or inconclusive" verdicts.

Who owns the bands. The producer's mapping from its score to a band belongs to the host, and the
host documents it. The Calibrated Confidence Gate owns the taxonomy, shows the record beside the
stated band, and decides through `gateBand(reading, now)` which band the card may act on.

`low` and `high` also exist in Risk. A low-confidence verdict is not a low-risk case. Never derive
one from the other.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Four verdicts.** `malicious`, `suspicious`, `benign`, `inconclusive`. There is no
  `"critical"`, no `"high"`, no `"true-positive"`, no `"unknown"`. A Severity, Risk or Status
  value passed as `verdict` does not compile. `verdict-closed-set` · compiler
- **Confidence is a reading, not a number.** The band set and its rule
  (`confidence-band-closed-set`) belong to the Calibrated Confidence Gate; `confidence={0.82}`
  still does not compile there.
- **An inconclusive result has no band.** `verdict="inconclusive"` with any `confidence` does not
  compile, and a conclusion without one does not compile either. `verdict-inconclusive-has-no-band` · compiler
- **One taxonomy per field.** `verdict` takes only Verdict values; `confidence` takes only
  Confidence band values. `verdict-one-taxonomy` · compiler
- **The host's severity is the host's text.** `severities` are rendered as the owner's words with
  the owner's name and never bind `--vela-*-severity-*`. They are strings, so the compiler cannot
  prove this. `verdict-severity-is-hosts-text` · convention
- **Declare what was not seen.** `notSeen` is required. Passing nothing is a compile error.
  Passing `[]` is the claim "nothing was missing", and the card prints it: "Nothing reported
  missing." `verdict-not-seen-required` · compiler
- **Something was examined.** `examined` is a non-empty tuple; `[]` does not compile. `verdict-examined-nonempty` · compiler
- **No action without its effect.** `onAccept` without `acceptEffect`, or `onOverride` without
  `overrideEffect`, does not compile. `verdict-handler-requires-effect` · compiler
- **The effect comes from the operation.** The host writes `acceptEffect` and `overrideEffect`
  from the real operation, never from the agent's description of what it did. `verdict-effect-from-operation` · convention
- **Say when, twice, with the zone.** The card renders `analysedAt` and `dataCutoff` as two
  labelled absolute times in `timeZone`, with the zone abbreviation always printed ("Analysed
  08:32 UTC · data up to 08:25 UTC"), and the date when it is not today in that zone. Relative
  time ("8 min ago") may follow, never replace. `verdict-states-when` · runtime
- **Outdated is derived, not passed.** The card is outdated when any `newerEvidence` item is later
  than `dataCutoff`. There is no `outdated` prop to forget. When outdated, the first line of the
  card says so and names the newest item and its time. `verdict-outdated-derived` · runtime
- **`unchecked` is said aloud.** When the host cannot tell whether the case moved on, the card
  prints "Newer alerts not checked". It never stays silent and never prints "Up to date".
  `verdict-unchecked-not-silent` · runtime
- **Coverage is its own line.** The card prints "Sources read: 2 of 3", derived from `examined`
  and `notSeen`, as a separate fact. Coverage is never folded into the confidence word and never
  shares its line. `verdict-coverage-separate` · runtime
- **Accept is withheld, not disabled,** while the verdict is outdated, for `inconclusive`, and
  when the band the Gate allows — `gateBand(confidence, now).band` — is `low` or `unrated`. That
  includes a stated High that is not yet calibrated: "Not yet calibrated: 6 of 30 High verdicts
  reviewed. To agree, use Override with a reason — each one adds to the record." A new agent
  version or a stale record is named the same way. Accept feeds the record's `confirmedByAccept`;
  Override agreeing with the lean feeds `confirmedOnReview`. The button is not rendered. In its place one sentence gives
  the reason and the routes left (Re-analyse, Override). A disabled button would leave the tab
  order and hide the reason. `verdict-accept-withheld` · runtime
- **No recommendation when the producer is unsure.** At a *stated* `low` or `unrated` the headline is "No
  recommendation", followed by what the producer could not see. The producer's verdict follows as
  "Agent's lean: Malicious", in de-emphasised text, with no verdict icon and no verdict colour.
  For `inconclusive` the headline is "Inconclusive" and there is no lean. `verdict-low-no-recommendation` · runtime
- **Confidence never stands alone.** The confidence word renders in the same block as the
  rationale. It never appears in a header, badge or tooltip of its own, and never as a
  percentage, dots or a bar. `verdict-confidence-with-rationale` · runtime
- **Override needs a reason, including agreement.** Override opens a reason field in the card,
  with all four verdicts offered and none preselected. An empty or whitespace-only reason does not
  submit. Choosing the agent's own lean while Accept is withheld is allowed. It is recorded as
  `sameAsLean: true` ("Agreed with the agent's lean"), so the ledger can count accept-over-warning
  separately from disagreement. `verdict-override-requires-reason` · runtime
- **Decisions bind to a version.** Every event carries `verdictId` and `version`. If the host
  rejects one because a newer version exists, the card keeps the person's draft reason, shows
  "The verdict changed while you were reading", and renders the new version. It never applies a
  decision to a version the person did not see. `verdict-decision-binds-version` · runtime
- **History keeps the earlier conclusion.** A revision adds an entry. It never replaces the
  earlier verdict, its confidence or the override reason that preceded it. `verdict-history-append-only` · runtime
- **Reading order before action.** In DOM and reading order the card runs: freshness line,
  verdict and confidence with rationale, coverage, what was seen, what was not seen, severities,
  then the decision bar. On open, focus goes to the card's heading, never to Accept. `verdict-reading-order` · runtime
- **Undo stays on the card.** Undo is a button on the card for as long as `undo.kind` is
  `available` (until `undoUntil`, when given). A toast may announce a decision, but it is never
  the only place Undo lives. Where `undo.kind` is `none`, the effect line names what cannot be
  undone before the person acts. `verdict-undo-on-card` · runtime
- **The text summary is complete.** The card exposes a plain-text summary (see *Responsive
  behaviour*) carrying the verdict word, confidence word, both times with zone, and freshness. It
  is the narrow-width fallback, the no-widget fallback and the agent serialisation. `verdict-text-summary-complete` · runtime
- **Every response has a state.** Accept, Override, Undo and Re-analyse each have a pending, a
  failed and a conflict state, and the failed state offers a next step (Retry, or who to ask).
  `verdict-every-response-designed` · runtime
- **After a decision the person keeps their place.** The card does not scroll, collapse or
  re-mount. Focus moves to the decision line that replaced the bar. `verdict-keeps-place` · browser
- **Below its minimum width it degrades to text.** It never clips or overflows. `verdict-degrades-below-minimum` · browser
- **The card changes no severity.** It has no prop that sets one and does not choose between the
  host's ratings; it shows each with its owner. `verdict-never-sets-severity` · convention
- **Benign is ink, not green.** `benign` binds the default text colour. A green "safe" signal
  invites acceptance without reading. `verdict-benign-is-ink` · convention
- **Explain every mark.** Every icon on the card has a visible label beside it. The card does not
  reuse a glyph the host already uses for something else, and it does not use Vela's severity
  shapes (circle, triangle, octagon). `verdict-explain-marks` · convention
- **Labels claim only what the data knows.** Write "Read 412 sign-in events from the last 7
  days", not "Checked all activity". A claim that leaves the case says so: "only in the mail
  admin console". `verdict-labels-claim-only-data` · convention

**Proof plan:** 6 compiler (6 fixtures), 14 runtime (14 unit tests naming the rule id), 2 browser
(2 Playwright specs on a container-width harness at 280, 320 and 480 px), 6 convention. 28 rules,
22 with proofs (`confidence-band-closed-set` moved to the Calibrated Confidence Gate).

## Token bindings

| Part | Token |
|---|---|
| Card surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4` |
| Padding / gaps | `--vela-space-15` around, `--vela-space-10` between blocks, `--vela-space-5` inside a block |
| Freshness line (current) | `--vela-text-de-emphasized`, Meta 12/18 |
| Freshness line (outdated) | `--vela-text-heading`, SemiBold, Body; icon `--vela-icon-strong` |
| Verdict word | `--vela-text-verdict-<verdict>`, H5; icon `--vela-icon-verdict-<verdict>` at the regular icon size |
| "No recommendation" headline | `--vela-text-heading`, H5, no icon |
| Agent's lean (low / unrated) | `--vela-text-de-emphasized`, Body, no icon |
| Confidence word | `--vela-text-default`; weight `--vela-font-weight-semibold` at `low`/`unrated`, `--vela-font-weight-regular` otherwise |
| Rationale, coverage, examined, not seen | `--vela-text-default`, Body |
| Counts, times, owners | `--vela-text-de-emphasized`, Meta |
| Check-at links | `--vela-text-link` |
| History entries | `--vela-text-de-emphasized`, Meta; divider `--vela-border-subtle` |
| Decision bar | Button `regular`: Accept `variant="primary" appearance="filled"`; Override `variant="standard" appearance="filled"`; Re-analyse and Undo `variant="primary" appearance="hollow"`. Only one card on a page carries the filled primary. A page listing several verdicts uses the text summary per row and one card for the open case. |

**Icons (Lucide, ISC, from Vela's icon export).** Shields keep verdicts apart from Vela's severity
shapes; each always sits beside its word.

| Mark | Lucide name |
|---|---|
| malicious | `shield-x` |
| suspicious | `shield-alert` |
| benign | `shield-check` |
| inconclusive | `shield-question-mark` |
| outdated | `clock-alert` |

**New tokens needed (semantic):**

| Token | Role | Requirement |
|---|---|---|
| `--vela-text-verdict-malicious` | verdict word | ≥ 4.5:1 on `--vela-bg-container`, both themes |
| `--vela-text-verdict-suspicious` | verdict word | ≥ 4.5:1 on `--vela-bg-container`, both themes. Not amber at 500: that repeats the white-on-amber failure in reverse |
| `--vela-text-verdict-benign` | verdict word | aliases `--vela-text-default` |
| `--vela-text-verdict-inconclusive` | verdict word | aliases `--vela-text-heading` |
| `--vela-icon-verdict-malicious` / `-suspicious` | verdict icon | ≥ 3:1 on `--vela-bg-container`, both themes |
| `--vela-icon-verdict-benign` / `-inconclusive` | verdict icon | alias `--vela-icon-default` |

All eight pairs go into `PAIRS` in `scripts/contrast-core.mjs`. The rows for benign and
inconclusive alias existing semantics, but they are still their own tokens, so every verdict has
a complete row that can be re-pointed. The verdict row may point at the same primitives as a
severity or risk row; it is still its own row and is never bound in their place. There is no
`--vela-bg-verdict-*` and no coloured left rail: a red slab pushes the eye to the verdict before
the reason.

## Sizes

None. The card has one size; its layout follows its container (see *Responsive behaviour*).
Density is a subtree property, not a prop.

## States

| State | What renders |
|---|---|
| Current, awaiting decision | Freshness line "No newer alerts" or "Newer alerts not checked"; full card; decision bar. |
| Outdated | First line: "Outdated — *Alert: impossible travel* joined at 08:40 UTC, after the agent's data (08:25 UTC)." Accept withheld with its reason; Re-analyse and Override offered. |
| Low or unrated confidence | Headline "No recommendation"; the not-seen list next; then "Agent's lean: Malicious". Accept withheld. |
| Inconclusive | Headline "Inconclusive"; the rationale says why; the not-seen list next. No lean. Accept withheld; Re-analyse and Override (labelled "Set verdict") offered. |
| Accepted | Decision line "Accepted by A. Rao at 08:50 UTC" replaces the bar; Undo while available. |
| Overridden | "Overridden to Benign by A. Rao at 08:50 UTC — *reason*". The agent's verdict stays visible beneath. Undo while available. "Teach the agent" opens the Override & Teach panel when the host provides it. |
| Agreed with lean | "Agreed with the agent's lean (Malicious) by A. Rao at 08:50 UTC — *reason*"; Undo while available. |
| Revised | Newest version in full; history shows "Version 2: Suspicious, moderate — overridden to Malicious by A. Rao: *reason*". |
| Re-analysing | Content stays; decision bar `aria-busy="true"`; freshness line "Re-analysing since 08:52 UTC". No skeleton over content the person is reading. |
| Not analysed | "No verdict yet." Re-analyse (labelled "Analyse") if `onReanalyse` is passed; otherwise who to ask. |
| Analysis failed | "Analysis failed at 08:52 UTC: *host message*." Retry, with the last good version beneath, marked as such. |
| Decision failed | Inline under the bar: "Not saved: *host message*." Retry; the reason draft is kept. |
| Version conflict | "The verdict changed while you were reading." New version renders; draft kept. |
| Undo expired | Undo removed; decision line adds "Undo closed at 09:20 UTC". |
| No permission | No decision bar; line "You can view this verdict. *decideWith*." |

Hover and press follow the composed Buttons. Nothing on the card animates except the composed
spinner; a version change re-renders without motion.

## Responsive behaviour

The card is embeddable: it sizes against its container (`@container`), never the viewport.
Breakpoint tokens do not exist yet; the widths below are provisional.

| Container width | Layout |
|---|---|
| ≥ 480 | Two-column meta row (times and coverage left, severities right); decision bar on one line, Accept first. |
| 320–479 | One column. Severities stack under the times. Decision bar wraps; buttons keep their natural width. |
| 280–319 | One column; decision buttons stack full width, Accept last so Override and Re-analyse are not pushed below it. |
| < 280 (minimum) | **Text summary** plus an "Open verdict" link. No chrome. |

The text summary, exactly:

```
Verdict: Malicious · Confidence: Low — no recommendation
Analysed 28 Oct 2026 08:32 UTC · data up to 08:25 UTC · sources read 2 of 3
Outdated: "Alert: impossible travel" joined 08:40 UTC, after the data cut-off
Not seen: Endpoint telemetry for LT-0912 (connector offline since 06:10 UTC)
Severity — Detection rule: High · Case: Medium
```

For `inconclusive` the first line reads `Verdict: Inconclusive`. Lines three to five appear only
when they have content; line three reads "Newer alerts not checked" for `unchecked`. The
rationale is never truncated in the card; in the summary it is omitted, not cut.

**Compact density** tightens block gaps to `--vela-space-5` and padding to `--vela-space-10`; type
size and the 24px minimum target do not change. On a SOC wall display the card is not a fit —
show the text summary.

## Accessibility

- The card is an `<article>` labelled by its heading. The heading reads "Verdict: Malicious, low
  confidence", "No recommendation, low confidence" or "Inconclusive"; when outdated it starts with
  "Outdated:".
- Times are `<time datetime>` with the visible absolute time, zone included, as their text.
- Verdict, confidence, coverage and freshness are all words. Colour and weight are never the only
  signal.
- When the card becomes outdated while open, one polite announcement (`role="status"`) states it.
  Nothing is assertive: a verdict is not an emergency, and the Stop control owns urgency.
- The override reason is a labelled Text Area. An empty-reason error is a message linked by
  `aria-describedby`, not a red border alone.
- After a decision, focus moves to the decision line. Undo's accessible name includes its deadline
  ("Undo accept, until 09:20 UTC").
- Links that leave the case say so in text, not only with an icon.
- The `<article>` accepts an `aria-describedby` from the page, so a disagreement line above two
  stacked cards can describe both.
- Both themes are real.

## Built from

- **Button** (core) for every decision.
- **Text Area** for the override reason; **Radio Group** for the override verdict, four options,
  none preselected.
- **Popover** for a check-at detail when the label is too long to show. Never used for the
  rationale, the not-seen list or the confidence word.
- **Dialog** only to confirm an effect whose `undo.kind` is `none`.
- **Toast**, optional, to announce a saved decision. Never the only Undo.
- **Icon** (Lucide export): the five glyphs above.
- Later slots: an **Agent Provenance badge** replaces `source`. The **Calibrated Confidence Gate**
  (inline size) is the confidence word, with its record; `gateBand` decides Accept. The **Evidence
  Locker** opens from "What the agent read". The **Override & Teach panel** opens from an override.

## Figma mapping

Library file: **Vela Design System** → page `Verdict Card`. Main set: `Verdict` (4) ×
`Confidence` (4) × `Freshness` (`Current`, `Outdated`, `Unchecked`). The `Inconclusive` row has no
confidence axis, so the set is 3 × 4 × 3 + 1 × 3 = **39 variants**. The builder sets
`Confidence = None` on the inconclusive variants and offers no other value there. The decision bar
is its own set on the same page, `Verdict Card / Decision`, with one `State` axis: `Awaiting`,
`Withheld`, `Accepted`, `Overridden`, `Agreed with lean`, `No permission`. It is nested in the main
set as an instance swap.

| Figma property | Code prop |
|---|---|
| `Verdict` | `verdict` |
| `Confidence` | `confidence` (`None` only for `inconclusive`) |
| `Freshness` | derived from `newerEvidence` and `dataCutoff` — `Outdated` only when an item is later than the cut-off |
| `Has not-seen` (boolean) | `notSeen.length > 0` |
| `Has history` (boolean) | `history.length > 0` |
| `Calibrated` (boolean) | `gateBand(confidence, now).band` equals the stated band; `No` drives the withheld bar on a stated High or Moderate |
| `Decision` (instance swap) | `decision.state` (plus `sameAsLean`), and the absence of handlers for `No permission` |
| `Rationale`, `Analysed`, `Data cut-off`, `Coverage` (text) | `rationale`, `analysedAt`, `dataCutoff`, derived coverage |

At `Low`, `Unrated` and `Inconclusive` the main set shows its headline ("No recommendation" or
"Inconclusive") and `Decision` is locked to `Withheld`; the builder enforces it. Every fill,
stroke and text binds a variable; the verdict word binds `verdict/<verdict>/text`.

## Anti-patterns

- ❌ `verdict="critical"`, `verdict="high"`, `verdict="unknown"` → wrong taxonomy. Use `inconclusive` when no conclusion was reached, or a `low` band when one was reached weakly (will not compile).
- ❌ `verdict="inconclusive" confidence="high"` → an inconclusive result has no band (will not compile).
- ❌ "87% confident", confidence dots or a confidence bar → a word only; the number is contagious.
- ❌ "Coverage: 2 of 3" folded into the confidence word → two facts, two lines.
- ❌ A green badge or tint for `benign` → ink; a green "safe" invites acceptance unread.
- ❌ A red background or a coloured left rail on a malicious card → the word and icon carry it.
- ❌ A disabled Accept button with no reason → withhold it and say why in a sentence.
- ❌ Confidence in the header and the rationale behind "Show more" → they sit together.
- ❌ Undo only in a toast → it disappears before the person reads the effect.
- ❌ An `outdated` boolean from the host → derived from `newerEvidence` and `dataCutoff`.
- ❌ Mapping the host's "High" onto `severity="major"` → show it as the host's word, with its owner.
- ❌ Times without a zone ("14:02") → always print the zone.
- ❌ A triangle or octagon as the verdict mark → those are severity shapes.
- ❌ The card in a table cell → use the text summary.
- ❌ `acceptEffect` written from the agent's own summary → the host writes it from the operation.

## Decisions taken in review (28 Oct 2026)

1. **Agent's lean at low confidence** — shown beneath the gap, de-emphasised, with no icon and no
   verdict colour. Hiding it only moves the click.
2. **`suspicious`** — kept, and `inconclusive` added: all three products checked return it.
3. **`moderate`** — kept. The score-to-band mapping is the host's and the host documents it;
   calibration lives in the Confidence Gate. Accept is allowed at `moderate`.
4. **Minimum width 280 px** — kept, provisional; the container-width harness tests it.
5. **Two producers on one case** — one card per producer, stacked, with a single disagreement line
   above both: a page pattern, not part of this component.
