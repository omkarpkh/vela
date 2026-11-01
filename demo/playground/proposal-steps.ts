/**
 * The job, in steps: a proposal page's storyboard (slice 4 of the playground uplift, s5-proposal).
 *
 * Steps are drawn only from a spec's own worked example, a story the spec writes out in words. A
 * spec without one gets no steps: its page leads with its states, and it picks its steps up when the
 * spec gains an example (open question 2, recommended and taken). Nothing here is invented: every
 * string below is the spec's own words, and a unit test (src/styles/site-proposals.test.ts) fails
 * the build if any is not found in its spec, so a spec edit that drops a sentence drops the step
 * with it. The site never rewrites a spec; the dashes in these words are turned into a colon or a
 * full stop by the display layer (`undash`) as the page renders them.
 *
 * Which specs write their example out:
 * - Evidence Locker: Case CS-4133, in its Props example, text summary and States.
 * - Awareness Clock: the printer maker of its source page, "a report arrives on Friday evening …".
 * - Override & Teach Panel: "The worked example, in order", CS-4180.
 * Approval Queue names a worked example only as a Figma frame ("a synthetic case's proposals at
 * 1440 wide, all four lanes and the tray") and never writes it out, so it has no steps either: any
 * order of events would be the site's, not the spec's. Verdict Card, Action Impact Card, Autonomy
 * Ladder, Calibrated Confidence Gate and Agent Provenance Badge have no worked example.
 */

/** One line of a sketch. `bar` is a grey bar: content the spec does not give. */
export type SketchLine =
  | { text: string; kind?: 'heading' | 'text' | 'meta' | 'flag' | 'button' | 'link' }
  | { bar: 'long' | 'short' }

/** One box in a sketch, with the pin that its note under "What to notice" points to. */
export interface SketchBlock { pin?: number; lines: SketchLine[] }

export interface ProposalStep {
  /** The step's name: the spec's own words. */
  title: string
  /** The sentence of the spec the step rests on. */
  from: string
  blocks: SketchBlock[]
  /** "What to notice", one note per pin, in the spec's words. */
  notes: { pin: number; text: string }[]
}

export interface WorkedExample {
  /** What the example is, in the spec's words: "Case CS-4133". */
  label: string
  steps: [ProposalStep, ProposalStep, ...ProposalStep[]]
}

const bar = (b: 'long' | 'short' = 'long'): SketchLine => ({ bar: b })

