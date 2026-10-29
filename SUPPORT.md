# Support

## Where to ask

| You want to | Go to |
|---|---|
| Ask how to use a component, token or bridge | [GitHub Discussions](https://github.com/omkarpkh/vela/discussions) |
| Propose a component or a token | Discussions first; then the component-request or token-request issue form |
| Report a defect | [GitHub Issues](https://github.com/omkarpkh/vela/issues), bug form |
| Report a vulnerability | Email, as `SECURITY.md` says. Never a public issue |

Before asking, read the spec for the component in `guidelines/components/` and the playground
page for it on https://omkarpkh.github.io/vela/. The closed prop table there is the whole API.
If a value is not in the table, it does not exist, and that is an answer rather than a bug.

Vela has one maintainer. Questions are answered when there is time, usually within a week.
There is no SLA, no paid support and no private channel.

## What is not supported

- **Framework ports.** The package is a React implementation. The tokens and specs port to
  Angular, Vue, Svelte and Flutter; the components do not, and no port is maintained here. See
  "Using it on another stack" in `README.md`.
- **Visual customisation beyond the tokens.** Overriding `.vela-*` class styles, or binding
  primitives directly, is outside the contract and breaks in dark mode and across releases.
- **Components not in the kit.** The list in `guidelines/overview.md` is explicit. Use the
  component-request form rather than asking for a workaround.
- **Material UI beyond the theme bridge.** `mui-theme.json` sets colour, type, radius and
  surfaces. It cannot keep Severity and Status apart, because Material has one colour
  vocabulary. That limit is documented and not a defect.
- **Older minors.** Only the latest published minor is fixed.
- **Figma file support.** The library is compiled from this repository. A problem with the
  library is a problem with a script in `scripts/figma/`, and goes in Issues.
