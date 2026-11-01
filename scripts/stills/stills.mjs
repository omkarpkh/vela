/**
 * npm run stills — draws every built component's still for the site's thumbnails: the Next cards on
 * a component's tabs and the "Where it sits" boxes on a proposal (slice 7). Run it when a component's
 * source, its CSS or its resting form changes, and commit the result; src/styles/site-stills.test.ts
 * fails until you do.
 *
 * The pattern is the brand stills' (scripts/brand/stills.mjs): headless Chromium through Playwright
 * renders the page, the PNG is the master, and Python encodes it (scripts/stills/encode-stills.py).
 * Here the page is scripts/stills/harness.html, served by Vite from the source, so the still is the
 * real component, as built now: its resting form at its real size, in a frame of the still's size
 * (still-key.mjs), at 2×. Each still is written twice, to demo/public/stills/:
 *   <id>-<light|dark>@2x.avif  AVIF at 2×, what a browser takes first
 *   <id>-<light|dark>.png      PNG at 1×, the fallback, carrying the key of what it was drawn from
 *
 * The font is the site's, Open Sans from Google Fonts. Where that is blocked, `--fonts <dir>` serves
 * it from local woff2 files named as @fontsource names them (open-sans-latin-400-normal.woff2). The
 * script refuses to draw a still before Open Sans has loaded.
 *
 * Options:
 *   --only <id,id>  draw these components only (the rest are left as they are)
 *   --fonts <dir>   the local Open Sans files, when Google Fonts is out of reach
 */
import { mkdirSync, mkdtempSync, writeFileSync, readdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { STILL, STILL_DIR, THEMES, components, stillKey, stillFiles } from './still-key.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null }
const only = arg('--only')?.split(',')
const fonts = arg('--fonts') ? resolve(arg('--fonts')) : null
const outDir = join(root, 'demo/public', STILL_DIR)
const masters = mkdtempSync(join(tmpdir(), 'vela-component-stills-'))
const kb = (n) => `${(n / 1000).toFixed(1)} kB`

const all = components(root)
const todo = only ? all.filter((c) => only.includes(c.id)) : all
if (only && todo.length !== only.length) throw new Error(`stills: no component called ${only.filter((o) => !all.some((c) => c.id === o)).join(', ')}`)
mkdirSync(outDir, { recursive: true })
// A still for a component that is no longer built goes.
if (!only) for (const f of readdirSync(outDir)) if (!all.some((c) => f.startsWith(`${c.id}-`) && THEMES.some((t) => Object.values(stillFiles(c.id, t)).includes(f)))) rmSync(join(outDir, f))

const fontCss = () => {
  let css = ''
  for (const w of [300, 400, 600]) {
    const f = `open-sans-latin-${w}-normal.woff2`
    if (existsSync(join(fonts, f))) css += `@font-face{font-family:'Open Sans';font-style:normal;font-weight:${w};font-display:block;src:url(https://fonts.gstatic.com/local/${f}) format('woff2');}\n`
  }
  return css
}

const server = await createServer({ root, configFile: false, logLevel: 'warn', plugins: [react()], optimizeDeps: { entries: ['scripts/stills/harness.html'] }, server: { port: 0, host: '127.0.0.1' } })
await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch()
const jobs = []
try {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: STILL, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: 'reduce' })
    if (fonts) {
      const css = fontCss()
      await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }))
      await ctx.route(/fonts\.gstatic\.com/, (r) => r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(join(fonts, r.request().url().split('/').pop())) }))
    }
    const page = await ctx.newPage()
    for (const { id, src } of todo) {
      await page.goto(`${base}scripts/stills/harness.html?id=${id}&theme=${theme}&w=${STILL.width}&h=${STILL.height}`)
      await page.waitForFunction(() => window.__stillReady === true, null, { timeout: 30_000 })
      if (!(await page.evaluate(() => document.fonts.check('16px "Open Sans"')))) throw new Error('stills: Open Sans did not load; pass --fonts <dir> where Google Fonts is blocked')
      if (await page.getByText(/^No still for/).count()) throw new Error(`stills: the harness has no resting form for ${id}`)
      // The Tooltip shows on a pointer resting on its trigger.
      const hover = page.locator('[data-still-hover]')
      if (await hover.count()) { await hover.hover(); await page.getByRole('tooltip').waitFor() }
      // An overlay that opens takes focus; a still shows it at rest, with no focus ring.
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
      // Let anything placed or raised settle (reduced motion: no transitions run).
      await page.waitForTimeout(250)
      const png = await page.screenshot({ animations: 'disabled', caret: 'hide' })
      const master = join(masters, `${id}-${theme}@2x.png`)
      writeFileSync(master, png)
      jobs.push({ master, key: stillKey(root, src) })
    }
    await ctx.close()
  }
} finally {
  await browser.close()
  await server.close()
}

const py = spawnSync('python3', ['-I', join(root, 'scripts/stills/encode-stills.py'), outDir, ...jobs.flatMap((j) => [j.master, j.key])], { encoding: 'utf8' })
if (py.status !== 0) throw new Error(`encode-stills.py failed (status ${py.status}):\n${py.stderr}`)
let total = 0
for (const line of py.stdout.trim().split('\n')) {
  const r = JSON.parse(line)
  total += r.bytes
  console.log(`  ${r.file.padEnd(34)} ${r.size.padEnd(10)} ${kb(r.bytes)}${r.quality ? `  quality ${r.quality}` : ''}`)
}
console.log(`stills  ${jobs.length} stills, ${jobs.length * 2} files, ${kb(total)} in all, in demo/public/${STILL_DIR}/`)
