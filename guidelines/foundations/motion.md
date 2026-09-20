# Motion

Vela animates for one of three reasons: feedback (your action registered), orientation (where
something came from or went), continuity (the same thing, changing state). If a movement's reason
cannot be named in one of those words, it does not ship.

## The frequency gate

| How often a person triggers it | What it gets |
|---|---|
| Hundreds of times a day — button press, tab switch, toggle | instant, or feedback under 200ms |
| Daily — a dialog, a panel, an alert appearing | subtle and fast: opacity, a few px of travel, a touch of blur |
| Rarely — onboarding, a first success | room for expression |
| From the keyboard | nothing animates |

## Tokens

- `--vela-duration-fast` (120ms): anything that answers a pointer.
- `--vela-duration-base` (180ms): anything that settles or appears.
- `--vela-ease-standard` `cubic-bezier(0.2, 0, 0.2, 1)`: the only curve. Never a bare `ease`.

No component defines its own duration or curve. A new one is a token change, reviewed like a colour.

In Figma they live in the **Motion** collection as Figma's own motion variable types: `duration/fast`
and `duration/base` are **timing** variables (Figma keeps timing in seconds, so 120ms is stored as
0.12) and `easing/standard` is an **easing** variable holding the same cubic-bezier, each carrying its
`var(--vela-*)` code syntax. A Figma Motion timeline animation can bind them, so a token change reaches
it on the next sync. A prototype transition still cannot: its duration is a typed number and its curve
a menu choice, so an interaction built in Figma copies these values by hand. The component description
the sync writes lists each moment from the spec's Motion table with its token and value, so the number
to type sits on the component itself.

## Rules

1. Only `transform`, `opacity` and `filter` animate. Never width, height, margin, padding or position.
2. Pointer states enter faster than they leave (hover in at `fast`, out at `base`). Things that leave the
   screen exit more softly than they entered.
3. Transitions, not keyframes, for anything a person can re-trigger: transitions retarget mid-flight.
4. Hover only where hover exists. Wrap hover rules in `@media (hover: hover)`; touch gets press feedback.
5. `prefers-reduced-motion` is handled once, globally, in `src/styles/base.css`: durations collapse, loops
   run once. Every animation must read correctly frozen at its end state. That is the test.
6. No looping attention-seekers: no pulsing dots, breathing buttons, glowing rings. The loading spinner is
   the one loop, and it stops meaning anything if something else pulses.

## What this buys

Motion that goes unnoticed. The compliment to design for is "this feels quick", never "nice animation".
The reference implementation is [Button](../components/button.md#motion).
