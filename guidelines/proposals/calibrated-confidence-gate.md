# Calibrated Confidence Gate

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

Shows how sure an agent says it is, beside how often that claim has held up, and decides which
confidence band the rest of the kit may act on. The band is a word. The record is counts with its
sample size. The Gate never shows a score, a percentage or a colour. It is called a gate because it
is the one place where the band an agent *states* becomes the band other components *use*: to
withhold Accept on a Verdict Card, or to lower a route on the Autonomy Ladder.

The spec covers one component and two functions, which ship together:

- **`ConfidenceGate`** — the reading for one conclusion or proposal. Two sizes: `inline`, one line
  inside the host's rationale block, and `full`, a panel with the record and what would change the
  conclusion.
- **`gateBand(reading, now)`** — the one pure function that returns the band other components act
  on, and why. It takes `now`, like `resolveRoute`, because a record can go stale.
- **`calibrationStatus(record)`** — the pure function behind it: whether a record is enough to
  trust the stated band.

It takes ownership of the **Confidence band** taxonomy from the Verdict Card.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** none for `inline`; @base-ui/react (optional peer, via /headless) for `full`,
which uses Table primitives and Popover.

## Intent

A person reading a conclusion should be able to answer four questions from the Gate. How sure does
the agent say it is? How often has that claim been right, judged by people, over how many cases?
What would change the conclusion? And is the system acting on the agent's word, or on its record?

What it answers:

- **Li et al., CHI 2025.** Displayed confidence is contagious: users' own confidence aligns to it
  and stays aligned. So the stated confidence is a word with no colour, never a number. The Gate's
  defining rule is that a number is never passed in: the props have no score.
- **Rajhans 2025 (n = 24).** Confidence shown alone gets a glance; confidence with a rationale
  calibrates best. The full Gate carries the rationale, and the inline Gate sits inside the host's
  rationale block.
