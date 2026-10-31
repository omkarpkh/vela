# Evidence Locker

> **Proposal — not built.** This spec is pressure-tested but has no code, no tests and no Figma
> set. Nothing named here exists in `@omkarux/vela` yet. Do not generate it as if it did; see
> `guidelines/proposals/README.md`.

Everything an agent used to reach one conclusion, as it was when the agent used it. Each item says
how it reached the agent — a tool call it made, content it was handed, or its own memory — and
whether its content can be trusted, as two separate facts. Content that an outsider could have
written, such as an email body, is shown as inert, quoted text. It never renders as markup or a
live link, hidden characters in it are made visible, and it is never presented as if it were a
finding. A claim about the world that the agent cites only such content for is flagged. The full Calibrated Confidence Gate sits beside the evidence.

**Status:** Experimental — specced, not yet built or tested; no Figma set.
**Dependencies:** @base-ui/react (optional peer, via /headless), for Popover and the full Gate's
dependencies. Table is core.

## Intent

A person checking a conclusion should be able to answer five questions from the Locker. What did
the agent read, and what was it simply handed? Which of it could an attacker have written? Which
claims rest on what? What could the agent not see? And is this what the agent saw then, or what the
record says now?

What it answers:

- **OWASP Agentic Top 10 (Dec 2025), ASI01, Agent Goal Hijack.** An agent's goal can be redirected
  by instructions hidden in content it processes, such as an email, a document or a web page. The
  Locker makes that content visible as content: labelled with who could have written it, shown as
  inert text, and kept apart from the tool results the conclusion should rest on. **ASI06, Memory &
  Context Poisoning:** items from the agent's memory are their own channel, with who wrote them and
  when. **ASI10, Rogue Agents:** every tool-call item carries its call id for the Agent Action
  Ledger.
- **Greshake et al., 2023** ("Not what you've signed up for", arXiv 2302.12173). Adversaries can
  exploit LLM-integrated applications "by strategically injecting prompts into data likely to be
  retrieved"; such applications "blur the line between data and instructions". The Locker's job is
  to redraw that line for the person reading.
- **Hines et al., 2024** ("Defending Against Indirect Prompt Injection Attacks With Spotlighting",
  Microsoft, arXiv 2403.14720). Transforming input to give "a reliable and continuous signal of its
  provenance" cut attack success from over 50% to under 2% on GPT-family models. That signal
  protects the model. The Locker gives the same continuous signal to the person: every untrusted
  item is marked, everywhere it appears, not just once at the top.
- **EU AI Act, Article 13(1) and 14(4)(c).** Deployers must be able to "interpret a system's
  output", and overseers to "correctly interpret" it. The Locker is where interpretation happens:
  each claim tied to the items behind it, and each item to where it can be checked.
- **Rastogi et al., CCS 2025 (n = 248); Alahmadi et al., USENIX Security 2022.** Analysts trust
  evidence-backed, relevant explanations, and ignore alerts without context. The Locker is the
  evidence the Verdict Card's "can I check it?" points to.
- **The security-vendor landscape (13 vendors, read 28 Oct 2026).** Every vendor ships a step trail.
  None separates trusted from untrusted inputs in what it shows the analyst.
- **The verdict-card study** (the page at `/verdict-card/` on omkarux.com), rules 3 and 5: declare
  what you could not see, and make every claim checkable and say where.

Limits: the Locker shows the provenance and trust the host assigned. It does not detect prompt
injection; a host's detector can flag an item, and the flag is shown as the detector's hint. It
shows what the agent read; it cannot show what the agent made of it beyond the claims it stated.

## When to use Evidence Locker

- Everything behind one conclusion, opened from a Verdict Card's "What the agent read" → **Evidence
  Locker**, in a side panel or its own page.
- The conclusion and the decision on it → **Verdict Card**. The Locker has no Accept or Override.
- How sure the agent says it is, and its record → **Calibrated Confidence Gate**, `full`, which the
  Locker places beside the evidence.
- What one proposed change will do → **Action Impact Card**. Its literal operation is a tool call,
  but the impact estimate is not evidence for a conclusion.
- Everything an agent did over time → **Agent Action Ledger**. The Locker is one conclusion's
  inputs, not a history.
- A raw log or event search → the host's own search, linked from an item's `checkAt`.

## Props

