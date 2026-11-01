# Figma mark — source

Figma's own file; canvas cropped to the mark; path unchanged.

- **Owner:** Figma, Inc.
- **File:** Figma's mono-line icon, black, as Omkar attached it on 1 Nov 2026. Checked in here unchanged as `figma-mono-line-black.svg`
  (sha256 `c759da483f0f430a7a4afe29de55a6804d4598601e54234c805c87f396d81376`). The white file has the
  same path data and is not checked in.
- **Canvas:** the file's canvas is 1024 × 1280. The mark's bounds, measured from the path (curve
  extremes included), are x 304–720.156, y 340–940. Brand Mark uses the viewBox `212 340 600 600`: a
  square around the mark, centred on it across and touching it top and bottom. Only the viewBox changes.
- **Path:** the file's `d`, unchanged, with the file's `fill-rule="evenodd"`. The rule is part of the
  drawing: the two top counters wind the same way as the outline, so without it they would fill in.
  Nothing else in the file is used. Its `fill="black"` (and the white file's `fill="white"`) is kept
  as a colour, not as an attribute: Brand Mark fills with `currentColor` set to `--vela-brand-mark`,
  pure black in the light theme and white in the dark.
- **Use:** under Figma's trademark guidelines, to link to Figma. The Brand Book says: "Never present
  the icon in grayscale. Use the monoline icon instead."
- **Clear space:** Brand Mark follows Figma's Brand Book as written (Omkar's choice, 1 Nov 2026):
  clear space equal to the icon's height, 20px, from any other element, which the host's layout
  provides. Figma's reply to Omkar's question of 31 Oct, when it comes, may relax it.

`mark.ts` beside this note holds the path data Brand Mark renders. `src/components/BrandMark/BrandMark.test.tsx`
fails if its `d` differs from this file's (`brand-mark-owner-drawing`).
