# Releasing

One person releases, in this order. Every step is a command or a check, and a step that fails
stops the release. Nothing is published by hand from a laptop: the tag publishes.

## 1. Decide the version

Read `## [Unreleased]` in `CHANGELOG.md` against `VERSIONING.md`. A `### Changed — breaking`
entry makes it a minor announced as breaking (under 0.x); otherwise additions make a minor and
fixes alone make a patch.

## 2. Bump and regenerate

```bash
npm version X.Y.Z --no-git-tag-version   # package.json and package-lock.json only
npm run checks                            # demo/checks.json carries the version; verify diffs it
```

Commit nothing yet.

## 3. Gate

```bash
npm run verify     # tokens:check + rules:check + typecheck + tests + checks:check + build + pack-and-consume gate
npm run test:e2e   # 68 screenshots at four widths against the Linux baselines, plus the playground behaviour tests
```

Both green, with no baseline updated in this step. If a baseline must move, that happened in a
reviewed PR before the release, with its reason in the changelog.

## 4. Changelog

Rename `## [Unreleased]` to `## [X.Y.Z] — YYYY-MM-DD` and open a fresh, empty `## [Unreleased]`
above it. Read the entry as a consumer would: every number stated, every breaking change marked,
every deprecation naming its removal release.

Add `X.Y.Z` to `versions` in `scripts/figma/pages/published.json` and set `checked` to today.
The Figma Changelog page reads "on npm" from that file; the tag in step 8 publishes the version
and its "Check it landed" line confirms the registry agrees.

## 5. Decisions

If the release carries out a decision record, add what shipped and the version to that record's
bold header line (the `decisions/press-feedback` header is the model) and update its status in
`decisions/README.md`. If the release contradicts a record, write the superseding record first.

## 6. Pull request and merge

Open the release PR against `main`, titled `X.Y.Z — <one line from the changelog>`. CI runs
`verify`, `flutter` and `visual`. Merge when all three pass. The merge to `main` deploys the docs
site (job `pages`), so the site is at the new version before the package is.

## 7. Figma: write the file, don't publish yet

Run the pipeline against the library so the file matches the merge commit:

```bash
npm run tokens:figma        # if any token changed
npm run styles:figma        # if any text style changed
npm run guidelines:figma    # always: every description ends with the version stamp
npm run figma:build:pages   # always: the Changelog and Status pages, compiled from the merge commit
```

Rebuild the Changelog and Status pages: run `npm run -s figma:build:pages -- changelog` and
`-- status`, paste each script into the library file (Figma MCP `use_figma` or Scripter), and check
the stamp at the foot of each page names the merge commit. Each script rebuilds its page's frame in
place, so the frame keeps its id and re-running is safe.

**Don't publish the library yet.** The pages say the version is "On npm" and every description
names it, so the library is published only once the package is on the registry (step 9).

## 8. Tag

```bash
git tag vX.Y.Z <merge commit>
git push origin vX.Y.Z
```

If a tag can't be pushed from where you are, create it in GitHub's release form instead (step 10):
choose a new tag `vX.Y.Z` on the merge commit and publish the release. Either way the tag runs the
`publish` job: `verify`, `flutter` and `visual` again, then `npm publish` through npm Trusted
Publishing (OIDC, with a provenance attestation). No token exists and none should be created. If the
version is already on the registry the job skips, so re-running a tag is safe.

Check it landed: `npm view @omkarux/vela version`, and `npm run figma:build:pages -- --check-npm`
(exits 1 if the registry and `scripts/figma/pages/published.json` disagree).

## 9. Figma: publish the library

Only after step 8's checks pass. Publish the library from Figma. The publish description starts with
the version and copies the changelog entry: `X.Y.Z — <entry>`. Publishing the library is
approval-gated: the maintainer clicks it, not a script. Then record the date: a set whose state is
`built` in `scripts/sync-figma-descriptions.mjs` moves to `published`, and `npm run figma:map`
regenerates `guidelines/figma-map.json`.

## 10. GitHub release

Create a release from the tag. Title `X.Y.Z`, body copied from the changelog entry unchanged.
Link the Figma library and the docs site. This is the third place a breaking change is announced
(`GOVERNANCE.md`).

## 11. Afterwards

- Install the published version into a scratch app and render one component. The pack gate
  already did this against the tarball; this is against the registry.
- Open the docs site and confirm the version on `#/how`.
- If anything above was wrong, do not edit the release. Ship a patch with a changelog entry that
  says what was wrong.
