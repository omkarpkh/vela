/**
 * An experiment, not a gate (playground thread, "forced colours without Windows", step 2).
 * Runs on a GitHub-hosted Windows runner after the workflow has switched on a contrast theme.
 * It opens the built site in Edge **without** emulating forced colours, records whether the page
 * sees `forced-colors: active`, and screenshots the header and a component page. For comparison,
 * it also takes the same shots with Chromium's emulation, in light and in dark.
 *
 * Usage: node scripts/experiments/windows-contrast.mjs <base-url> <out-dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const [base = 'http://localhost:4173/', out = 'experiment-out'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const pages = [['home', ''], ['button', '#/components/button'], ['tabs', '#/components/tabs']]
const report = { when: new Date().toISOString(), runs: [] }

async function shoot(label, launch, emulate) {
  let browser
  try { browser = await chromium.launch(launch) } catch (e) { report.runs.push({ label, error: String(e.message || e).split('\n')[0] }); return }
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...(emulate ?? {}) })
  const page = await context.newPage()
  // Playwright emulates forced-colors: none by default; null hands it back to the system.
  if (!emulate) await page.emulateMedia({ forcedColors: null, colorScheme: null })
  for (const [name, hash] of pages) {
    await page.goto('about:blank')
    await page.goto(base + hash)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const seen = await page.evaluate(() => ({
      forcedColors: matchMedia('(forced-colors: active)').matches,
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
      canvas: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
    }))
    const file = `${label}-${name}.png`
    await page.screenshot({ path: join(out, file) })
    report.runs.push({ label, page: name, file, ...seen })
  }
  await browser.close()
}

// The real theme: Edge, no emulation, headless and then headed (headless may ignore the system theme).
await shoot('real-edge', { channel: 'msedge' })
await shoot('real-edge-headed', { channel: 'msedge', headless: false })
// Chromium's emulation, both schemes, for comparison.
await shoot('emulated-light', { channel: 'msedge' }, { forcedColors: 'active', colorScheme: 'light' })
await shoot('emulated-dark', { channel: 'msedge' }, { forcedColors: 'active', colorScheme: 'dark' })

writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
