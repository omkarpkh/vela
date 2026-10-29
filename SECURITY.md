# Security

## Reporting a vulnerability

Email **omkarpkh@gmail.com** with "Vela security" in the subject. Do not open a public issue,
discussion or pull request for a vulnerability until a fix is published.

Include the version (`@omkarux/vela` from `npm ls`, or the commit for the docs site), the smallest
reproduction you have, and what an attacker gains. A proof of concept helps; a CVSS score is not
required.

## What is in scope

- The published package `@omkarux/vela` on npm: the components, the stylesheets, the token
  files, the bridges and the shipped `guidelines/`.
- The docs site at https://omkarpkh.github.io/vela/ and the demo it is built from.
- The scripts in `scripts/`, including the generated Figma Plugin API scripts.
- The CI and release pipeline in `.github/workflows/`.

Out of scope: the Figma library file itself (report it to Figma if the issue is in Figma), the
third-party packages Vela depends on for development (report those upstream; tell us too if
Vela's use of them is the problem), and findings that need a compromised npm account or GitHub
account to begin with.

## What to expect

Vela has one maintainer and no security team. Honest expectations:

- An acknowledgement within 7 days.
- An assessment, and a fix or a plan for one, within 30 days of acknowledgement. Complex issues
  may take longer; you will be told if so.
- A fix ships as a patch release, with a changelog entry that credits you unless you ask
  otherwise, and a GitHub security advisory where the issue warrants one.

If you hear nothing in 14 days, send the email again. Silence is a missed email, not a decision.

## No bounty

There is no bug bounty programme and no payment for reports. Credit is given in the changelog
and the advisory.

## Supported versions

Only the latest published minor receives fixes. Vela is at 0.x; an older 0.x line is not
patched.
