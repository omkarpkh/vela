# Awareness Clock

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

Records the moment a named person became aware of something the law makes reportable, and counts
each reporting deadline from the right starting point. Before that moment, the Clock holds three
questions, each answered Yes, No or Not known yet, with evidence, who answered and when. "Report
received" and "first detected" keep their own times; neither starts the clock. Awareness is a
button a named person presses, and the press saves the evidence present at that moment. An agent
may draft reports. Only a person signs and sends them. Time pressure is said in words, never in
the colours of Severity, Risk or Status.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless), for Dialog and Popover.

## Source, and how far this spec goes beyond it

This spec builds on the page **"Aware since when? Who starts the EU's 24-hour clock"**
(`/next/aware-since-when/` on omkarux.com, marked "Work in progress · updated 26 Oct 2026 · notes,
not conclusions"). The page has no screenshots; its mocks are text. Read on 29 Oct 2026. What it
shows, and what this spec takes from it:

- **The Cyber Resilience Act only.** The page covers a manufacturer's duty to report an actively
  exploited vulnerability. Its worked example is a made-up printer maker: a report arrives on Friday
  evening; on Saturday an engineer reproduces the attack on the new model and not the old one; on
  Monday a customer's log shows an attack on Saturday night.
- **Three questions, one decision.** *Is it real? Does it work on our product? Are attackers using
  it?* Each is answered Yes, No or Not known yet, with evidence, who answered and when. Only a Yes to
  the third leads to the "aware" button.
- **"Aware" is a press, not a typed time.** The button reads "I'm reasonably certain this is being
  exploited". A named person presses it — the security lead, in the example. The press saves who
  pressed and the evidence present at that moment. Until it is pressed, the screen shows how long
  the question has been open. The press does not decide what authorities accept.
- **The clock after the press.** 24 hours for the early warning, 72 hours for the fuller report,
  and 14 days for the final report, counted from when a fix or workaround is available.
- **Claim checking.** An AI-written report is split into checkable claims, each marked Reproduced,
  Not reproduced or Not checked. Checked claims are shown above polished prose.
- **Agents draft; people sign.** On the page, an agent may draft a "not affected" statement but
  never sign it.
- **A finding about ENISA's platform.** The platform's counter puts the 72-hour due time 48 hours
  after the early warning, not 72 hours after "aware". The 24-hour count is left to makers' own
  tools.

**What this spec adds beyond the page, labelled as such:** the NIS2 and DORA regimes, and the
CRA's severe-incident duty. The page mentions none of them. For those, the three questions and the
button wording are this spec's proposal, mapped onto each law's own trigger. They are not the page's
findings.

**Out of scope, flagged as a gap:** the page's "not affected" statement — a preview showing the
reason, evidence, affected scanners, recheck date and signer, with one-step withdrawal. It is its
own component, a **Not-Affected Statement** (VEX), not specced yet. The Clock links to it for any
product answered No.

## Intent

A security lead should be able to answer five questions from the Clock. When did we receive this,
first see it, and become aware of it — three times, kept apart? What did we know at the moment we
said "aware", and who said it? What is due, by when, and counted from what? What has been sent,
drafted or signed, and by whom? And does the authority's platform agree with the law about when
each report is due?

What it answers — each deadline as published, read on 29 Oct 2026:

| Regime | Article | Report | Deadline, as published | Counted from |
|---|---|---|---|---|
| **CRA** — actively exploited vulnerability | Regulation (EU) 2024/2847, Art. 14(2)(a) | Early warning | "without undue delay and in any event within 24 hours" | "the manufacturer becoming aware of it" |
| | Art. 14(2)(b) | Vulnerability notification | "without undue delay and in any event within 72 hours" | the manufacturer becoming aware |
| | Art. 14(2)(c) | Final report | "no later than 14 days after a corrective or mitigating measure is available" | a corrective or mitigating measure being available |
| **CRA** — severe incident | Art. 14(4)(a) | Early warning | within 24 hours | the manufacturer becoming aware |
| | Art. 14(4)(b) | Incident notification | within 72 hours | the manufacturer becoming aware |
| | Art. 14(4)(c) | Final report | "within one month after the submission of the incident notification" | submission of the 14(4)(b) notification |
| | Art. 71(2) | — | Art. 14 applies "from 11 September 2026" | — |
| **NIS2** — significant incident | Directive (EU) 2022/2555, Art. 23(4)(a) | Early warning | "without undue delay and in any event within 24 hours" | "becoming aware of the significant incident" |
| | Art. 23(4)(b) | Incident notification | "without undue delay and in any event within 72 hours" | becoming aware |
| | Art. 23(4)(c) | Intermediate report | "upon the request of a CSIRT or … the competent authority" | the request |
| | Art. 23(4)(d) | Final report | "not later than one month after the submission of the incident notification" | submission of the 23(4)(b) notification |
| | Art. 23(4)(e) | Progress report, then final | if ongoing at the final report: a progress report then, and a final report "within one month of their handling of the incident" | the incident being handled |
| **DORA** — major ICT-related incident | Regulation (EU) 2022/2554, Art. 19(4) | Initial, intermediate, final | Art. 19 sets no hours; they are laid down under Art. 20 | — |
| | Delegated Regulation (EU) 2025/301, Art. 5(1)(a) | Initial notification | "within four hours from the classification", and "no later than 24 hours from the moment the financial entity has become aware" | classification as major; and awareness |
| | Art. 5(2) | Initial notification, late classification | four hours from classification, when classified after the 24-hour mark | classification |
| | Art. 5(1)(b) | Intermediate report | "at the latest within 72 hours from the submission of the initial notification" | submission of the initial notification |
| | Art. 5(1)(b) | Updated intermediate report | "without undue delay, and in any case when the regular activities have been recovered" | regular activities being recovered |
| | Art. 5(1)(c) | Final report | no later than one month after the latest updated intermediate report | the latest updated intermediate report |
| | Art. 5(3) | Delay notice | an entity unable to meet a time limit informs the competent authority "no later than the respective time limits", with the reasons | each time limit it cannot meet |
| | Art. 5(4)–(6) | Weekend or bank holiday | may submit by noon of the next working day; not for the initial or intermediate report of credit institutions, central counterparties, trading venue operators, or entities that are essential or important under NIS2 (5(5)); a competent authority may also disapply it for significant or systemic entities (5(6)) | — |

Sources were read in the published text. CRA articles via `european-cyber-resilience-act.com`, NIS2
via `nis-2-directive.com` and DORA Art. 19 via `digital-operational-resilience-act.com`, each
reproducing the Official Journal article by article; EUR-Lex returned only the recitals.
Delegated Regulation 2025/301 was read on EUR-Lex: OJ L 2025/301, 20 Feb 2025.

- [CRA Article 14](https://www.european-cyber-resilience-act.com/Cyber_Resilience_Act_Article_14.html)
- [CRA Article 71](https://www.european-cyber-resilience-act.com/Cyber_Resilience_Act_Article_71.html)
- [NIS2 Article 23](https://www.nis-2-directive.com/NIS_2_Directive_Article_23.html)
- [DORA Article 19](https://www.digital-operational-resilience-act.com/Article_19.html)
- [Delegated Regulation (EU) 2025/301 on EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32025R0301)
- [ENISA Single Reporting Platform FAQ](https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp/frequently-asked-questions)
- [Aware since when? (omkarux.com)](https://omkarux.com/next/aware-since-when/)

**Every limit is an outer limit.** All three laws say "without undue delay" (DORA: "as early as
possible") before the hours. The hours are the latest moment, not the target. The Clock words each
deadline that way — "without undue delay; at the latest Tue 09:20 UTC" — and never says "due" as if
the time before it were free.

**How time is counted.** Hours are counted in absolute time, as UTC instants, never in local
wall-clock time. The worked example crosses the EU clock change on Sun 25 Oct 2026; a clock that
counted local hours would be an hour wrong after it. Regulation (EEC, Euratom) No 1182/71, Article 3,
read on 29 Oct 2026 (via legislation.gov.uk's copy; paragraphs 1–5 carry no UK amendment; EUR-Lex
returned only metadata), sets general rules on periods:

- the hour, or day, in which the event happens is not counted (3(1));
- a period in hours starts at the beginning of the first hour and ends at the expiry of the last
  hour (3(2)(a));
- a period in months ends with the last hour of the same date in the last month, or of that month's
  last day when the date does not exist (3(2)(c));
- a period not in hours that ends on a public holiday, Saturday or Sunday runs to the end of the
  next working day (3(4)).

Every one of those readings is **later** than a plain count, and whether 1182/71 applies to each law
here is a legal question this spec does not settle. So **the Clock's default is the earliest
reading**: the anchor's instant plus exactly 24 or 72 hours, or 14 × 24 hours. One month is the same
date and time in the next month, or that month's last day at the same time when the date does not
exist (anchor 31 Jan 10:00 → 28 Feb 10:00, or 29 Feb in a leap year). A later reading — 1182/71's,
or DORA's weekend rule — is applied only when the host's legal owner confirms it, and then the Clock
shows both times.

What else it answers:

- **ENISA, CRA Single Reporting Platform FAQ** (read 29 Oct 2026). FAQ 26: the platform's
  "72-hour counter displays a due date/time 48hrs after submission of the 24-hour Early Warning",
  so a notification "may be displayed as overdue before 72 hours have elapsed". ENISA plans to count
  from the "Date/Time when you became aware". FAQ 15: "no Application Programming Interface (API)
  will be provided at the initial release". The Clock shows the law's due time and the platform's
  side by side, whenever they differ.
- **European Commission CRA guidance** (draft, non-binding; cited on the page). Awareness means "a
  reasonable degree of certainty" after a first check. That is why the press is a person's judgment,
  worded as one, and why it is never derived from a timestamp.
- **EU AI Act, Art. 14(4)(d), and OWASP ASI09.** A person must be able to decide; an AI-written
  report must not decide for them. Agents draft and propose answers; only a named person answers,
  presses and signs.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** No vendor shows a NIS2 or DORA
  awareness clock on the incident.

Limits: the Clock records and counts. It does not decide whether something is reportable, what
counts as "significant", "severe" or "major", or what an authority will accept. NIS2 is a directive:
national laws transpose it and may set stricter terms, so a host confirms its jurisdiction's
deadlines. GDPR's 72-hour personal-data breach notice (Art. 33) is not covered. "One month" is a
calendar month, computed from the date and time of its anchor.

## When to use Awareness Clock

- A vulnerability or incident that may be reportable under the CRA, NIS2 or DORA → **Awareness
  Clock**, one per regime that applies. A case under several regimes shows several, earliest
  deadline first.
- The conclusion about a case → **Verdict Card**. An agent's verdict can be evidence for a question
  here; it is never the answer.
- What the evidence is and who could have written it → **Evidence Locker**. The Clock's answers and
  its press cite Locker items.
- Telling customers a product is not affected → a **Not-Affected Statement**, **not in the kit**.
  Flag the gap.
- A deadline with no legal anchor (an internal SLA) → the Approval Queue's fail-closed timer, or the
  host's own. The Clock is for deadlines the law sets.

## Props

```tsx
<AwarenessClock
  caseRef={{ id: "CS-4133", label: "Case CS-4133 — printer remote takeover" }}
  regime="cra-vulnerability"
  subjects={[{ id: "p-new", label: "Printer, 2026 model" }, { id: "p-old", label: "Printer, 2022 model" }]}
  receivedAt="2026-10-23T18:30:00Z"
  firstDetectedAt="2026-10-24T22:10:00Z"
  answers={answers}
  press={{ kind: "aware", by: { person: "M. Iyer, Security lead" }, at: "2026-10-26T09:20:00Z",
           snapshotId: "snap_7f3a", evidence: snapshot }}
  reports={[
    { kind: "early-warning", status: "sent", draftedBy: draftingAgentProvenance,
      signedBy: { person: "M. Iyer, Security lead" }, signedAt: "2026-10-26T10:02:00Z", sentAt: "2026-10-26T10:05:00Z" },
    { kind: "vulnerability-notification", status: "draft", draftedBy: draftingAgentProvenance },
  ]}
  platformDue={[{ report: "vulnerability-notification", latestBy: "2026-10-28T10:05:00Z",
                  platform: "ENISA Single Reporting Platform", basis: "48 hours after the early warning (FAQ 26)" }]}
  reportClaims={claims}
  canPress={{ person: "M. Iyer, Security lead" }}
  onAnswer={answer}
  onPress={press}
  onSign={sign}
  onCorrect={correct}
  timeZone="UTC"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `caseRef` | `{ id: string; label: string }` | — | **Required.** The case this clock belongs to. |
| `regime` | `Regime` | — | **Required. These four only.** One clock, one regime. |
| `subjects` | `[Subject, ...Subject[]]` | — | **Required.** The products, services or functions the second question is asked about. |
| `receivedAt` | ISO 8601 | — | **Required.** When the report reached the organisation. Never starts the clock. |
| `firstDetectedAt` | ISO 8601 | — | When anyone first detected it. Never starts the clock. |
| `answers` | `AnswerRecord[]` | `[]` | Every answer given, append-only. The latest per question (and per subject for question 2) is current. |
| `press` | `Press` | — | **Not DORA.** The awareness press. Absent until a person presses. |
| `presses` | `{ aware?: Press; classified?: Press }` | — | **DORA only.** The two presses. A `classified` press with no earlier `aware` press also records awareness at the same instant, so the 24-hour cap is never lost. |
| `reports` | `Report[]` | `[]` | Drafts and submissions, each with its kind and status. |
| `fixAvailableAt` | ISO 8601 | — | CRA vulnerability only: when a corrective or mitigating measure became available. Starts the 14 days. |
| `handledAt` | ISO 8601 | — | NIS2 only: when an ongoing incident was handled. Starts its one-month final report. |
| `intermediateRequestedAt` | ISO 8601 | — | NIS2 only: when the CSIRT or authority asked for an intermediate report. |
| `recoveredAt` | ISO 8601 | — | DORA only: when regular activities were recovered. The updated intermediate report is due without undue delay, and in any case then. |
| `platformDue` | `PlatformDue[]` | `[]` | The times the reporting platform shows, with its basis, when they may differ from the law's. |
| `extension` | `{ report: ReportKind; until: string; basis: string; confirmedBy: string }` | — | A later time the host's legal owner has confirmed applies, e.g. DORA Art. 5(4) — after checking 5(5) and 5(6), since a competent authority may switch it off. Earliest times are shown unless this is passed. |
| `counting` | `"earliest" \| { rule: "reg-1182-71"; confirmedBy: string }` | `"earliest"` | How periods are counted. `earliest`: the anchor's instant plus the period. The 1182/71 reading only when the legal owner confirms it; the Clock then shows both. |
| `reportClaims` | `ReportClaim[]` | `[]` | An incoming report split into checkable claims, for question 1. |
| `canPress` | `{ person: string } \| false` | — | **Required.** Who may answer, press and sign, or nobody here. |
| `pressWith` | `string` | — | When `canPress` is false: who can ("Ask the security lead"). |
| `onAnswer`, `onPress`, `onSign`, `onCorrect` | handlers | — | Required when `canPress` is a person. Identity is stamped by the host from the session; events carry no `by`. |
| `timeZone` | IANA zone name | the viewer's zone | Every instant is printed with its zone. |

```ts
type Regime = "cra-vulnerability" | "cra-incident" | "nis2" | "dora"
type Answer = "yes" | "no" | "not-known-yet"
type ClaimCheck = "reproduced" | "not-reproduced" | "not-checked"
type Subject = { id: string; label: string }

type QuestionId = "q1" | "q2" | "q3"            // the regime fixes their wording (below)

type AnswerRecord = {
  question: QuestionId
  subjectId?: string                             // required for q2, forbidden otherwise
  answer: Answer
  by: { person: string }                         // a named person; never an agent
  at: string
  evidence: [EvidenceItem, ...EvidenceItem[]] | { none: string }   // Evidence Locker items, or why there are none
  note?: string
  proposedBy?: Provenance                        // an agent that suggested this answer; the person still gave it
}

type Press<K extends "aware" | "classified" = "aware"> = {
  kind: K
  by: { person: string }                         // no agent variant exists
  at: string
  snapshotId: string                             // issued by the host when the press is saved; the Ledger and audit log cite it
  evidence: PressSnapshot                        // the answers and evidence present at that moment, frozen
  correction?: { reason: string; at: string; by: { person: string } }   // appended; the original stays
}
type PressSnapshot = { answers: AnswerRecord[]; capturedAt: string }

// The props are a union on `regime`: DORA has two presses; the others have one.
type AwarenessClockProps = Common & (
  | { regime: "cra-vulnerability" | "cra-incident" | "nis2"; press?: Press<"aware">; presses?: never; recoveredAt?: never }
  | { regime: "dora"; presses?: { aware?: Press<"aware">; classified?: Press<"classified"> }; press?: never; recoveredAt?: string }
)

type ReportKind =
  | "early-warning" | "vulnerability-notification" | "incident-notification"
  | "intermediate-report" | "progress-report" | "final-report"
  | "initial-notification" | "updated-intermediate-report" | "delay-notice"   // DORA only

type Report =
  | { kind: ReportKind; status: "draft"; draftedBy: Provenance | { person: string }; signedBy?: never; sentAt?: never }
  | { kind: ReportKind; status: "signed"; draftedBy?: Provenance | { person: string }; signedBy: { person: string }; signedAt: string; sentAt?: never }
  | { kind: ReportKind; status: "sent"; draftedBy?: Provenance | { person: string }; signedBy: { person: string }; signedAt: string; sentAt: string; reference?: string }

type PlatformDue = { report: ReportKind; latestBy: string; platform: string; basis: string }
type ReportClaim = { text: string; check: ClaimCheck; by?: { person: string }; at?: string; evidence?: EvidenceItem[] }

type Deadline = {
  regime: Regime
  report: ReportKind
  latestBy: string | { pending: string }         // the outer limit, a UTC instant; or what would start it
  laterReading?: { latestBy: string; basis: string; confirmedBy: string }   // 1182/71 or an extension, when confirmed
  anchor: string                                  // in words: "72 h from aware"
  basis: string                                   // the article: "CRA Art. 14(2)(b)"
  status: "open" | "met" | "overdue" | "not-required"
  sentAfterAnchor?: string                        // for "met": "45 min after aware"
}
export function clockDeadlines(
  props: AwarenessClockProps, counting?: AwarenessClockProps["counting"],
): Deadline[]

// Every deadline of several clocks for one case, overdue first, then by `latestBy`. Each keeps its regime and article.
export function caseDeadlines(clocks: AwarenessClockProps[]): Deadline[]
```

### The questions, by regime

Each regime fixes its three questions. The third is the one whose Yes is the awareness press.

| Regime | Q1 | Q2 (per subject) | Q3 — its Yes is the press | Press label | Source |
|---|---|---|---|---|---|
| `cra-vulnerability` | Is it real? | Does it work on our product? | Are attackers using it? | "I'm reasonably certain this is being exploited" | the "Aware since when?" page |
| `cra-incident` | Did an incident happen? | Does it affect the security of our product? | Is it severe, as Art. 14(5) defines it? | "I'm reasonably certain a severe incident has happened" | this spec's proposal |
| `nis2` | Did an incident happen? | Does it affect a service we provide? | Is it significant, as Art. 23(3) defines it? | "I'm reasonably certain this is a significant incident" | this spec's proposal |
| `dora` | Is this an ICT-related incident? — **its Yes is the `aware` press** | Does it affect our services or critical functions? | Is it major, under the classification criteria? — **its Yes is the `classified` press** | "I'm aware of this ICT-related incident" · "Classified as major" | this spec's proposal |

DORA has two presses because its regulation has two starting points: the 24-hour cap runs from
awareness, and the four hours run from classification. NIS2's and the CRA incident's trigger words
("significant", "severe") are the law's; deciding them stays with the person, and the Clock says so.

### New closed sets

| Set | Values | Means |
|---|---|---|
| **Regime** (4) | `cra-vulnerability` · `cra-incident` · `nis2` · `dora` | which law's clock this is |
| **Answer** (3) | `yes` · `no` · `not-known-yet` | a person's answer to one question, at one time |
| **Claim check** (3) | `reproduced` · `not-reproduced` · `not-checked` | whether a claim in an incoming report was tested |

None carries colour or tokens. None crosses Severity, Risk, Status or another set. A Yes is not
"high", and an overdue report is not a "critical" event.

### Time pressure is said in words

Time pressure is its own fact, like confidence. The Clock states it in words, weight and order:

| Situation | Words | Treatment |
|---|---|---|
| Before the press | "Open for 2 d 14 h since the report arrived (Fri 18:30 UTC)" | Regular; never a countdown — the law's clock has not started |
| Running | "Early warning: without undue delay; at the latest Tue 09:20 UTC · 21 h left" | the latest time in SemiBold |
| Under an hour left | "Early warning: without undue delay; at the latest Tue 09:20 UTC · 40 min left" | the same — no change of colour; the line moves to the top |
| Overdue | "Overdue by 2 h — the early warning's latest time was Tue 09:20 UTC" | `--vela-text-heading`, SemiBold; first in the list; stays until sent |
| Met | "Early warning sent Mon 10:05 UTC — 45 min after aware" | de-emphasised, below open deadlines. Time from the anchor to sending, never how early it was against the limit |
| Pending anchor | "Final report: at the latest 14 days after a fix is available — no fix yet" | Regular, with what would start it |

On a **SOC wall display**, the Clock shows its text summary (as the Verdict Card does), in the wall
layout: an overdue line one type step larger, and a heavier container border while anything is
overdue. Still no colour.

**Why no colour.** The colour tests in DESIGN.md ask what a colour adds that words cannot. Here,
order (overdue first, then earliest limit) and words ("Overdue by 2 h") carry everything. A red would
read as Severity's `critical`, and an amber as Status's `warning`. Both claim something about the
incident that the clock does not know. A green "Met" would read as Status's `healthy`. So: no
colour, no ring, no progress bar, no ticking seconds.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Four regimes, three answers, three claim checks.** Each accepts only its set. There is no
  `"gdpr"` regime yet, no `"maybe"` answer and no `"verified"` claim check.
  `clock-closed-sets` · compiler
- **An answer is a person's, with its evidence.** `AnswerRecord` requires `by.person` and `at`, and
  `evidence` as Locker items or `{ none }` with why. An agent can appear only as `proposedBy`; there
  is no agent answer. `subjectId` is required for `q2` and forbidden otherwise.
  `clock-answer-is-a-persons` · compiler
- **Only a person presses, and only DORA has two presses.** `Press.by` is `{ person }`; no agent
  variant exists. The props are a union on `regime`: `dora` takes `presses` (`aware`, `classified`),
  and every other regime takes one `press`. A `classified` press outside DORA does not compile.
  `clock-press-by-person` · compiler
- **A report is signed by a person before it is sent.** A `sent` or `signed` report requires
  `signedBy.person`. A `draft` forbids `signedBy`. An agent can only be `draftedBy`. The kinds
  `initial-notification`, `updated-intermediate-report` and `delay-notice` are accepted only for
  DORA. `clock-report-signed-by-person` · compiler
- **There is no "aware time" prop.** Awareness exists only as a `Press` record. A host cannot pass a
  typed `awareAt`, and `receivedAt` and `firstDetectedAt` never start a deadline.
  `clock-aware-is-a-press` · compiler
- **Deadlines are computed once, from their anchors, in UTC, at the earliest reading.**
  `clockDeadlines(props, counting)` is pure and returns every report the regime requires, with its
  outer limit, its anchor in words and its article. `caseDeadlines(clocks)` merges several clocks
  for one case. Both are tested once:
  - one case per row of the regulation table;
  - a period that crosses a clock change, which must land on the same UTC instant a plain count gives;
  - a month from 31 Jan (ends 28 Feb, or 29 Feb in a leap year);
  - DORA's initial notification: the earlier of four hours from classification and 24 hours from
    awareness, or four hours from classification when that comes after the 24-hour mark;
  - DORA's final report counted from the latest updated intermediate report.

  The earliest reading is returned unless `counting` or an `extension` carries a confirmed later
  one, which is returned beside it as `laterReading`. `clock-deadlines-computed` · runtime
- **Every deadline is an outer limit and names what it counts from.** Each reads "without undue
  delay; at the latest *time*" (DORA's initial notification: "as early as possible; at the latest
  *time*"), followed by its anchor and article: "72 h from aware", "4 h from classification", "1
  month from the incident notification sent Thu 08:40 UTC", "14 days from a fix being available — no
  fix yet". A time is never shown without its anchor and its article. A met deadline shows the time
  from its anchor to sending ("sent 45 min after aware"). `clock-anchor-named` · runtime
- **Before the press, the age shows, not a countdown.** Until the press, the Clock shows how long the
  question has been open, since `receivedAt` and since `firstDetectedAt`, each labelled. It never
  shows a countdown that has not legally started. It never hides the age either: a question left
  open for days is visible as such. `clock-open-age-not-countdown` · runtime
- **The press is the trigger question's Yes, and it freezes the evidence.** The press button is
  offered when `canPress` names a person. Pressing records the regime's trigger question as Yes, by
  that person, and saves a `PressSnapshot` of every current answer and its evidence. The host issues
  a `snapshotId` when it saves the press. The id is shown in the press record and the text summary,
  so the Agent Action Ledger and the host's audit log point to the same frozen record. Later answers
  never change the snapshot. Q1 and Q2 may still be "Not known yet"; the press is never withheld for
  that, because withholding it would delay the law's clock. `clock-press-freezes-evidence` · runtime
- **The platform's time is shown beside the law's when they differ.** For each `platformDue` that
  differs from the computed limit: "By law: at the latest Thu 09:20 UTC (72 h from aware, CRA Art.
  14(2)(b)). ENISA Single Reporting Platform shows: Wed 10:05 UTC (48 hours after the early warning,
  FAQ 26). Meet the earlier." `clock-platform-due-shown` · runtime
- **Overdue first, then the earliest limit — and a late team can say so in time.** Deadlines are
  listed overdue first, then by `latestBy`, then pending, then met. An overdue line says by how much
  and stays until the report is sent. For DORA, every open deadline offers "Tell the authority this
  will be late". That drafts a `delay-notice` (Art. 5(3)), signed like any report and due no later
  than the limit it concerns, so "Overdue" is not the only state a late team sees. No delay notice
  is offered for the CRA or NIS2: none appears in the articles read. Each report that turns overdue
  while open is announced once, politely, on its own. `clock-overdue-first` · runtime
- **A press made in error is corrected, never erased.** `onCorrect` appends a correction with a
  reason. The original press, its time and its snapshot stay visible, with "Corrected by *person* at
  *time*: *reason*". Deadlines computed from it are shown struck through, with the correction
  beside them, not removed. `clock-correction-appends` · runtime
- **Drafts say who drafted them, and that they are not sent.** A report drafted by an agent shows
  the **Agent Provenance Badge** and "Draft — not sent until a person signs". Sign opens a Dialog
  listing what will be sent, to which authority, under whose name, and — with the badge again — which
  agent drafted it. An agent's suggested answer shows as "Suggested by *agent*: Yes — *evidence*",
  beside the question, never in the answer slot. `clock-draft-labelled` · runtime
- **Checked claims rank above prose.** In question 1, `reportClaims` are listed with their check —
  Reproduced, Not reproduced, Not checked — and who checked. Checked claims come first. The
  report's own text sits below them, in the Evidence Locker's untrusted quote block, because an
  incoming report is untrusted content. `clock-report-claims-checked` · runtime
- **The text summary is complete.** The Clock exposes a plain-text summary carrying the regime, the
  three times (received, first detected, aware), who pressed and the `snapshotId`, each deadline as
  an outer limit with its anchor and status, any later reading confirmed, and any platform
  difference. `clock-text-summary-complete` · runtime
- **Every state is designed.** Before any answer, partly answered, pressed, every deadline open,
  met, overdue or pending, correction, no permission ("You can view this clock. *pressWith*"), and
  failure to save an answer, press or signature (with Retry, the draft kept) each have a designed
  state. `clock-every-state-designed` · runtime
- **Below its minimum width the Clock degrades to text.** It never clips.
  `clock-degrades-below-minimum` · browser
- **No colour for time.** Deadlines carry no Severity, Risk or Status token, no red or amber, no ring
  or progress bar, and nothing ticks by the second. Order, words and weight carry urgency.
  `clock-no-colour` · convention
- **The press records; it does not decide; a limit is not a target.** Label it "Recorded as aware by
  *person* at *time*", never "Compliant", "Reported" or "Accepted". Never "due" alone for an outer
  limit, and never praise sending early against the limit; show time from the anchor instead.
  Sending is a separate, signed act, and what the authority accepts is the authority's.
  `clock-labels-claim-only-data` · convention
- **National law is confirmed by the host.** For NIS2, the Clock ships the directive's own limits. A
  host whose national law is stricter passes that as the regime's terms. A host that has not
  confirmed its jurisdiction shows "NIS2 limits as in the Directive; national law not confirmed".
  `clock-national-law-confirmed` · convention

**Proof plan:** 5 compiler (5 fixtures), 11 runtime (11 unit tests; `clockDeadlines` tested once,
with one case per regulation row), 1 browser (on the shared container-width harness), 3 convention —
20 rules, 17 with proofs.

## Token bindings

| Part | Token |
|---|---|
| Clock surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4`, padding `--vela-space-15`, block gap `--vela-space-10` |
| Heading (regime and case) | `--vela-text-heading`, H5 |
| The three times (received, first detected, aware) | labels `--vela-text-de-emphasized`, Meta; times `--vela-text-default`, Body |
| Question | `--vela-text-default`, Body, SemiBold |
| Answer word (Yes / No / Not known yet) | `--vela-text-default`, Body, SemiBold; who and when `--vela-text-de-emphasized`, Meta |
| Agent suggestion | `--vela-text-de-emphasized`, Body, with the Provenance Badge |
| Press button | Button `regular`, `variant="primary" appearance="filled"`, the one filled primary on the Clock |
| Press record | `--vela-text-heading`, Body, SemiBold ("Recorded as aware by M. Iyer at Mon 09:20 UTC") |
| Deadline, open | "without undue delay; at the latest" Regular, the time SemiBold `--vela-text-default`; anchor and article `--vela-text-de-emphasized`, Meta |
| Wall layout (text summary) | the overdue line one type step larger; container border at `--vela-stroke-2` while anything is overdue |
| Deadline, overdue | `--vela-text-heading`, SemiBold — first in the list |
| Deadline, met | `--vela-text-de-emphasized`, Body |
| Platform difference | `--vela-text-default`, Body, beside the law's line; "Meet the earlier." in SemiBold |
| Correction | original struck through, `--vela-text-de-emphasized`; correction `--vela-text-default` |
| Report claims | Table (core): claim, check, who |
| Incoming report text | the Evidence Locker's untrusted quote block |

**New tokens needed:** none. **PAIRS:** none new. **Icons:** none. Time is words.

## Sizes

None. The container decides the layout. A case with several regimes stacks one Clock per regime,
earliest next deadline first.

## States

| State | What renders |
|---|---|
| Not started | The three questions with no answers; "Open for 2 d 14 h since the report arrived"; the press button when `canPress` is a person. |
| Partly answered | Each answer with who, when and evidence; unanswered questions say "Not answered yet". Q2 shows one row per subject. |
| Not known yet | "Not known yet — M. Iyer, Sat 15:05 UTC", with what would settle it if given. |
| Pressed | "Recorded as aware by M. Iyer, Security lead, at Mon 26 Oct 09:20 UTC · record snap_7f3a"; the snapshot is reachable ("What was known at 09:20"); the deadlines list starts. |
| DORA, aware not classified | "If classified major: initial notification as early as possible; at the latest Tue 09:20 UTC (24 h from aware)"; the classify button. |
| DORA, classified | Initial notification at the latest at the earlier of 4 h from classification and the 24-hour cap, with both shown. |
| DORA, classified without aware | The classification press also records awareness at the same instant; the record says so. |
| DORA, recovered | "Updated intermediate report: without undue delay; regular activities recovered Wed 14:00 UTC (Art. 5(1)(b))". The final report counts from the latest updated intermediate report. |
| DORA, delay notice | "Delay notice drafted — must reach the authority no later than Tue 09:20 UTC (Art. 5(3))"; Sign. |
| Deadline running | "Early warning: without undue delay; at the latest Tue 09:20 UTC · 21 h left — 24 h from aware, CRA Art. 14(2)(a)". |
| Overdue | First line: "Overdue by 2 h — the early warning's latest time was Tue 09:20 UTC". |
| Later reading confirmed | "At the latest Tue 09:20 UTC (24 h from aware). Under Reg. 1182/71 as confirmed by Legal: Tue 10:00 UTC." Both shown; the earlier first. |
| Platform differs | Both lines, and "Meet the earlier." |
| Pending anchor | "Final report: 14 days after a fix is available — no fix yet." |
| Draft by agent | The report with the Provenance Badge and "Draft — not sent until a person signs"; Sign. |
| Signed, not sent | "Signed by M. Iyer at 10:05 UTC — not sent yet"; Send. |
| Sent | "Sent Mon 26 Oct 10:05 UTC, reference *ref* — 45 min after aware." |
| Extension applied | "At the latest Sat 31 Oct 14:00 UTC; by noon Mon 2 Nov under DORA RTS Art. 5(4), confirmed by Legal (5(5) and 5(6) checked)." |
| Correction | The original press struck through with its time and snapshot; the correction and its reason beside it. |
| NIS2, national law not confirmed | "NIS2 limits as in the Directive; national law not confirmed." |
| No permission | "You can view this clock. *pressWith*." No answer, press or sign controls. |
| Save failed | Inline: "Not saved: *message*." Retry; the draft kept. A failed press says the press was **not** recorded. |

Remaining time updates once a minute, without motion. Each report that turns overdue while open is
announced once, politely, on its own: "Early warning is now overdue."

## Responsive behaviour

The Clock sizes against its container (`@container`). Widths are provisional until breakpoint
tokens land.

| Container width | Layout |
|---|---|
| ≥ 720 | Questions and answers on the left; the press and the deadlines on the right, so the time and what is due sit beside what was known. |
| 360–719 | One column: the three times, the deadlines (overdue first), then the questions and answers. |
| < 360 (minimum) | **Text summary** plus an "Open clock" link. |

The text summary, exactly:

```
CRA — actively exploited vulnerability · Case CS-4133
Received Fri 23 Oct 18:30 UTC · first detected Sat 24 Oct 22:10 UTC · aware Mon 26 Oct 09:20 UTC (pressed by M. Iyer, Security lead; record snap_7f3a)
Early warning: sent Mon 26 Oct 10:05 UTC, signed by M. Iyer — 45 min after aware (limit 24 h, Art. 14(2)(a))
Vulnerability notification: without undue delay; at the latest Thu 29 Oct 09:20 UTC (72 h from aware, Art. 14(2)(b)) · ENISA platform shows Wed 28 Oct 10:05 UTC (48 h after the early warning) — meet the earlier · draft by Drafting agent 1.0, not sent
Final report: at the latest 14 days after a fix is available — no fix yet (Art. 14(2)(c))
```

## Accessibility

- The Clock is a `<section aria-label="Awareness clock — CRA, Case CS-4133">`, never `<main>`.
- Questions are headed groups; each answer's word is text, not an icon.
- The press button's accessible name is its full label ("I'm reasonably certain this is being
  exploited"). Before it records, a Dialog states who is pressing, at what time, and that the
  evidence present now will be saved.
- Deadlines are a list in their display order, so a screen-reader user hears the overdue one first.
  Times are `<time datetime>` with the zone in the visible text.
- Remaining time is not a live region. A deadline turning overdue is announced once, politely.
- No colour carries meaning. Both themes are real.

## Built from

- **Button** (core); **Dialog** (Phase 1) to confirm the press and the signature; **Popover**
  (Phase 1) for the press snapshot from the text view.
- `clockDeadlines` and `caseDeadlines`, pure exports; the **case deadlines page pattern** stacks one
  Clock per regime under a single list from `caseDeadlines`, earliest limit across laws first, each
  line keeping its regime and article — DORA's four hours can fall well before NIS2's 24.
- **Radio Group** (Phase 1) for Yes / No / Not known yet; **Text Area** (Phase 1) for notes and
  correction reasons.
- **Table** (core) for report claims.
- **Evidence Locker** (Phase 2): answers and the press cite its items, and the incoming report's
  text uses its untrusted quote block.
- **Agent Provenance Badge** (Phase 2) for agent drafts and agent suggestions.
- Later: a **Not-Affected Statement** (VEX) component, not in the kit, which the Clock links to for
  any subject answered No to question 2.

## Figma mapping

Library file: **Vela Design System** → page `Awareness Clock`. Three sets.

- `Awareness Clock / Question`: `Answer` (`None`, `Yes`, `No`, `Not known yet`) × `Suggested`
  (`No`, `Yes`) = **8 variants**, with the question and evidence as text properties.
- `Awareness Clock / Deadline`: `Status` (`Open`, `Overdue`, `Met`, `Pending`, `Not required`) ×
  `Platform differs` (`No`, `Yes`) = **10 variants**.
- `Awareness Clock / Press`: `State` (`Not pressed`, `Pressed`, `Corrected`) × `Kind` (`Aware`,
  `Classified`) = **6 variants**. `Classified` is used only in DORA frames.

| Figma property | Code |
|---|---|
| `Answer` | the latest `AnswerRecord.answer`, or none |
| `Suggested` | an agent `proposedBy` on the open question |
| `Status` | `clockDeadlines(...)[n].status`, `Pending` for `{ pending }` |
| `Platform differs` | a `platformDue` for that report differs from `latestBy` |
| `State`, `Kind` | `press`, `press.correction`, `press.kind` |

No variant carries a colour per status. Every fill, stroke and text binds a variable.

## Anti-patterns

- ❌ A typed "aware at" field → awareness is a named person's press, which saves the evidence (will not compile).
- ❌ Starting the clock from "report received" or "first detected" → they keep their own times; neither starts it.
- ❌ A red countdown ring → words, weight and order; red would read as Severity.
- ❌ A countdown before the press → show how long the question has been open, not a deadline that has not started.
- ❌ An agent pressing "aware" or signing a report → agents draft and suggest; people answer, press and sign (will not compile).
- ❌ Withholding the press until every question is Yes → the trigger question's Yes is enough; Q1 and Q2 may be "Not known yet".
- ❌ Showing only the platform's time → show the law's beside it; meet the earlier.
- ❌ "Due Tue 09:20" → "without undue delay; at the latest Tue 09:20"; the hours are the outer limit.
- ❌ "Sent 23 h before it was due" → "sent 45 min after aware"; praise speed from the anchor, not slack against the limit.
- ❌ Counting hours in local wall-clock time → count UTC instants; a clock change must not move a limit.
- ❌ Applying Reg. 1182/71's later reading by default → earliest reading unless the legal owner confirms.
- ❌ Only "Overdue" for a DORA team that knows it will be late → offer the Art. 5(3) delay notice before the limit.
- ❌ "Compliant" after the press → "Recorded as aware by … at …"; acceptance is the authority's.
- ❌ Applying a weekend extension by default → strict times unless an extension with its basis is confirmed.
- ❌ Deleting a press made in error → append a correction; the original stays.
- ❌ An AI-written report shown as plain prose above its checked claims → checked claims first; the report text in an untrusted block.

## Decisions taken in review (29 Oct 2026)

1. **NIS2, DORA and CRA-incident questions** — they stay labelled as this spec's proposal, not the
   page's findings. They were shared with the page as information, not as a gate.
2. **Wall display** — yes, colour-free: the text summary's wall layout, with the overdue line one
   type step larger and a heavier border.
3. **GDPR** — later. Its "where feasible" 72 hours with reasons for delay is a different shape. It
   stays in Limits, and becomes a fifth regime after these four are built.
4. **Several regimes** — `caseDeadlines(clocks)` and a page pattern, not a new component.
5. **Not-Affected Statement** — not next. It joins the Phase 2 list after the Hand-off card.
