/**
 * The short loop for the case study: two cards, one press each, no page chrome.
 * Autoplays silently on the page, so it has to read in one pass with no controls and no sound.
 *
 *   RECORD=1 npx playwright test tests/media/record-loop.spec.ts --reporter=line
 */
import { test } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

test.use({ video: { mode: 'on', size: { width: 1000, height: 232 } }, viewport: { width: 1000, height: 232 } })


test('centre against anchored', async ({ page }) => {
  await page.goto(pathToFileURL(join(process.cwd(), 'decisions/press-feedback/prototype.html')).href)
  await page.evaluate(() => (document as any).fonts.ready)
  await page.evaluate(() => {
    document.body.setAttribute('data-w', 'wide')
    const css = document.createElement('style')
    css.textContent = `
      .head,.sub,.bar,.how,h1{display:none !important}
      .wrap{max-width:none;padding:0 18px}
        body{overflow:hidden}
      .grid{grid-template-columns:1fr 1fr !important;gap:20px}
      .card:not(#base):not(#a){display:none !important}
      .card .mech,.card .note{display:none !important}
      .card h2{font-size:15px;margin:0 0 14px}
      .stage{padding:6px 0 14px}
      .btn{transition-duration:520ms !important}
      #cur{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
        border:2px solid rgba(10,108,125,.9);background:rgba(10,108,125,.14);
        pointer-events:none;z-index:9999;transition:transform .08s ease-out}
      #cur.down{transform:scale(.62);background:rgba(10,108,125,.42)}
      .count{font-size:15px}`
    document.head.appendChild(css)
    const c = document.createElement('div'); c.id = 'cur'; document.body.appendChild(c)
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    addEventListener('mousedown', () => c.classList.add('down'), true)
    addEventListener('mouseup', () => c.classList.remove('down'), true)
    document.querySelectorAll('.card h2').forEach((h) => {
      h.textContent = h.parentElement?.id === 'base' ? 'Shrinks from the centre' : 'Shrinks from the cursor'
    })
  })
  await page.waitForTimeout(500)

  for (const id of ['base', 'a']) {
    const btn = page.locator(`#${id} .btn`)
    const b = (await btn.boundingBox())!
    await page.mouse.move(b.x + b.width - 40, b.y + b.height / 2, { steps: 14 })
    await page.mouse.move(b.x + 3, b.y + b.height / 2, { steps: 20 })
    await page.waitForTimeout(220)
    await page.mouse.down()
    await page.waitForTimeout(1100)          // hold, so the failure is a still frame not a blur
    await page.mouse.up()
    await page.waitForTimeout(650)
  }
  await page.waitForTimeout(1400)
})