```tsx
<EvidenceLocker
  conclusion={{ id: "vd_8f21", version: 3, label: "Verdict: Malicious — Case CS-4133" }}
  items={[
    { id: "ev1", label: "Sign-in events for a.mehta, 7 days", channel: "tool-call",
      call: { tool: "idp.signins.query", callId: "call_91a2", literal: "user = 'a.mehta' and time > now-7d" },
      trust: "system-record", source: "Identity provider",
      retrievedAt: "2026-10-28T08:20:00Z", dataWindow: { from: "2026-10-21T08:20:00Z", to: "2026-10-28T08:20:00Z" },
      content: { kind: "records", caption: "Sign-ins", rows: signinRows, total: 412,
        columns: [{ name: "Time" }, { name: "Country" },
                  { name: "Device", trust: "untrusted", writtenBy: "the user, who names their device" }] },
      checkAt: { label: "Case CS-4133 · Events", leavesCase: false } },
    { id: "ev2", label: "Body of the email 'Invoice overdue — action needed'", channel: "tool-call",
      call: { tool: "mail.messages.get", callId: "call_91a7", literal: "id = 'AAMk…Q'" },
      trust: "untrusted", writtenBy: "the email's sender, billing@northwind-invoices.example",
      source: "Mail", retrievedAt: "2026-10-28T08:21:00Z",
      content: { kind: "text", text: emailBody },
      detector: { name: "Injection screen 1.2", hint: "Contains text that reads as instructions to an AI" },
      checkAt: { label: "Mail admin console", href: "…", leavesCase: true } },
    { id: "ev3", label: "Alert payload that opened the case", channel: "given",
      givenBy: "Detection pipeline", trust: "system-record", source: "Detection rule 'Impossible travel'",
      retrievedAt: "2026-10-28T08:19:00Z", content: { kind: "text", text: alertJson },
      checkAt: { label: "Case CS-4133 · Alert", leavesCase: false } },
  ]}
  claims={[
    { id: "c1", about: "the-world", text: "Two sign-ins from new countries within 9 minutes", supportedBy: ["ev1"] },
    { id: "c2", about: "the-world", text: "The mailbox rule forwards invoices to an outside address", supportedBy: ["ev2"] },
    { id: "c3", about: "the-item", text: "The email asks for payment to a new bank account", supportedBy: ["ev2"] },
  ]}
  notSeen={[{ label: "Endpoint telemetry for LT-0912", reason: "Connector offline since 06:10 UTC" }]}
  confidence={reading}
  rationale="Two sign-ins from new countries within 9 minutes, then a mailbox rule that forwards invoices externally."
  groupBy="claim"
  timeZone="UTC"
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `conclusion` | `{ id: string; version: number; label: string }` | — | **Required.** The conclusion this evidence is for, and its version. The Locker shows the version it belongs to. |
| `items` | `[EvidenceItem, ...EvidenceItem[]]` | — | **Required, at least one.** What the agent used. |
| `claims` | `Claim[] \| { notStated: string }` | — | **Required.** The conclusion's claims, each with the items the agent cites for it, and whether the claim is about an item or about the world. If the producer did not state claims, say so: the Locker cannot then tie claims to evidence, and it prints that. |
| `notSeen` | `NotSeen[]` | — | **Required; `[]` claims nothing was missing.** The same shape as the Verdict Card's. |
| `confidence` | `ConfidenceReading` | — | The reading, shown as the full **Calibrated Confidence Gate** beside the evidence. Omit only for an `inconclusive` result. |
| `rationale` | `string` | — | **Required when `confidence` is passed.** It goes to the full Gate. |
| `groupBy` | `"claim" \| "trust" \| "time"` | `"claim"` | **These three only.** How items are listed. Every grouping shows every item's channel and trust. |
| `timeZone` | IANA zone name | the viewer's zone | The abbreviation is always printed. |

```ts
type ContentTrust = "system-record" | "agent-output" | "untrusted"
type Channel = "tool-call" | "given" | "memory"

type Column =
  | { name: string; trust?: never; writtenBy?: never }
  | { name: string; trust: "untrusted"; writtenBy: string }   // an outsider-set field inside a system record

type NotRetained = { kind: "not-retained"; reason: string }   // the agent read it; the host did not keep it

type EvidenceContent =
  | { kind: "text"; text: string; truncatedAt?: number }          // plain text, rendered inert
  | { kind: "records"; caption: string; columns: [Column, ...Column[]];
      rows: string[][]; total: number }                            // shown with Table; `total` may exceed rows
  | NotRetained

