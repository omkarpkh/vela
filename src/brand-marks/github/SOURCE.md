# GitHub mark — source

- **Owner:** GitHub, Inc.
- **Package:** `@primer/octicons`, version **19.42.0**, from the npm registry (`npm pack @primer/octicons@19.42.0`)
- **File:** `build/svg/mark-github-16.svg`, checked in here unchanged as `mark-github-16.svg`
  (sha256 `7421820090b50ac79d7c2bf7c951a433d7098a8a9c474809207bdd45f62d9d46`)
- **Licence:** MIT, Copyright (c) 2026 GitHub Inc. The text is in `LICENSE`, beside this note, and in Vela's `NOTICE`.
- **Use:** GitHub's logo policy, for linking to GitHub. The mark is GitHub's trademark; the MIT licence covers the file, not the trademark.
- **Not a dependency.** The package was fetched once to take this file; it is not in `package.json`.

`mark.ts` beside this note holds the path data Brand Mark renders. Its `d` is the file's `d`, character
for character, in the file's own 16-unit viewBox; `src/components/BrandMark/BrandMark.test.tsx` fails if
the two differ (`brand-mark-owner-drawing`). The 24px drawing (`mark-github-24.svg`) is not used.
