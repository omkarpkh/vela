import { loadThemes, auditTheme } from './contrast-core.mjs'

const themes = loadThemes()
let failures = 0

for (const [name, map] of Object.entries(themes)) {
  console.log(`\n  ${name.toUpperCase()}\n  ${'-'.repeat(58)}`)
  for (const r of auditTheme(map)) {
    if (!r.pass) failures++
    const mark = r.pass ? 'PASS' : 'FAIL'
    console.log(
      `  ${mark}  ${r.ratio.toFixed(2).padStart(6)}:1  (min ${r.min})  ${r.label}`,
    )
  }
}

console.log(`\n  ${failures === 0 ? 'All pairs meet WCAG 2.1 AA.' : `${failures} pair(s) below AA.`}\n`)
process.exit(failures === 0 ? 0 : 1)