export const WORKED_EXAMPLES: Record<string, WorkedExample> = {
  'evidence-locker': {
    label: 'Case CS-4133',
    steps: [
      {
        title: 'Verdict: Malicious — Case CS-4133',
        from: 'Opened from: the Verdict Card\'s "What the agent read"',
        blocks: [
          { pin: 1, lines: [{ text: 'Verdict: Malicious — Case CS-4133', kind: 'heading' }, bar(), bar('short')] },
          { pin: 2, lines: [{ text: 'What the agent read', kind: 'link' }] },
        ],
        notes: [
          { pin: 1, text: 'The conclusion this evidence is for, and its version.' },
          { pin: 2, text: 'the card takes the same evidence object the Locker shows, so the two cannot disagree' },
        ],
      },
      {
        title: 'Everything behind one conclusion',
        from: 'Each claim, marked "about the world" or "about this item", then "The agent cites:" and its items, each with its trust and channel.',
        blocks: [
          { pin: 1, lines: [{ text: 'Not seen: Endpoint telemetry for LT-0912 (connector offline since 06:10 UTC)', kind: 'heading' }] },
          { lines: [{ text: 'Two sign-ins from new countries within 9 minutes', kind: 'heading' }] },
          { pin: 2, lines: [{ text: 'The agent cites:', kind: 'meta' }, { text: 'Sign-in events for a.mehta, 7 days', kind: 'heading' }, { text: 'Identity provider', kind: 'meta' }, bar()] },
          { lines: [{ text: 'The mailbox rule forwards invoices to an outside address', kind: 'heading' }] },
          { pin: 3, lines: [{ text: 'The agent cites:', kind: 'meta' }, { text: "Body of the email 'Invoice overdue — action needed'", kind: 'heading' }, { text: "Untrusted — could have been written by the email's sender", kind: 'meta' }, bar(), bar('short')] },
        ],
        notes: [
          { pin: 1, text: 'Not seen comes first.' },
          { pin: 2, text: 'The link from a claim to its items is labelled "The agent cites:", never "Supported by".' },
          { pin: 3, text: 'Every untrusted item is labelled in words in its own heading' },
        ],
      },
      {
        title: 'Weak world-claim',
        from: 'This claim about the world cites only untrusted content (1 item). Check it against a system record before acting.',
        blocks: [
          { lines: [{ text: 'The mailbox rule forwards invoices to an outside address', kind: 'heading' }] },
          { pin: 1, lines: [{ text: 'This claim about the world cites only untrusted content (1 item). Check it against a system record before acting.', kind: 'flag' }] },
          { pin: 2, lines: [{ text: 'The email asks for payment to a new bank account', kind: 'heading' }, { text: 'The agent cites:', kind: 'meta' }, bar(), bar('short')] },
        ],
        notes: [
          { pin: 1, text: 'Weak world-claims are flagged.' },
          { pin: 2, text: 'A the-item claim is never flagged, because the item is shown.' },
        ],
      },
    ],
  },

  'awareness-clock': {
    label: 'a made-up printer maker',
    steps: [
      {
        title: 'a report arrives on Friday evening',
        from: 'Its worked example is a made-up printer maker: a report arrives on Friday evening',
        blocks: [
          { pin: 1, lines: [{ text: 'Is it real?', kind: 'heading' }, { text: 'Not answered yet', kind: 'meta' }] },
          { lines: [{ text: 'Does it work on our product?', kind: 'heading' }, { text: 'Not answered yet', kind: 'meta' }] },
          { lines: [{ text: 'Are attackers using it?', kind: 'heading' }, { text: 'Not answered yet', kind: 'meta' }] },
          { pin: 2, lines: [{ text: 'Open for 2 d 14 h since the report arrived (Fri 18:30 UTC)' }] },
        ],
        notes: [
          { pin: 1, text: 'Each is answered Yes, No or Not known yet, with evidence, who answered and when.' },
          { pin: 2, text: "never a countdown — the law's clock has not started" },
        ],
      },
      {
        title: 'on Saturday an engineer reproduces the attack on the new model and not the old one',
        from: 'on Saturday an engineer reproduces the attack on the new model and not the old one',
        blocks: [
          { lines: [{ text: 'Is it real?', kind: 'heading' }, bar('short')] },
          { pin: 1, lines: [{ text: 'Does it work on our product?', kind: 'heading' }, bar(), bar()] },
          { pin: 2, lines: [{ text: 'Are attackers using it?', kind: 'heading' }, { text: 'Not known yet — M. Iyer, Sat 15:05 UTC', kind: 'meta' }] },
        ],
        notes: [
          { pin: 1, text: 'Q2 shows one row per subject.' },
          { pin: 2, text: 'Only a Yes to the third leads to the "aware" button.' },
        ],
      },
      {
        title: "on Monday a customer's log shows an attack on Saturday night",
        from: "on Monday a customer's log shows an attack on Saturday night",
        blocks: [
          { pin: 1, lines: [{ text: "I'm reasonably certain this is being exploited", kind: 'button' }] },
          { pin: 2, lines: [{ text: 'Recorded as aware by M. Iyer, Security lead, at Mon 26 Oct 09:20 UTC · record snap_7f3a' }] },
          { pin: 3, lines: [{ text: 'Early warning: without undue delay; at the latest Tue 09:20 UTC · 21 h left', kind: 'heading' }] },
        ],
        notes: [
          { pin: 1, text: '"Aware" is a press, not a typed time.' },
          { pin: 2, text: 'The press saves who pressed and the evidence present at that moment.' },
          { pin: 3, text: 'Every limit is an outer limit.' },
        ],
      },
    ],
  },

  'override-and-teach-panel': {
    label: 'CS-4180',
    steps: [
      {
        title: 'A. Rao overrides Suspicious → Benign on CS-4180 and opens the panel',
        from: 'A. Rao overrides Suspicious → Benign on CS-4180 and opens the panel. The direction reads lenient.',
        blocks: [
          { lines: [bar(), bar('short')] },
          { pin: 1, lines: [{ text: "The agent's version: not asked yet", kind: 'meta' }, { text: 'Ask the agent', kind: 'button' }] },
          { pin: 2, lines: [{ text: 'Not checked yet', kind: 'meta' }, { text: 'Check', kind: 'button' }] },
          { pin: 3, lines: [{ text: 'Keep the override only', kind: 'button' }] },
        ],
        notes: [
          { pin: 1, text: 'The agent translates from the person, not from the case.' },
          { pin: 2, text: 'A check declares everything.' },
          { pin: 3, text: 'An override never teaches by itself.' },
        ],
      },
      {
        title: 'The check replays it over 30 days',
        from: 'The check replays it over 30 days: 14 verdicts changed, 3 of them against settled cases — invoice fraud sent from a genuine but compromised Northwind mailbox. Blocked.',
        blocks: [
          { pin: 1, lines: [{ text: '14 verdicts changed, 3 of them against settled cases', kind: 'heading' }, bar(), bar('short')] },
          { pin: 2, lines: [{ text: 'Not saved. A lenient lesson may not overrule settled cases: 3 verdicts confirmed Malicious on review would have become Benign — CS-4102 (M. Iyer), CS-4117 (A. Rao), CS-4151 (S. Iyer). Narrow the lesson, or correct those cases first if they were settled wrongly.', kind: 'flag' }] },
        ],
        notes: [
          { pin: 1, text: 'The replay is counts, and the counts add up.' },
          { pin: 2, text: 'A lenient lesson may not overrule settled cases.' },
        ],
      },
      {
        title: 'She adds the condition "Payment account on the vendor list is yes", a system record',
        from: 'the second check changes 11 verdicts, all Suspicious → Benign: 9 match, 0 against, 2 never reviewed',
        blocks: [
          { pin: 1, lines: [{ text: 'Payment account on the vendor list is yes', kind: 'heading' }, { text: '9 match, 0 against, 2 never reviewed', kind: 'meta' }] },
          { pin: 2, lines: [{ text: 'Needs a second person: this lesson is lenient. Send it to the Approval Queue; a security lead decides.' }] },
          { pin: 3, lines: [{ text: 'Send for approval', kind: 'button' }] },
        ],
        notes: [
          { pin: 1, text: 'A lenient lesson needs an exact value an outsider cannot set.' },
          { pin: 2, text: 'The route is "second person".' },
          { pin: 3, text: 'She sends it; S. Iyer approves it in the Approval Queue.' },
        ],
      },
    ],
  },
}

/** Every string of an example, for the test that holds each to its spec. */
export function wordsOf(example: WorkedExample): string[] {
  const out = [example.label]
  for (const s of example.steps) {
    out.push(s.title, s.from, ...s.notes.map((n) => n.text))
    for (const b of s.blocks) for (const l of b.lines) if ('text' in l) out.push(l.text)
  }
  return out
}

/** A spec's text and a quote, compared as words: no markdown marks, any run of space as one. */
export const asWords = (md: string) => md
  .replace(/\\\*/g, '*').replace(/\*\*|`/g, '').replace(/(^|[\s("“])\*([^*\s][^*]*?)\*/g, '$1$2')
  .replace(/^>\s?/gm, '').replace(/\s+/g, ' ').trim()
