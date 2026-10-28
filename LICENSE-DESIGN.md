# Licence for the design files

Vela is one system published in two places, under two licences that cover different things.

## Code, tokens and documentation: MIT

Everything in this repository and in the npm package `@omkarux/vela` is licensed under the MIT
License in `LICENSE`. That includes the components, the stylesheets, `tokens/vela.tokens.json`
and every file generated from it (CSS, Dart, the MUI theme, the Figma scripts), `guidelines/`,
the demo site and the decision records.

## The Figma library: CC BY 4.0, and also MIT

The Figma library **Vela Design System** (file key `XO2rmeCcgOjyKe4oipgF4j`) is published on
Figma Community under the
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
licence, which is the licence Figma Community offers. Creative Commons does not recommend its
licences for software, so the same file is **additionally** granted under the MIT License in
`LICENSE`. Take it under either; you do not need both.

What this means in practice:

- You may copy the library, change it, use it in commercial work and publish work made with it.
- Under CC BY 4.0 you credit the source. The attribution text is:

  > Vela by Omkar Khadamkar (omkarux.com)

  A line in a file's cover page or a published Community description is enough. Under MIT, the
  copyright and permission notice from `LICENSE` travel with any copy of the file itself.

- You may not imply that Omkar Khadamkar endorses your work, and you may not remove the
  attribution from a copy you publish under CC BY 4.0.

## What is not covered

- **The fonts.** Open Sans and Oswald are licensed separately under the SIL Open Font License 1.1
  by their authors; see `NOTICE`. The library names them and does not contain them.
- **The name.** Neither licence grants the name "Vela". A fork is welcome to the file and the
  code; it should not publish under the same name in a way that reads as the original.
- **Your content.** Nothing here claims anything over what you build with the system.

## Why two licences

The library is compiled from `tokens/vela.tokens.json` and the specs in `guidelines/` by the
scripts in `scripts/figma/`. A single licence for the whole system was the aim, and MIT is that
licence. CC BY 4.0 is added on the Figma file because it is what Figma Community publishes
under, and because designers recognise it. Where the two disagree, the one you chose applies.
