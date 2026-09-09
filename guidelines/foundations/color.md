# Foundation: Colour

Two layers: **primitives** (raw scale) and **semantics** (role-named, resolving to
primitives). **Always bind semantics.** Primitives exist so semantics can be re-pointed for
theming; binding one directly defeats that and breaks dark mode.

- ✅ `color: var(--vela-text-default)` — survives re-skinning
- ⚠️ `color: var(--vela-grey-700)` — primitive; only when no semantic covers the role
- ❌ `color: #191d1f` — never raw hex

## Primitives (reference only)

Families: `grey` (50–950), `primary` (300–600), `blue` (100–950), `green` (100–950),
`red` (100–950), `critical` (100–950), `yellow` (100–950), `orange` (100–950),
plus `--vela-black` (#191d1f, not pure black) and `--vela-white`.

## Three separate status taxonomies — keep them apart

Vela deliberately separates **severity** (events), **risk** (scoring), and **status** (the
health dot). Do not interchange them. There is no "critical risk", no "high severity", and
the dot states are neither.

### Severity — 6 levels

`success` · `info` · `warning` · `minor` · `major` · `critical`

Every level defines a complete row: `--vela-bg-severity-*`, `--vela-border-severity-*`,
`--vela-signal-severity-*`, `--vela-icon-severity-*`, `--vela-text-severity-*`,
`--vela-border-severity-*-indicator`. **No cell is missing.** If a token you expect does not
resolve, you have the wrong taxonomy, not a gap.

### Risk — 3 levels

`low` · `medium` · `high` — same six roles per level, prefixed `--vela-*-risk-*`.

### Status — 5 dot fills

`--vela-signal-status-` + `unknown` | `healthy` | `warning` | `medium` | `unhealthy`.
One row, five swatches, no other roles. Status Indicator only.

## Contrast is a constraint, not an aspiration

Every foreground/background pair the kit ships is asserted against WCAG 2.1 AA in
`src/styles/contrast.test.ts` — 4.5:1 for text, 3:1 for UI boundaries and non-text signals,
**in both themes**. Run `npm run contrast` for the report.

Consequences you will notice, all deliberate:

- `--vela-btn-destructive-bg` is `red-700` (6.57:1), **not** `red-500`. Red-500 behind a white
  label is 4.08:1 and fails AA. Do not "fix" it back to the signal colour.
- `--vela-text-de-emphasized` is `grey-600` (4.90:1), not `grey-500` (3.47:1).
- `--vela-text-severity-success` is `green-800` (6.68:1). `green-700` would technically pass at
  4.87:1; green-800 is kept for headroom, so a future palette tweak cannot silently cross the
  line. That is a judgement call, not a compliance requirement — recorded here as one.
- Status dots use `yellow-700` (4.07:1) and `orange-600` (3.80:1), not the 500s, which sit at
  2.59:1 and 2.78:1 on white.
- Tightest shipped pair: the input border at 3.29:1 against a 3:1 minimum. Anything you add
  below that is a regression.

If you add a pair, add it to `PAIRS` in `scripts/contrast-core.mjs`. An unasserted pair is
an unverified claim.

## Both themes are real

Dark mode re-points semantics only — no primitive is redefined, and a test fails the build if
a raw hex appears in the dark block. Anything you write must therefore bind semantics, or it
will simply not respond to the theme.
