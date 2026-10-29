#!/usr/bin/env node
/**
 * Doc-page lint — the page half of check-components.mjs.
 *
 * The page builders in scripts/figma/pages/ (compiled by build-pages.mjs) can only run inside
 * Figma. This runs them against the mock Plugin API and applies the reviewer rules of
 * check-components.mjs to the page frame they draw — spacing from the scale, every text styled,
 * every fill and stroke bound, radii bound, no default layer names, auto layout wherever a frame
 * has children — plus `component-on-doc-page`. A builder may waive a rule with
 * `// @allow <rule> <why>`; the waiver is printed, never silent.
 *
 *   --lint [page] [--json]              exit 1 on an unwaived violation. Runs in `npm test`.
 *   --dump <page> [--runs N] [--json]   the page frame after N runs (default 1), with every run's
 *                                       return value and the page's top-level frames, so a test can
 *                                       see that a second run rebuilds in place
 *
 * The changelog is built against pages/published.json, so the lint never needs the network.
 */
import { pathToFileURL } from 'node:url'
import { createMockFigma } from './mock-figma.mjs'
import { available, meta, generate } from './build-pages.mjs'
import { loadVariables, mockStyles, lint, dumpSource } from './check-components.mjs'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const DUMP = dumpSource({ fullText: true, links: true })

/** Run a page builder `runs` times in one mock file, as running it again in the library would. */
export async function buildPage(which, runs = 1) {
  const m = meta(which)
  const figma = createMockFigma({ variables: loadVariables(), styles: mockStyles(), pages: [m.page] })
  const script = generate(which)
  const results = []
  for (let i = 0; i < runs; i++) {
    const result = await new AsyncFunction('figma', script)(figma)
    const page = figma.root.children.find((p) => p.name === m.page)
    results.push({ result, topLevel: page.children.map((c) => ({ id: c.id, type: c.type, name: c.name })) })
  }
  const page = figma.root.children.find((p) => p.name === m.page)
  const frame = page.children.find((c) => c.type === 'FRAME' && c.name === m.page)
  if (!frame) throw new Error(`${which}: the builder did not draw a "${m.page}" frame`)
  return { figma, frame, meta: m, results, bytes: Buffer.byteLength(script, 'utf8') }
}

export async function lintPage(which) {
  const { figma, frame, meta: m, bytes } = await buildPage(which)
  const vars = await figma.variables.getLocalVariablesAsync()
  const nameOf = Object.fromEntries(vars.map((v) => [v.id, v.name]))
  frame._figma_varname = (id) => nameOf[id]
  return { problems: lint(frame, m.allow, { docPage: true }), allow: m.allow, bytes }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const json = args.includes('--json')
  const argv = args.filter((a) => a !== '--json')
  const run = async () => {
    if (argv[0] === '--lint') {
      const report = {}
      let failed = false
      for (const which of argv[1] ? [argv[1]] : available()) {
        report[which] = await lintPage(which)
        if (report[which].problems.some((p) => !p.waived)) failed = true
      }
      if (json) { console.log(JSON.stringify(report)); process.exit(failed ? 1 : 0) }
      for (const [which, r] of Object.entries(report)) {
        const bad = r.problems.filter((p) => !p.waived), ok = r.problems.filter((p) => p.waived)
        console.log(`${which}: ${bad.length ? bad.length + ' violation(s)' : 'clean'}${ok.length ? `, ${ok.length} waived` : ''} (${(r.bytes / 1024).toFixed(1)} KB)`)
        for (const p of bad) console.log(`  ✗ ${p.rule}  ${p.node}: ${p.what}`)
        for (const a of r.allow) console.log(`  · waived ${a.rule} — ${a.reason}`)
      }
      process.exit(failed ? 1 : 0)
    }
    if (argv[0] === '--dump') {
      const i = argv.indexOf('--runs')
      const runs = i === -1 ? 1 : Number(argv[i + 1])
      const { figma, frame, results, bytes } = await buildPage(argv[1], runs)
      const tree = await new AsyncFunction('figma', 'n', DUMP + '\nreturn await dump(n, -10);')(figma, frame)
      console.log(JSON.stringify({ bytes, runs: results, tree }, null, json ? 0 : 2)); return
    }
    console.error('usage: check-pages.mjs --lint [page] [--json] | --dump <page> [--runs N] [--json]'); process.exit(2)
  }
  run().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
