# Dropdown List moves on the overlay motion, like Popover

**Decided 7 November 2026, by Omkar, after judging the clip ("keep the grow and ship it"). The Dropdown List stops
travelling a `--vela-space-5` step from its trigger and moves on Popover's overlay motion instead.
It grows from 96% out of the button as it fades in, on `--vela-ease-out` over
`--vela-duration-base`, and leaves on a fade. This extends the values decision 006 approved for
Popover and Tooltip to one more overlay; it changes none of them. Shipped in 0.16.0.**

The clip he judges is `media/dropdown-list.mp4` (20 s). `record.mjs`, beside this file, makes it
again; its header says how. It is made the way decision 006's `overlays.mp4` was.

---

## What started it

Decision 006 (31 October 2026) approved the overlay motion: Popover and Tooltip grow from their
trigger, scale 0.96 to 1 as they fade in, pivoting on the point Base UI computes nearest the
trigger, and leave on opacity alone. Overlays enter on `--vela-ease-out`.

The Dropdown List was built after that pass and was never brought in line. It appeared on
`--vela-ease-standard`, the curve for things that change while on screen, not for things that
enter, with a `--vela-space-5` step of travel keyed on Base UI's `data-side`: down when it opened
below, up when it flipped above. `DESIGN.md` and `foundations/motion.md` both said bringing it in
line was still to do. So the kit had two overlays with the same surface, the same border and the
same trigger relationship, arriving two different ways.

## What was considered

The criterion, stated before the options: the list should arrive the way the overlay it most
resembles arrives, and should not be a second motion to maintain.

| Option | What moves | Curve | Shared with Popover |
|---|---|---|---|
| Leave it as it is | opacity, and 5px of travel from the trigger | ease-standard | no |
| Keep the travel, change the curve to ease-out | opacity, and 5px of travel | ease-out | the curve only |
| **Popover's grow, by Popover's rule** | opacity, and scale from 0.96 on Base UI's `--transform-origin` | ease-out | **yes: one selector** |
| Grow and travel together (95% plus an 8px slide toward the trigger) | opacity, scale and travel | ease-out | no |
| Unroll: the panel opens from the trigger's edge like a blind, the words never scale | opacity, and a clip from the trigger's edge | ease-out | no (Popover would have to change too) |
| Instant open, fade on close | opacity on close only | none | no |

The last three were raised when Omkar asked why the two were being compared at all (7 November):
grow and travel together is a common open-source pattern, the unroll follows an older menu that
stretched down from half its height, and instant opening follows desktop operating-system menus.

## The measurements

Nothing about the feel was measured; that is the clip's job. What was checked is that the list now
obeys decision 006's four contracts, on the Motion review page (`#/motion`), where it now sits
beside Popover and Tooltip. In Chromium, against the production build of the playground, one run
each:

- **It moves by transform and opacity only, and the transform is a scale.** While it opens, its
  running transitions are `opacity` and `transform` and nothing else; the computed transform is a
  uniform scale between 0.96 and 1, with no translation. Opened below, it pivots on its top edge;
  scrolled so its trigger is near the foot of the window, it flips above (`data-side="top"`) and
  pivots on its bottom edge.
- **Triggered again mid-flight, it ends in the right state.** Closed and reopened while it is
  still fading out, the same list comes back and ends open, opaque and at full size.
- **From the keyboard it does not animate.** Opened with Enter it has no running animation and is
  at full size at once; Escape removes it at once.
- **Under reduced motion it reads correctly frozen at its end state:** open is full size and
  opaque, closed is gone. The global collapse in `base.css` still does this; decision 009 changes
  how reduced motion works and will revisit it.

One thing the browser showed that the spec had not said: across the trigger, Base UI pivots a
popup that is aligned to an edge on that edge, and a centred one under the trigger's centre. The
list aligns to its trigger's start edge, so it grows from that corner, out of the button; the
Popover on the review page is centred, so it grows from under the middle. Same rule, same variable;
the spec now says so.

**The clip** was recorded in headless Chromium at 1280 × 720, with Open Sans served locally. It is
four views of the Motion review page, side by side: today on the left, proposed on the right, the
light theme above and the dark below. The right column is the branch as built. The left column is
the same build with today's three motion rules put back on top, copied unchanged from
`DropdownList.css` at 8715db8, so the two columns differ by those rules and nothing else. All four
lists are opened together, by a pointer press dispatched into each view at the same moment, and a
ring marks each press. Focus rings are hidden in the views: only the view the window last focused
would draw one, which would make one of the four differ for a reason that is not motion.

| About | What it shows |
|---|---|
| 0 to 1 s | the views loading |
| 1 to 4 s | real speed (180 ms): opening below, then closing on a fade |
| 4 to 8 s | real speed: the triggers near the foot of each view, so the lists flip above; then closing |
| 8 to 13 s | ×5 slow motion, through the page's own switch: opening below, then closing |
| 13 to 17 s | ×5 slow motion: flipped above, then closing |
| 17 to 20 s | a closing note: from the keyboard nothing animates, the highlight moves at once, the chevron stays still |

## Why the alternatives lost

**Leave it as it is.** Two overlays with the same surface would keep arriving two ways, and the list
would keep entering on the curve the kit reserves for things already on screen. The open item in
`DESIGN.md` and `foundations/motion.md` would stay open.

**Keep the travel on ease-out.** It fixes the curve and keeps a second motion. The travel was keyed
on `data-side`, so it was two rules to keep right where the scale is one, and it is not what
decision 006 approved for the overlays.

**Grow and travel together.** Two movements at once is busier than either alone, against the kit's
calm rule, for no extra meaning.

**Unroll.** Its one advantage is that text never scales, so it never draws a touch soft during the
180ms. That softness only shows at slow motion. Taking it would mean changing Popover as well, so
the two stay one motion, which reopens a value decision 006 approved.

**Instant open.** A list that shows no origin loses the one thing motion tells you here. People who
want speed already get it: from the keyboard nothing animates.

## What was decided

Decided by Omkar on 7 November 2026, after judging the clip.

- **The Dropdown List grows from its trigger, as Popover does.** Scale from 0.96 and opacity, on
  `--vela-ease-out` over `--vela-duration-base`, pivoting on Base UI's `--transform-origin`; it
  leaves on opacity alone, at full size.
- **One rule, not a copy.** The transition, the transform origin, the starting scale, the fade out
  and the keyboard's `transition: none` are written once in `Popover.css` with
  `.vela-popover, .vela-dropdown-list` as the selector. `DropdownList.css` no longer sets any of it.
  Tooltip keeps its own rule, because its duration is `fast`.
- **No token for 0.96.** Decision 009 (reduced motion, next) will turn movement amounts into tokens;
  until then the list shares Popover's value through the shared rule.
- **Unchanged:** from the keyboard nothing animates (`data-vela-instant`), the highlight moves at
  once, and the chevron stays still.
- **The spec** (`dropdown-list.md`) has three new browser rules, the twins of Popover's:
  `dropdown-list-grows-from-its-trigger`, `dropdown-list-reopen-mid-flight` and
  `dropdown-list-motion-reduced-end-state`. Its Motion table's Appears and Leaves rows now match
  Popover's.
- **The Motion review page** shows the list beside Popover and Tooltip, in both themes, so it can be
  felt live after merge.

## Still open

1. **Safari and Firefox.** As with decision 006, the clip and the browser rules ran in Chromium only.
2. **Decision 009** turns movement amounts into tokens and changes reduced motion; the 0.96 here
   moves with it.