type Common = {
  id: string
  label: string                                   // what it is, in words: "Body of the email 'Invoice overdue…'"
  source: string                                  // the system it came from
  retrievedAt: string                             // when the agent got it (ISO 8601)
  dataWindow?: { from: string; to: string }       // the period the data covers, when it has one
  content: EvidenceContent
  checkAt: { label: string; href?: string; leavesCase: boolean }
  detector?: { name: string; hint: string }       // a host detector's flag, shown as its hint
}

type ByChannel =
  | { channel: "tool-call"; call: { tool: string; callId: string; literal: string }; givenBy?: never; memory?: never }
  | { channel: "given"; givenBy: string; call?: never; memory?: never }   // the host, the pipeline, another agent
  | { channel: "memory"; memory: { writtenBy: string; writtenAt: string; lesson?: never }; call?: never; givenBy?: never }

type ByTrust =
  | { trust: "system-record"; writtenBy?: never; lockerRef?: never }
  | { trust: "agent-output"; writtenBy: string                        // the agent or model: "Enrichment agent 1.1"
      lockerRef?: { conclusionId: string; version: number; href?: string }   // that agent's own Locker
      provenance?: Provenance }                                              // Agent Provenance Badge, when the host has it
  | { trust: "untrusted"; writtenBy: string; lockerRef?: never
      content: { kind: "text"; text: string; truncatedAt?: number } | NotRetained }
    // who outside the trust boundary could have written it: "the email's sender"

// A lesson the agent applied (Override & Teach Panel). Always agent-written: a lesson is guidance,
// not evidence, so a world-claim resting only on it is weak.
type LessonMemory = {
  channel: "memory"
  memory: { writtenBy: string; writtenAt: string; lesson: { id: string; version: number; href?: string } }
  trust: "agent-output"; writtenBy: string        // the agent: "Triage agent 2.4, from A. Rao's lesson"
  call?: never; givenBy?: never; lockerRef?: never
}

type EvidenceItem = Common & ((ByChannel & ByTrust) | LessonMemory)

// `supportedBy` is the agent's citation — which items it says back the claim — not a check.
type Claim =
  | { id: string; text: string; about: "the-world"; supportedBy: [string, ...string[]] }  // a fact about systems or people
  | { id: string; text: string; about: "the-item"; supportedBy: [string] }                // a fact about exactly one item's own content
type NotSeen = { label: string; reason: string }