- **Yin, Wortman Vaughan & Wallach, CHI 2019** ("Understanding the Effect of Accuracy on Trust in
  Machine Learning Models"). In large randomised experiments, trust was shaped by both stated and
  observed accuracy, and the effect of the stated figure changed with the observed one. So the
  Gate never shows the stated band without the observed record beside it, once a record exists.
- **Gigerenzer & Hoffrage, *Psychological Review* 102(4), 1995.** People reason far better from
  natural frequencies ("8 out of 103") than from probabilities: up to about 50% Bayesian answers
  with frequencies, against about 16% with probabilities. So calibration is counts with their
  sample — "118 of 140 confirmed" — never "84%".
- **Romeo & Conti 2026.** Explanations alone do not cut automation bias; forcing functions do. The
  Gate's forcing function is `gateBand`. Until a band has a record, the system treats it as
  `unrated`, so a new agent cannot be accepted or routed on its own say-so.
- **EU AI Act, Article 13(3)(b)(ii).** Instructions for use must state "the level of accuracy,
  including its metrics … which can be expected", and the circumstances that may change it. The
  Gate shows the observed level per band and per scope, at the point of use, with its window.
  **Article 14(4)(b)** — awareness of automation bias — is served by refusing to let a stated band
  stand in for a record.
- **NIST AI RMF, MEASURE 2.8.** Track override statistics: the record counts overturned
  conclusions beside confirmed ones.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** Google shows confidence as a
  score; Dropzone states it in text; CrowdStrike computes a calibrated score but hides it behind an
  operating point. No vendor shows analysts calibration over time.

Limits: the Gate shows a record the host computed and checks that it adds up, is current, and
belongs to the agent version it describes. It does not judge whether a conclusion was right;
"confirmed" means a person confirmed it, not that it was true. A record describes the past, in the
scope given, and is a hint about the next case, not a guarantee.

## When to use Calibrated Confidence Gate

- How sure an agent says it is about one conclusion or proposal, with its record →
  **`ConfidenceGate`**: `inline` inside a Verdict Card or a row; `full` in a side panel or an
  evidence view.
- Which band a component should act on → **`gateBand(reading, now)`**. Never read `reading.band`
  directly to decide anything.
- An agent's record for one *action* (runs, rollbacks, overrides) → the **Autonomy Ladder**'s track
  record. The Gate's record is per stated band; the Ladder's is per action.
- A risk score on an object, with its reasons → **Score Badge with Explanation** (Phase 2b), which
  uses this spec's `CalibrationRecord` for its calibration strip.
- A conclusion with no stated confidence → still the Gate, with band `unrated`; it says so.

## Props

```tsx
<ConfidenceGate
  size="full"
  reading={{
    band: "high",
    producer: { name: "Triage agent", version: "2.4" },
    bandSource: { owner: "Security lead", version: "v3", href: "…" },
    wouldChange: { items: [
      "A sign-in from the user's usual device inside the same 9 minutes",
      "The mailbox rule created by the user's own admin session",
    ] },
    calibration: {
      band: "high",
      producerVersion: "2.4",
      scope: "Phishing verdicts",
      minReviewed: 30,
      windows: [
        { from: "2026-09-29T00:00:00Z", to: "2026-10-28T23:59:00Z", stated: 52,
          confirmedOnReview: 12, confirmedByAccept: 29, overturnedByPerson: 3, overturnedByEvidence: 1, unreviewed: 7 },
        { from: "2026-07-31T00:00:00Z", to: "2026-10-28T23:59:00Z", stated: 140,
          confirmedOnReview: 40, confirmedByAccept: 78, overturnedByPerson: 7, overturnedByEvidence: 2, unreviewed: 13 },
      ],
    },
    otherBands: { moderate: moderateRecord, low: { band: "low", none: "No Low verdicts reviewed yet" } },
  }}
  rationale="Two sign-ins from new countries within 9 minutes, then a mailbox rule that forwards invoices externally."
  showOtherBands
  timeZone="UTC"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `"inline" \| "full"` | — | **Required. These two only.** The props are a union over `size` (below). |
| `reading` | `ConfidenceReading` | — | **Required.** The stated band and everything that qualifies it. |
| `rationale` | `string` | — | **Required at `full`; forbidden at `inline`.** At `inline`, the host's own rationale block holds the Gate. |
| `showOtherBands` | `boolean` | `false` | `full` only. Shows the records in `reading.otherBands` as a table, so a person can see whether the bands order. `gateBand` reads them either way. |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |

```ts
type ConfidenceBand = "high" | "moderate" | "low" | "unrated"
type StatedBand = Exclude<ConfidenceBand, "unrated">

type CalibrationWindow = {
  from: string; to: string                 // ISO 8601
  stated: number                           // conclusions the producer gave at this band in the window
  overturnedByPerson: number               // a person overrode it, denied it or rolled it back
  overturnedByEvidence: number             // later evidence proved it wrong (a detection, a confirmed incident)
  confirmedOnReview: number                // a person confirmed it with Accept withheld or after the fact:
                                           //   Override agreeing with the lean, Queue review, audit, shadow mode
  confirmedByAccept: number                // a person pressed Accept on the card
  unreviewed: number                       // no person has looked yet
}
// Each conclusion is counted once, by precedence:
//   overturned by a person → overturned by evidence → confirmed on review → confirmed by Accept → unreviewed.
// The five counts must add up to `stated`.
// Evidence only overturns. A later absence of detection never counts as confirmation.
// "Reviewed", for the floor, is the three person counts: overturnedByPerson + confirmedOnReview + confirmedByAccept.

type CalibrationRecord<B extends StatedBand = StatedBand> =
  | { band: B; producerVersion: string; compatibleWith?: string[]   // versions the host declares this record covers
      scope: string; minReviewed: number                            // Vela floor: 30; a host may only raise it
      windows: [CalibrationWindow, ...CalibrationWindow[]] }        // latest end first; the first one gates
  | { band: B; none: string }                                       // no history yet, with why
  | { band: B; unavailable: string }                                // could not be loaded

type ConfidenceReading =
  | { [B in StatedBand]: {
        band: B
        producer: { name: string; version: string }
        bandSource: { owner: string; version: string; href?: string }   // who maps scores to bands
        wouldChange: { items: [string, ...string[]] } | { notStated: string }
        calibration: CalibrationRecord<B>
        otherBands: { [O in Exclude<StatedBand, B>]: CalibrationRecord<O> }   // every other band, `{ none }` allowed
        score?: never; percent?: never; probability?: never
      } }[StatedBand]
  | { band: "unrated"
      producer: { name: string; version: string }
      reason: string                                           // why there is no band
      wouldChange: { items: [string, ...string[]] } | { notStated: string }
      calibration?: never; bandSource?: never; otherBands?: never
      score?: never; percent?: never; probability?: never }

type ConfidenceGateProps =
  | { size: "inline"; reading: ConfidenceReading; rationale?: never; showOtherBands?: never; timeZone?: string; clock?: () => Date }
  | { size: "full";   reading: ConfidenceReading; rationale: string; showOtherBands?: boolean; timeZone?: string; clock?: () => Date }

type CalibrationStatus =
  | { status: "calibrated"; reviewed: number }
  | { status: "thin"; reviewed: number; needed: number; floorApplied: boolean }
  | { status: "none"; reason: string }
  | { status: "unavailable"; reason: string }
  | { status: "does-not-add-up" }

type GateReason = "calibrated" | "thin" | "none" | "unavailable" | "does-not-add-up"
  | "new-version" | "stale-record" | "bands-inverted" | "stated-unrated"

export const VELA_MIN_REVIEWED = 30
export const VELA_MAX_RECORD_AGE_DAYS = 30

export function calibrationStatus(record: CalibrationRecord): CalibrationStatus
export function gateBand(reading: ConfidenceReading, now: Date): { band: ConfidenceBand; because: GateReason }
```

**How `gateBand` decides.** It returns the stated band only when the record for that band earns
it. Otherwise it returns `unrated`.

| Condition, checked in this order | Band used | `because` |
|---|---|---|
| Stated band is `unrated` | `unrated` | `stated-unrated` |
| The record does not add up: the five counts do not equal `stated`, a count is negative, or the windows are not ordered latest end first | `unrated` | `does-not-add-up` |
| The record is `{ unavailable }` | `unrated` | `unavailable` |
| The record is `{ none }` | `unrated` | `none` |
| `producerVersion` is not `reading.producer.version`, and that version is not in `compatibleWith` | `unrated` | `new-version` |
| The gating window (`windows[0]`) ended more than 30 days before `now` | `unrated` | `stale-record` |
| In the gating window, the person-reviewed count is below `max(minReviewed, 30)` | `unrated` | `thin` |
| A lower band in `otherBands` is also calibrated, and in a window with the same dates it was confirmed more often per reviewed conclusion | `unrated` | `bands-inverted` |
| Otherwise | the stated band | `calibrated` |

**The floor and the age cap are Vela's.** A host may raise `minReviewed` above 30, never lower it,
and the Gate prints "30 needed (Vela minimum)" when the host asked for less. A host keeps its own
window length, but a gating window that ended more than 30 days ago no longer gates. Both numbers
are assumptions to measure, not findings.

**A new version starts from nothing.** A record belongs to the agent version that earned it.
Version 2.5 does not inherit 2.4's record unless the host declares it compatible, and the Gate
says so in words: "record from 2.4, declared compatible by Security lead". This mirrors the Ladder,
where the system only ever steps down.

**Calibrating before go-live: shadow mode.** There is no opt-out from "uncalibrated means unrated".
The honest way to calibrate faster is to run the agent in **shadow mode** before go-live. People
review its conclusions without acting on them. Those reviews count as `confirmedOnReview` or
`overturnedByPerson` in the agent's version's record, so the agent can go live already calibrated.
A host that skips shadow mode starts with Accept withheld, and people agree through Override with a
reason until the record reaches the floor.

`gateBand` can only lower a band to `unrated`; it never raises one, and never moves `high` to
`moderate`. Lowering to `unrated` is deliberate. It is the band every consumer already treats as
"do not act on this alone", so no consumer needs a new case. The comparison in `bands-inverted` is
computed inside the function and shown in words. No ratio is ever rendered.

### Taxonomy: Confidence band (owner moves here)

| Taxonomy | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Confidence band** (4) | `high` · `moderate` · `low` · `unrated` | how sure the producer of a conclusion says it is | **Calibrated Confidence Gate** (was: Verdict Card) | **none.** Confidence has no colour |

The values do not change. What changes is that a stated band is now a claim with a record, and the
band acted on comes from `gateBand`. The host maps the producer's score to a band and documents the
mapping. The Gate names the mapping's owner and version (`bandSource`), never its thresholds,
because a threshold printed next to a conclusion is a number the reader anchors on.

`low` and `high` also exist in Risk. A low-confidence conclusion is not a low-risk object. Never
derive one from the other.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Four bands.** `high`, `moderate`, `low`, `unrated`. A number is not a band:
  `band={0.82}` does not compile. *(Moved from the Verdict Card; same id.)*
  `confidence-band-closed-set` · compiler
- **No score, ever.** `ConfidenceReading` forbids `score`, `percent` and `probability`. A host
  cannot hand the Gate the number it is built to keep off the screen. `gate-no-score` · compiler
- **An unrated reading has no record and no band source.** `band: "unrated"` forbids `calibration`
  and `bandSource`, and requires `reason`. `gate-unrated-has-no-record` · compiler
- **The record is for the band stated, and every other band has one.** `calibration.band` must equal
  `reading.band`. A High reading with a Moderate record does not compile. A stated reading also
  carries `otherBands`, one record for each other stated band, each matching its band; `{ none }` is
  allowed. So the inversion check cannot be skipped by leaving the other bands out.
  `gate-record-matches-band` · compiler
- **Say what would change it, or that the producer did not.** `wouldChange` is required: a
  non-empty list, or `{ notStated }` with a reason. `gate-would-change-required` · compiler
- **Someone owns the bands.** A stated band requires `bandSource`, with its owner and version.
  `gate-band-source-required` · compiler
- **The full Gate carries the rationale.** `size: "full"` requires `rationale`; `size: "inline"`
  forbids it, because inline sits inside the host's rationale. `gate-full-carries-rationale` · compiler
- **Decisions use `gateBand`.** Every component that withholds, lowers or routes on confidence
  calls `gateBand(reading, now)` and uses its `band`. `reading.band` is for display only. The rule is
  tested once, on the function, with one case per row of the table above.
  `gate-decisions-use-gate-band` · runtime
- **Stated and used are both shown when they differ.** When `gateBand` returns `unrated` for a
  stated band, the Gate shows both: "Agent says High — not yet calibrated: 6 of 30 reviewed. Treated
  as unrated." It never hides the agent's claim, and never shows it as if it were trusted.
  `gate-stated-and-used-shown` · runtime
- **Calibration is counts with their sample and dates.** Every record line, at both sizes, shows the
  window's dates, the number stated and each outcome as a count: "31 Jul – 28 Oct · 140 High · 118
  confirmed (40 on review, 78 by Accept) · 9 overturned (7 by a person, 2 by evidence) · 13
  unreviewed". The rendered output contains no `%`, no decimal fraction, no ratio and no relative
  period ("last 30 days"). The full Gate shows `confirmedOnReview` and `confirmedByAccept` as
  separate counts, and `overturnedByEvidence` as its own count. A reader can see when a record is
  nearly all one-click Accepts, which is how confirmation feeds on itself. Gating uses the totals,
  so nothing new blocks. `gate-calibration-is-counts` · runtime
- **The record adds up.** Each conclusion is counted once, by the precedence in the types. If the
  five counts do not equal `stated`, or the windows are out of order, the Gate shows "Calibration
  counts do not add up — not shown", and `gateBand` returns `unrated`. Evidence only ever overturns:
  there is no "confirmed by evidence" count. `gate-record-adds-up` · runtime
- **The record is current.** A record from another agent version gates as `unrated`, unless the host
  lists that version in `compatibleWith`. A gating window that ended more than 30 days before `now`
  gates as `unrated`. The Gate says which applies: "Record is for 2.4; this is 2.5 — treated as
  unrated" or "Record ends 12 Aug — more than 30 days ago, treated as unrated".
  `gate-record-is-current` · runtime
- **Unreviewed is never confirmed, and the floor is 30.** Unreviewed counts are shown, and never
  folded into confirmed. The floor counts only the three person outcomes, and is
  `max(minReviewed, 30)`. When a host asked for less, the Gate prints "30 needed (Vela minimum)".
  `gate-unreviewed-not-confirmed` · runtime
- **Inverted bands are said in words.** When `otherBands` shows a lower band, also calibrated,
  confirmed more often than this one in a window with the same dates, the Gate says so: "In this
  window, Moderate conclusions were confirmed more often than High ones. High is treated as unrated
  until that changes." `gate-inversion-said` · runtime
- **What would change it is shown.** At `full`, the items are listed under the band; with
  `{ notStated }`, the Gate prints "The agent did not say what would change this: *reason*".
  At `inline`, a count links to the list: "2 things would change this".
  `gate-would-change-shown` · runtime
- **The text summary is complete.** Both sizes expose a plain-text summary carrying the stated band,
  the band used and why, and the gating window's counts. `gate-text-summary-complete` · runtime
- **Below its minimum width the full Gate degrades to text.** It never clips. The inline Gate is
  text and wraps like text. `gate-degrades-below-minimum` · browser
- **Inline sits beside the rationale.** The host places the inline Gate inside the block that holds
  the conclusion's rationale, never in a header, badge or tooltip of its own.
  `gate-inline-beside-rationale` · convention
- **The mapping is the host's, and stays off the screen.** The host maps scores to bands and
  documents it at `bandSource.href`. The Gate names the owner and version only; it never prints a
  threshold, a score, or where a score fell within its band. `gate-mapping-is-hosts` · convention
- **No colour, no meter.** Bands carry no colour: no green-to-red ramp, no dots, no bars, no gauge.
  Caution is louder than reassurance: `low` and `unrated` are SemiBold, `high` and `moderate`
  Regular. `gate-no-colour-no-meter` · convention
- **"Confirmed" means a person confirmed it.** Label it "confirmed by a person", never "correct" or
  "accurate". A record of 118 confirmed does not prove 118 conclusions were true.
  `gate-labels-claim-only-data` · convention

**Proof plan:** 7 compiler (7 fixtures), 9 runtime (9 unit tests; `gate-decisions-use-gate-band`
on `gateBand` and `calibrationStatus`, one case per row of the table), 1 browser (on the shared
container-width harness), 4 convention — 21 rules, 17 with proofs. `confidence-band-closed-set`
moves here from the Verdict Card.

## Changes this makes to other specs

Applied in this same change to `verdict-card.md` and `autonomy-ladder.md`:

- **Verdict Card — breaking change to the proposal.** `confidence` becomes a `ConfidenceReading`
  for a conclusion (still forbidden for `inconclusive`), shown as the inline Gate. Accept follows
  `gateBand(reading, now).band`: it is withheld when the used band is `low` or `unrated`, which
  includes a High that is not yet calibrated. "No recommendation" still follows the stated band.
- **Autonomy Ladder — not breaking.** `RouteInput.confidence` is `gateBand(reading, now).band`,
  never the producer's raw band; the route line can say "not yet calibrated".
- **Score Badge with Explanation** (Phase 2b, not started): its calibration strip uses
  `CalibrationRecord`, shown as counts with dates, version and confirmation source.

## Token bindings

| Part | Token |
|---|---|
| Inline Gate | `--vela-text-default`, Body; band word SemiBold at `low`/`unrated`, Regular otherwise; record and "treated as" in `--vela-text-de-emphasized`, Meta |
| Full Gate surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4`, padding `--vela-space-15`, block gap `--vela-space-10` |
| Heading ("How sure, and how often confirmed") | `--vela-text-heading`, H6 |
| Stated band line | `--vela-text-default`, Body; band word as inline |
| "Treated as unrated" line | `--vela-text-heading`, SemiBold, Body — the reason it differs is the most important line when it appears |
| Rationale, would-change items | `--vela-text-default`, Body |
| Record table | Table primitives; header `--vela-text-heading`, Meta; counts `--vela-text-default`, Body, tabular numerals; the split counts `--vela-text-de-emphasized`, Meta, under their totals; dates and version `--vela-text-de-emphasized`, Meta; rules `--vela-border-subtle` |
| Band source | `--vela-text-de-emphasized`, Meta; link `--vela-text-link` |
| Record warnings (does not add up, inverted) | **Contextual Alert**, `severity="warning"` (core) — an event about the data |

**New tokens needed:** none. **Icons:** none. The band, the record and the reason are words.

## Sizes

| size | Shape | Holds |
|---|---|---|
| `inline` | one line of text, wrapping | stated band; band used and why, when they differ; the gating window's dates and totals; "*n* things would change this" |
| `full` | a panel | everything inline holds, plus the rationale, the would-change list, every window with the split counts, the record's agent version, the other bands when `showOtherBands`, and the band source |

## States

| State | Inline | Full |
|---|---|---|
| Calibrated | "Confidence: High · 29 Sep – 28 Oct: 41 of 52 confirmed, 4 overturned" | Stated band, rationale, would-change list, record table with split counts, record version, band source. |
| Thin | "Confidence: Agent says High — 6 of 30 reviewed, treated as unrated" | As calibrated, with the "treated as unrated" line first and the record shown as it is. |
| No history | "Confidence: Agent says High — no record yet, treated as unrated" | The reason from `{ none }`; no table. |
| New version | "Confidence: Agent says High — record is for 2.4, this is 2.5; treated as unrated" | The same sentence; the 2.4 record is shown, marked "earlier version". |
| Declared compatible | As calibrated, plus "record from 2.4, declared compatible by Security lead" | The same line under the band source. |
| Stale record | "Confidence: Agent says High — record ends 12 Aug, more than 30 days ago; treated as unrated" | The same sentence; the old record is shown with its dates. |
| Floor applied | As thin: "— 22 of 30 reviewed (Vela minimum); treated as unrated" | The same, and the host's lower `minReviewed` is not shown as the target. |
| Record unavailable | "Confidence: Agent says High — record could not be loaded, treated as unrated" | The reason from `{ unavailable }`. |
| Does not add up | "Confidence: Agent says High — record does not add up, treated as unrated" | Contextual Alert (warning); no table. |
| Bands inverted | "Confidence: Agent says High — confirmed less often than Moderate, treated as unrated" | Contextual Alert (warning), and the other bands' table so the inversion can be seen, whether or not `showOtherBands` is set. |
| Unrated | "Confidence: none given — *reason*" | The reason; rationale and would-change list; no record. |
| Would-change not stated | — (the count is omitted) | "The agent did not say what would change this: *reason*." |

Nothing animates. A record that changes while open re-renders without motion.

## Responsive behaviour

The full Gate sizes against its container (`@container`). Widths are provisional until breakpoint
tokens land.

| Container width | Full layout |
|---|---|
| ≥ 480 | Record as a table: windows as rows; stated, confirmed, overturned and unreviewed as columns, with the split counts under each total. |
| 280–479 | Each window as a short stacked block: dates, then the counts as labelled lines, the split counts indented under their totals. |
| < 280 (minimum) | **Text summary.** |

The inline Gate has no minimum width; it is a sentence and wraps like one. The full Gate's text
summary, exactly:

```
Confidence: Agent says High (Triage agent 2.4; bands set by Security lead, v3)
Used as: High — calibrated, 44 reviewed by people of 30 needed; record for 2.4
Phishing verdicts, 29 Sep – 28 Oct 2026: 52 High · 41 confirmed (12 on review, 29 by Accept) · 4 overturned (3 by a person, 1 by evidence) · 7 unreviewed
Phishing verdicts, 31 Jul – 28 Oct 2026: 140 High · 118 confirmed (40 on review, 78 by Accept) · 9 overturned (7 by a person, 2 by evidence) · 13 unreviewed
Would change this: a sign-in from the user's usual device inside the same 9 minutes; the mailbox rule created by the user's own admin session
```

**Compact density** tightens the panel's block gap to `--vela-space-5`; type does not change.

## Accessibility

- The full Gate is a `<section>` labelled by its heading. The record is a real table with a caption
  naming the band and scope, and row and column headers.
- The inline Gate is text inside the host's rationale block. It is not a live region.
- Counts are read as counts: "118 confirmed of 140". No `aria-valuenow`, no `role="meter"`: this is
  a record, not a gauge.
- "Treated as unrated" is plain text in reading order, before the record, so a screen-reader user
  hears why before hearing the numbers.
- The would-change link at `inline` opens the full Gate or a Popover with the list; focus returns to
  the link when it closes.
- Times are `<time datetime>` with the zone in the visible text. No colour carries meaning. Both
  themes are real.

## Built from

- **Table** primitives for the record at `full`.
- **Popover**, optional, for the would-change list from `inline` when there is no room for the full
  Gate.
- **Contextual Alert** (core) for record warnings.
- Placed in: the **Verdict Card** (`inline`, in place of the confidence word), an **Evidence
  Locker** or side panel (`full`), and later the **Score Badge with Explanation** (its strip).
- Feeds: `gateBand(reading, now)` → the Verdict Card's Accept rule and the Autonomy Ladder's
  `RouteInput.confidence`.
- Fed by, through the host, which counts them into `CalibrationWindow`s by the precedence above:
  the Verdict Card's Accept (`confirmedByAccept`) and Override (`confirmedOnReview` when it agrees
  with the lean, `overturnedByPerson` when it does not); the Approval Queue's review decisions;
  shadow-mode reviews before go-live; and later detections that prove a conclusion wrong
  (`overturnedByEvidence`).

