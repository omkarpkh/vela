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

## 5. Decisions

If the release carries out a decision record, add what shipped and the version to that record's
bold header line (the `decisions/press-feedback` header is the model) and update its status in
`decisions/README.md`. If the release contradicts a record, write the superseding record first.

## 6. Pull request and merge

Open the release PR against `main`, titled `X.Y.Z — <one line from the changelog>`. CI runs
`verify`, `flutter` and `visual`. Merge when all three pass. The merge to `main` deploys the docs
site (job `pages`), so the site is at the new version before the package is.

## 7. Figma

Run the pipeline against the library so the file matches the tag:

```bash
npm run tokens:figma        # if any token changed
npm run styles:figma        # if any text style changed
npm run guidelines:figma    # always: every description ends with the version stamp
```

Then publish the library from Figma. The publish description starts with the version and copies
the changelog entry: `X.Y.Z — <entry>`. Publishing the library is approval-gated: the maintainer
clicks it, not a script.

## 8. Tag

```bash
git tag vX.Y.Z <merge commit>
git push origin vX.Y.Z
```

The tag runs the `publish` job: `verify`, `flutter` and `visual` again, then `npm publish` through
npm Trusted Publishing (OIDC, with a provenance attestation). No token exists and none should be
created. If the version is already on the registry the job skips, so re-running a tag is safe.

Check it landed: `npm view @omkarux/vela version`.

## 9. GitHub release

Create a release from the tag. Title `X.Y.Z`, body copied from the changelog entry unchanged.
Link the Figma library and the docs site. This is the third place a breaking change is announced
(`GOVERNANCE.md`).

## 10. Afterwards

- Install the published version into a scratch app and render one component. The pack gate
  already did this against the tarball; this is against the registry.
- Open the docs site and confirm the version on `#/how`.
- If anything above was wrong, do not edit the release. Ship a patch with a changelog entry that
  says what was wrong.