// The world-claims whose cited items are none of them a `system-record`, with what was cited.
// A cited id that is not in `items` counts as not a system record, so it fails closed.
// The Locker flags these claims; the Verdict Card withholds Accept on them. Tested once, here.
type WeakWorldClaim = {
  claim: Claim & { about: "the-world" }
  cited: { untrusted: number; agentWritten: number; missing: number }   // counts of cited ids, by kind
}
export function weakWorldClaims(
  claims: Claim[] | { notStated: string }, items: EvidenceItem[],
): WeakWorldClaim[]
```

**About the item, or about the world.** A claim about an item states what that item's own content
says: "The email asks for payment to a new bank account". It cites exactly that item, and the
person can read the item verbatim, so it is never weak. A claim about the world states a fact about
systems or people: "The mailbox rule forwards invoices to an outside address". It should rest on a
system record. If none of the items the agent cites for it is a system record, it is weak. A cited
id that is not in `items` counts as not a system record, so a claim that cites only missing items is
weak too: it fails closed.

**Wording a weak claim by what was cited.** Every surface (the Locker's flag and text summary, and
the Verdict Card's coverage line, withheld-Accept sentence and text summary) builds the phrase from
`cited`, naming only the kinds present, in this order:

| `cited` | Phrase |
|---|---|
| untrusted only | "cites only untrusted content (1 item)" |
| agent-written only | "cites only agent-written content (1 item)" |
| untrusted and agent-written | "cites only untrusted and agent-written content (2 items)" |
| missing only | "cites only an item that is not here (1 item)" |
| any kind plus missing | "cites only untrusted content and an item that is not here (2 items)" |

The count is the number of cited ids. No surface says "untrusted" for an agent's summary.

**One wording on every surface.** Each surface builds its sentence from the phrase above, and the
Locker and the Verdict Card use the same sentences, word for word:

| Surface | One weak claim | More than one |
|---|---|---|
| Flag under the claim (Locker) | "This claim about the world *phrase*. Check it against a system record before acting." | one flag per claim |
| Coverage line (Verdict Card) | "· 1 claim about the world *phrase*" | "· *n* claims about the world are weak", each listed beneath with its phrase |
| Withheld Accept (Verdict Card) | "A claim about the world *phrase*: '*claim*'. Check it against a system record, or agree through Override with a reason." | "*n* claims about the world are weak: '*claim*' *phrase*; '*claim*' *phrase*. Check them against a system record, or agree through Override with a reason." |
| Text summary (both) | `Weak claim about the world: "claim" — phrase` | one line per claim |

*Phrase* is the table's phrase with its count, for example "cites only untrusted content (1 item)".
Without this split, nearly every phishing verdict would be flagged, because the email *is* the
evidence, and the flag would become noise.

### New taxonomies

Two closed sets. They sit beside Severity, Risk, Status, Verdict, Confidence band, Reversibility
tier and Autonomy rung, and never cross them.

| Taxonomy | Values | Describes | Owned by | Tokens |
|---|---|---|---|---|
| **Content trust** (3) | `system-record` · `agent-output` · `untrusted` | who could have written an item's content | Evidence Locker | **none.** Words and the quote treatment only |
| **Evidence channel** (3) | `tool-call` · `given` · `memory` | how the item reached the agent | Evidence Locker | **none** |

| Content trust | Means | Label in the Locker |
|---|---|---|
| `system-record` | Produced by a system inside the trust boundary, as structured data: sign-in logs, EDR telemetry, a detection's fields. It says the system recorded it, not that the values are true. | "System record — *source*" |
| `agent-output` | Written by an agent or a model: another agent's summary, an enrichment, a classification. Not first-hand. | "Written by *agent* — not first-hand" |
| `untrusted` | Text whose author is outside the trust boundary, or which an outsider can set: an email body or subject, an attachment, a web page, a chat message, a ticket description, a display name, a user-agent string, a file's contents. It may contain instructions aimed at the agent. | "Untrusted — could have been written by *writtenBy*" |

Trust and channel are independent. A tool call can return untrusted content: the agent fetched an
email, so the body is still the sender's text. Content the agent was handed can be a system record:
the alert payload that opened the case. The Locker never derives one from the other.

## Hard constraints

Rule ids are listed with their proof level; they become `[[rule: … ]]` tags when the spec enters
`guidelines/components/`.

- **Three trust values, three channels.** `trust` and `channel` are required and accept only their
  sets. There is no `"unknown"` trust and no `"trusted"`; a Severity, Risk or Status value does not
  compile. `locker-provenance-closed-sets` · compiler
- **Each channel carries its proof.** `tool-call` requires `call` with the tool, the call id and
  the literal. `given` requires `givenBy`. `memory` requires `memory.writtenBy` and
  `memory.writtenAt`. Each forbids the others' fields. `locker-channel-carries-proof` · compiler
- **A lesson is agent-written memory.** A `memory` item with `memory.lesson` requires
  `trust: "agent-output"` and `writtenBy` naming the agent. A lesson marked `system-record` does not
  compile, so `weakWorldClaims` always treats a world-claim resting only on lessons as weak.
  `locker-lesson-is-agent-output` · compiler
- **Untrusted content is a string.** An `untrusted` item's content is `{ kind: "text" }` (or
  `not-retained`), never records and never a React node or HTML. It also requires `writtenBy`. A
  records column marked `trust: "untrusted"` requires `writtenBy` too. A host cannot pass rendered
  markup from an outsider. `locker-untrusted-is-text` · compiler
- **Declare what was not seen, whether claims were stated, and what each claim is about.**
  `notSeen` and `claims` are required. `[]` and `{ notStated }` are explicit claims, printed as such.
  Every claim requires `about`, and a `the-item` claim cites exactly one item.
  `locker-gaps-required` · compiler
- **Untrusted content is inert, and nothing in it is hidden.** Inside an untrusted item, and in an
  untrusted records column, nothing is live:
  - URLs are text, not links. Every domain is shown, with its punycode form beside it whenever the
    two differ: `nоrthwind-invoices.example (xn--nrthwind-invoices-zco.example)` — the second letter is a Cyrillic о.
  - Bidirectional controls (U+202A–U+202E, U+2066–U+2069) and zero-width characters (U+200B–U+200D,
    U+2060, U+FEFF) are shown as visible escapes, such as `⟨U+202E⟩`, so text reads as it is stored.
  - The item heading counts what was made visible: "3 hidden characters shown · 1 look-alike domain".
  - Markup and markdown are shown as characters. Images and remote resources are never loaded.
  - Long text wraps, and expands in place from its first 40 lines (a labelled default).

  The only action is Copy, and Copy keeps the raw text. The unit test includes a bidi override, a
  zero-width split keyword and a Cyrillic look-alike domain. `locker-untrusted-inert` · runtime
- **Untrusted is marked every time it appears.** Every untrusted item is labelled in words in its
  own heading: "Untrusted — could have been written by the email's sender". The label appears
  wherever the item appears: in each claim it supports, in each grouping, in the text summary. Its
  content sits in a quote block. The signal is continuous, not a one-off notice at the top.
  `locker-untrusted-marked-everywhere` · runtime
- **Weak world-claims are flagged.** The link from a claim to its items is labelled "The agent
  cites:", never "Supported by". Each claim `weakWorldClaims` returns carries a line under it, worded
  by the tables above: "This claim about the world cites only untrusted content (1 item). Check it
  against a system record before acting." A `the-item` claim is never flagged,
  because the item is shown. Any cited id that is not in `items` is also flagged on its own: "The
  agent cites an item that is not here". The unit test includes a claim citing only a missing id
  (weak, and flagged) and one citing a missing id and a system record (not weak, but flagged). An `agent-output` item with
  `lockerRef` offers "Follow to *agent*'s evidence", so a person can reach first-hand records; the
  flag stays until they do. `locker-weak-support-flagged` · runtime
- **This is what the agent saw, then.** Each item shows `retrievedAt` and its `dataWindow` with the
  zone, and its content as the agent received it. A link to the live record is labelled "Open the
  live record — it may have changed since 08:21 UTC". The Locker never refreshes an item to its
  current value. `locker-snapshot-not-live` · runtime
- **Not seen comes first.** The not-seen list renders above the items, in reading order, before any
  evidence: what the agent could not see frames what it did. `locker-not-seen-first` · runtime
- **Memory says who wrote it.** A `memory` item reads "From the agent's memory — written by
  *writtenBy* on *writtenAt*". It is never shown as if the agent had just read it. A lesson reads
  "From the agent's memory — lesson *id* v*version*, taught by *writtenBy* on *writtenAt*", with the
  approver when the lesson's panel gives one. `locker-memory-attributed` · runtime
- **A detector's flag is a hint.** `detector.hint` renders beside the item as the detector's words,
  with its name: "Injection screen 1.2: contains text that reads as instructions to an AI". It is
  never the only marker of an untrusted item, and its absence never means content is safe.
  `locker-detector-is-a-hint` · runtime
- **The version is the conclusion's.** The Locker heading names the conclusion and its version. When
  the conclusion is re-analysed, the Locker shows the new version's items; earlier versions' items
  are reachable from the version line, labelled with their version. `locker-bound-to-version` · runtime
- **The text summary is complete.** The Locker exposes a plain-text summary. It counts items by trust
  and by channel, lists the not-seen items, names every claim that rests only on untrusted or
  agent-written content, and gives the conclusion and version. `locker-text-summary-complete` · runtime
- **Every state is designed.** Loading (the item list and the Gate load separately), content the
  host did not keep ("The agent read this at 08:21 UTC; its content was not kept: *reason*" — never
  the live record in its place), an item that failed to load ("Could not load this item:
  *message*. The agent did read it at 08:21 UTC"),
  records with more rows than shown ("Showing 50 of 412 — the rest in *checkAt*"), and no
  permission to view an item's content ("You can't view this item's content. *checkAt*") each have
  a designed state. `locker-every-state-designed` · runtime
- **Untrusted text stays in its box.** A long unbroken string (a URL, a base64 blob) wraps inside
  the quote block and never widens the Locker, at any width. `locker-untrusted-contained` · browser
- **Below its minimum width the Locker degrades to text.** It never clips or overflows.
  `locker-degrades-below-minimum` · browser
- **When in doubt, untrusted.** A host that cannot tell whether an outsider could have written or
  set a field marks it `untrusted`. Fields an outsider can set inside a system record (a display
  name, a subject line, a user-agent string, a hostname a user chose) are split out as their own
  untrusted item, or the whole record is marked untrusted. `locker-trust-fail-closed` · convention
- **Trust has no colour.** Untrusted is marked by words and the quote block, never by red, an
  icon or a warning tint. A red untrusted item reads as "malicious"; it means "outsider-written".
  `locker-trust-no-colour` · convention
- **Labels claim only what the data knows.** "Read 412 sign-in events from 21 to 28 Oct" rather
  than "Reviewed all activity". "System record" rather than "Verified". "Could have been written by"
  rather than "Written by an attacker". "The agent cites" rather than "Supported by": a citation is
  the agent's, not a check. `locker-labels-claim-only-data` · convention

**Proof plan:** 5 compiler (5 fixtures), 10 runtime (10 unit tests), 2 browser (on the shared
container-width harness), 3 convention — 20 rules, 17 with proofs.

## Token bindings

| Part | Token |
|---|---|
| Locker surface | `--vela-bg-container`, border `--vela-border-default`, radius `--vela-radius-4`, padding `--vela-space-15`, block gap `--vela-space-10` |
| Heading (conclusion and version) | `--vela-text-heading`, H5; version `--vela-text-de-emphasized`, Meta |
| Not-seen list | `--vela-text-default`, Body; reasons `--vela-text-de-emphasized`, Meta |
| Claim | `--vela-text-default`, Body, SemiBold |
| Weak-support line | `--vela-text-heading`, Body, SemiBold — no colour |
| Item heading | `--vela-text-default`, Body; trust and channel labels `--vela-text-de-emphasized`, Meta; the word "Untrusted" in SemiBold `--vela-text-heading` |
| Quote block (untrusted content) | `--vela-bg-raised`, start border `--vela-border-default` at `--vela-stroke-2`, padding `--vela-space-10`, `--vela-font-family-mono` at Meta size. A neutral border, not a coloured rail. |
| Tool call literal | as the Action Impact Card's literal block: `--vela-bg-raised`, `--vela-border-subtle`, `--vela-font-family-mono` |
| Records | **Table** (core), `density="compact"`, caption from `content.caption`. An untrusted column's header reads "*name* (could have been set by *writtenBy*)"; its cells use the quote block's mono and inert rendering, without the border |
| Hidden-character escapes, punycode | `--vela-text-heading` in the mono family, inside the quote block, so an escape cannot pass as ordinary text |
| Times, sources, call ids | `--vela-text-de-emphasized`, Meta |
| Links (`checkAt`, live record) | `--vela-text-link` — never inside a quote block |
| Detector hint | `--vela-text-default`, Meta, prefixed with the detector's name |

**New tokens needed:** none (`--vela-font-family-mono` is already requested by the Action Impact
Card). **PAIRS:** `--vela-text-default` on `--vela-bg-raised` is already requested. **Icons:**
none.

## Sizes

None. The container decides the layout.

## States

| State | What renders |
|---|---|
| Default | Heading with conclusion and version; not-seen list; items grouped by `groupBy`; the full Gate beside or below. |
| Grouped by claim (default) | Each claim, marked "about the world" or "about this item", then "The agent cites:" and its items, each with its trust and channel. Items no claim cites follow under "Read but not cited". |
| Grouped by trust | Three groups in this order: "Untrusted content", "Written by agents", "System records". Untrusted comes first so it cannot be skimmed past. |
| Grouped by time | Items by `retrievedAt`, oldest first, so the order the agent read things is visible. |
| Weak world-claim | Under the claim: "This claim about the world cites only untrusted content (1 item). Check it against a system record before acting." The phrase follows what was cited: untrusted, agent-written, both, or not here. |
| Cited item missing | "The agent cites an item that is not here." If no system record is cited, the claim is also weak. |
| Claims not stated | "The agent did not state its claims: *reason*. Evidence cannot be tied to claims." Items group by trust. |
| Detector flag | Beside the item: "*Detector*: *hint*." |
| Memory item | "From the agent's memory — written by *writtenBy* on *writtenAt*." |
| Lesson | "From the agent's memory — lesson ls_31 v3, taught by A. Rao on 29 Oct, approved by S. Iyer." Links to the lesson's Override & Teach Panel. |
| Records truncated | "Showing 50 of 412 — the rest in *checkAt*." |
| Untrusted column | Header "Device (could have been set by the user)"; its cells inert, with escapes and punycode as in a quote block. |
| Hidden characters | Item heading: "3 hidden characters shown · 1 look-alike domain"; each escape visible in place. |
| Not retained | "The agent read this at 08:21 UTC; its content was not kept: *reason*." Heading, trust and channel still show. |
| About the item | The claim, then "The agent cites:" and the one item, shown in full. No flag. |
| Follow agent output | Under an agent-output item: "Follow to Enrichment agent 1.1's evidence." |
| Untrusted text long | First 40 lines; "Show all *n* lines" expands in place. |
| Item failed to load | "Could not load this item: *message*. The agent did read it at 08:21 UTC." |
| No permission (item) | "You can't view this item's content. *checkAt*." The heading, trust and channel still show. |
| Earlier version | Version line: "Version 3 · earlier: 2, 1". Opening one shows its items, labelled "Version 2 — superseded". |
| Loading | The heading and the not-seen list render first; items and the Gate load separately, each with its own `aria-busy`. |

Nothing animates except composed spinners. Expanding is instant.

## Responsive behaviour

The Locker sizes against its container (`@container`). Widths are provisional until breakpoint
tokens land.

| Container width | Layout |
|---|---|
| ≥ 960 | Evidence on the left; the full Gate on the right, beside it. |
| 480–959 | One column; the full Gate after the not-seen list and before the items, so confidence is read before evidence is weighed. |
| 320–479 | One column; records tables scroll inside their region (Table's own rule); quote blocks wrap. |
| < 320 (minimum) | **Text summary** plus an "Open evidence" link. |

The text summary, exactly:

```
Evidence for Verdict: Malicious — Case CS-4133, version 3
Not seen: Endpoint telemetry for LT-0912 (connector offline since 06:10 UTC)
Items: 3 — 2 system records, 1 untrusted · 2 from tool calls, 1 given
Weak claim about the world: "The mailbox rule forwards invoices to an outside address" — cites only untrusted content (1 item: Body of the email 'Invoice overdue — action needed', could have been written by the email's sender)
Confidence: Agent says Low (Triage agent 2.4)
```

The fourth line appears only when `weakWorldClaims` returns any, and lists each one. **Compact density** tightens the block gap to `--vela-space-5`; type does
not change.

## Accessibility

- The Locker is a `<section aria-label="Evidence for …">`, never `<main>`. Claims and groups are
  headed sections; items are list items.
- The trust label is part of each item's heading text, so a screen-reader user hears "Untrusted"
  before the content, every time.
- Untrusted content is in a `<blockquote>` holding a `<pre>` of plain text. It contains no links,
  so there is no focus trap and no surprise navigation. Copy is a real button.
- Records use **Table**, with its caption and its own scroll region rules.
- The full Gate keeps its own semantics; beside the evidence, it is a sibling region labelled
  "Confidence".
- Times are `<time datetime>` with the zone in the visible text. No colour carries meaning. Both
  themes are real.

## Built from

- **Calibrated Confidence Gate** (Phase 2), `size="full"`, beside the evidence.
- **Table** (core) for `records` content.
- **Button** (core) for Copy, Show all and the version switch.
- **Popover** (Phase 1), optional, for a tool call's full literal when it is long. Never for
  untrusted content, a trust label or a claim.
- The **Action Impact Card**'s literal-block treatment, for tool-call literals.
- Opened from: the **Verdict Card**'s "What the agent read". After the amendment below, the card
  takes the same `evidence` object the Locker shows, so the two cannot disagree.
- Feeds: each item's `callId` links to the **Agent Action Ledger** entry for that call.

Not buildable before Phase 1's Popover and Phase 2's Confidence Gate.

## Changes this makes to other specs

Applied in this same change to `verdict-card.md`:

**Verdict Card — breaking change to the proposal (the second, after the Gate's).**

1. `examined` and `notSeen` are replaced by one required prop:
   `evidence: Pick<EvidenceLockerProps, "items" | "claims" | "notSeen">`. The card's "What the
   agent read" list, its coverage line and the Locker it opens all read the same object. Two lists
   of the same evidence would drift. The rules `verdict-examined-nonempty` and
   `verdict-not-seen-required` keep their ids and now hold on `evidence.items` and
   `evidence.notSeen`.
2. The coverage line adds weak world-claims when there are any: "Sources read: 2 of 3 · 1 claim
   about the world cites only untrusted content (1 item)", or "· 2 claims about the world are weak"
   with each listed beneath, by the wording table above. This folds into `verdict-coverage-separate`.
3. Accept is withheld when `weakWorldClaims(evidence.claims, evidence.items)` returns any claim. The
   sentence names it, by the wording table above: "A claim about the world cites only untrusted content (1 item): 'The mailbox rule
   forwards invoices to an outside address'. Check it against a system record, or agree through
   Override with a reason." This folds into `verdict-accept-withheld`, and the injection case
   fails closed. A `the-item` claim never withholds Accept, so an ordinary phishing verdict is not
   blocked by its own evidence.
4. The card's "What the agent read" list marks untrusted items with the Locker's words
   ("Untrusted — could have been written by the email's sender"), keeping the signal continuous.
5. The Figma set gains a `Has weak claim` boolean, which locks `Decision` to `Withheld`.

The card's rule count does not change: 28 rules, 22 with proofs.

**Amended for the Override & Teach Panel (31 Oct 2026).** Additive: a `memory` item may carry a
`lesson`, typed as `LessonMemory`, with the new rule `locker-lesson-is-agent-output` · compiler and
the lesson wording in `locker-memory-attributed`. The Locker now has 20 rules, 17 with proofs. See
`override-and-teach-panel.md`.

## Figma mapping

Library file: **Vela Design System** → page `Evidence Locker`. Two sets and one example frame.

- `Evidence Locker / Item`: `Trust` (`System record`, `Agent output`, `Untrusted`) × `Channel`
  (`Tool call`, `Given`, `Memory`) × `Content` (`Text`, `Records`, `Not retained`) = 27
  combinations. `Untrusted` has no `Records` (a compile rule), so the set is **24 variants**.
  Booleans: `Detector flag`, `Truncated`, `No permission`, `Hidden characters`, `Untrusted column`
  (Records only), `Follows to evidence` (Agent output only), `Lesson` (Memory × Agent output only).
- `Evidence Locker / Claim`: `About` (`World`, `Item`) × `Support` (`Mixed`, `Only weak`,
  `Not here`). `Item` claims are never weak, so the set is 3 + 1 = **4 variants**, with the claim
  text as a text property.
- Example frame `Evidence Locker — worked example`: Case CS-4133 at 1440 wide, grouped by claim,
  with the full Gate beside.

| Figma property | Code |
|---|---|
| `Trust` | `trust` |
| `Channel` | `channel` |
| `Content` | `content.kind` |
| `Detector flag` / `Truncated` / `No permission` | `detector`; `truncatedAt` or `rows.length < total`; the host's permission |
| `Lesson` | `memory.lesson` is present |
| `About` | `claim.about` |
| `Support` | derived: `Only weak` when `weakWorldClaims` returns the claim; `Not here` when a cited id is missing |

The builder never places a link layer inside a quote block, and never colours an item by trust.
Every fill, stroke and text binds a variable.

## Anti-patterns

- ❌ Rendering an email body as HTML or markdown, with live links → untrusted content is inert plain text (the type forbids a node).
- ❌ A red badge or tint on untrusted items → trust is words and a neutral quote block; red means something else.
- ❌ One "This may contain untrusted content" notice at the top → mark every untrusted item, everywhere it appears.
- ❌ `trust: "trusted"` or `trust: "unknown"` → not in the set; when in doubt, `untrusted` (will not compile).
- ❌ Calling a tool result trusted because the agent fetched it → channel and trust are separate; a fetched email body is still untrusted.
- ❌ Showing the live record in place of what the agent read → show the snapshot, with a labelled link to the live record.
- ❌ A detector's silence shown as "Safe" → a detector flags; it never clears.
- ❌ A claim backed only by another agent's summary presented like one backed by logs → flag weak support.
- ❌ Memory shown as if just read → "From the agent's memory — written by … on …".
- ❌ "Verified", "Reviewed all activity" → "System record", "Read 412 events from 21 to 28 Oct".
- ❌ "Supported by:" → "The agent cites:"; a citation is the agent's claim, not a check.
- ❌ Flagging "The email asks for payment" as weak because it cites the email → a claim about the item is never weak.
- ❌ "Cites only untrusted content" for a claim citing another agent's summary → word it by what was cited.
- ❌ Dropping cited ids that are not in `items` before checking → a missing item is not a system record; the claim fails closed.
- ❌ Rendering a bidi override or a zero-width character as-is → show it as a visible escape.
- ❌ A look-alike domain shown only in Unicode → print its punycode beside it.
- ❌ A user-set "Device" column shown like the rest of a system record → mark the column untrusted.
- ❌ Showing the live record when the snapshot was not kept → say it was not kept, and why.

## Decisions taken in review (29 Oct 2026)

1. **Verdict Card coverage line** — yes; synced with the Locker in this same change (see *Changes
   this makes to other specs*).
2. **Default grouping** — by claim. Untrusted content is marked wherever it appears, so grouping by
   trust adds only ordering.
3. **Weak support and Accept** — Accept is withheld, but only for weak claims about the world. The
   injection case fails closed; an ordinary phishing verdict does not.
4. **40 lines** — a labelled default, an assumption to measure.
5. **`agent-output`** — stays weak, even from a calibrated in-house agent. Calibration describes
   conclusions, not each fact in a summary. `lockerRef` lets a person follow the chain to
   first-hand evidence.