## Figma mapping

Library file: **Vela Design System** → page `Confidence Gate`. One set: `Size` (`Inline`, `Full`) ×
`Band` (`High`, `Moderate`, `Low`, `Unrated`) × `Calibration` (`Calibrated`, `Thin`, `None`). The
`Unrated` band has no calibration axis, so the set is (3 × 3 + 1) × 2 = **20 variants**. The builder
sets `Calibration = None` on `Unrated` and offers nothing else there.

| Figma property | Code |
|---|---|
| `Size` | `size` |
| `Band` | `reading.band` (stated) |
| `Calibration` | from `gateBand`'s reason: `Calibrated`; `Thin` (thin, floor applied); `None` (none, unavailable, does-not-add-up, new-version, stale-record, bands-inverted), each with its sentence as a text property |
| `Has would-change` (boolean) | `wouldChange.items` present |
| `Has other bands` (boolean, Full only) | `showOtherBands`, or an inversion is shown |
| `Stated`, `Used as`, `Record` (text) | `reading.band`, `gateBand(...)`, the gating window line |

Every fill, stroke and text binds a variable. No variant carries a colour per band.

## Anti-patterns

- ❌ `score={0.91}`, "91% confident", or a confidence bar → the props forbid a score; the band is a word (will not compile).
- ❌ "84% of High verdicts were right" → "118 of 140 confirmed by a person", with the window and the unreviewed count.
- ❌ Reading `reading.band` to decide Accept or a route → call `gateBand`; the stated band is display only.
- ❌ A fresh agent's "High" accepted on its word → with no record it is treated as unrated until people have reviewed enough.
- ❌ Counting unreviewed conclusions as confirmed → unreviewed is its own count and never meets the floor.
- ❌ `minReviewed: 5` to calibrate faster → the floor is 30; run shadow mode before go-live instead.
- ❌ Carrying 2.4's record into 2.5 silently → a new version starts unrated unless the host declares it compatible.
- ❌ Gating on a window that ended in July → a window more than 30 days old no longer gates.
- ❌ "Confirmed by evidence" because nothing bad happened later → evidence only overturns.
- ❌ "Last 30 days" in a record line → print the window's dates.
- ❌ Leaving `otherBands` out so no inversion can be found → every other band carries a record, `{ none }` allowed.
- ❌ Printing the band thresholds ("High ≥ 0.85") next to the conclusion → name the mapping's owner and version; link to it.
- ❌ A green "High" and a red "Low" → bands carry no colour; caution is SemiBold, not red.
- ❌ The inline Gate in a header badge, away from the rationale → it sits inside the rationale block.
- ❌ Hiding the agent's stated band when it is not trusted → show both: what it said, and what the system uses.
- ❌ "Accurate" or "correct" in a calibration label → "confirmed by a person".

## Decisions taken in review (29 Oct 2026)

1. **Uncalibrated High gates as unrated** — kept, with no opt-out. Shadow mode before go-live is the
   way to calibrate faster.
2. **`minReviewed`** — 30 is a Vela floor; hosts may raise it, never lower it.
3. **Inverted bands** — lowered to unrated, only when both bands are calibrated, compared in windows
   with the same dates. Every other band's record is required, `{ none }` allowed.
4. **Gating window** — its age is capped at 30 days; its length is the host's. The gating window is
   the most recent one, and its dates are always printed.
5. **Machine outcomes** — later evidence counts as `overturnedByEvidence`, in its own column. It
   only ever overturns, never confirms.
