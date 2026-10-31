import { loadThemes, auditTheme } from './contrast-core.mjs'

const themes = loadThemes()
let failures = 0

for (const [name, map] of Object.entries(themes)) {
  console.log(`\n  ${name.toUpperCase()}\n  ${'-'.repeat(58)}`)
  for (const r of auditTheme(map, name)) {
    if (!r.pass) failures++
    // A negative case passes by failing: it is listed so that nobody ships it.
    const mark = r.negative ? (r.pass ? 'NEG ' : 'FAIL') : r.pass ? 'PASS' : 'FAIL'
    console.log(
      `  ${mark}  ${r.ratio.toFixed(2).padStart(6)}:1  (min ${r.min})  ${r.label}`,
    )
  }
}

const negatives = Object.entries(themes).reduce((n, [name, map]) => n + auditTheme(map, name).filter((r) => r.negative).length, 0)
console.log(`\n  ${failures === 0 ? `All pairs meet WCAG 2.1 AA${negatives ? `; ${negatives} negative case(s) stay below it, as listed` : ''}.` : `${failures} pair(s) did not do what they are listed for.`}\n`)
process.exit(failures === 0 ? 0 : 1)
