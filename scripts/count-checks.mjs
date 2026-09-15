// Writes demo/checks.json — how many automated checks guard every change — from the test
// runners' own output, so the number the site shows is the number CI runs. Part of `verify`,
// and diffed there like the generated CSS, so a stale count fails the build.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const pkg = createRequire(import.meta.url)('../package.json')
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

// Vitest: `npm test` writes .checks/vitest.json; run it here only when that is missing.
if (!existsSync('.checks/vitest.json')) sh('npx vitest run --reporter=json --outputFile=.checks/vitest.json')
const vitest = JSON.parse(readFileSync('.checks/vitest.json', 'utf8'))

// Playwright: list the tests without running them.
const pw = JSON.parse(sh('npx playwright test --list --reporter=json'))
const browser = { visual: 0, e2e: 0, docs: 0 }
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    const n = Math.max(1, spec.tests?.length ?? 1)
    const file = spec.file ?? suite.file ?? ''
    if (file.includes('docs.spec')) browser.docs += n
    else if (file.includes('/visual/') || file.startsWith('visual/')) browser.visual += n
    else browser.e2e += n
  }
  for (const s of suite.suites ?? []) walk(s)
}
for (const s of pw.suites ?? []) walk(s)

// Flutter: the package smoke tests, counted statically (flutter is not installed everywhere).
const flutter = readdirSync('flutter/test').filter((f) => f.endsWith('.dart'))
  .reduce((n, f) => n + (readFileSync(`flutter/test/${f}`, 'utf8').match(/^\s*test\(/gm) ?? []).length, 0)

const out = {
  version: pkg.version,
  unit: vitest.numTotalTests,
  browser: { ...browser, total: browser.visual + browser.e2e + browser.docs },
  flutter,
}
out.total = out.unit + out.browser.total + out.flutter
writeFileSync('demo/checks.json', JSON.stringify(out, null, 2) + '\n')
console.log(`checks.json: ${out.total} checks — ${out.unit} unit, ${out.browser.total} browser (${browser.visual} visual, ${browser.e2e} e2e, ${browser.docs} docs), ${flutter} flutter`)
