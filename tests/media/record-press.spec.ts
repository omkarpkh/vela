/**
 * Regenerates decisions/press-feedback/media/press-comparison.webm.
 *
 * Not part of the suite — `npm run test:e2e` ignores tests/media. Run it directly:
 *   npx playwright test tests/media --reporter=line
 * then copy test-results/<dir>/video.webm over the file in decisions/press-feedback/media.
 *
 * Playwright records the video and ships its own ffmpeg, so nothing else is needed: no screen
 * recorder, no manual capture, and the clip re-records itself when the press changes. Playwright
 * draws no cursor of its own, so one is injected here along with the caption bar, and the press
 * transition is slowed 4x — captioned as such, because a press at its real speed is 120ms and
 * the whole point is to watch the edges move.
 */
import { test } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

test.use({
  video: { mode: 'on', size: { width: 1200, height: 675 } },
  viewport: { width: 1200, height: 675 },
  reducedMotion: 'no-preference',
})

test('press comparison', async ({ page }) => {
  await page.goto(pathToFileURL(join(process.cwd(), 'decisions/press-feedback/prototype.html')).href)
  await page.evaluate(() => (document as any).fonts.ready)

  await page.evaluate(() => {
    document.body.setAttribute('data-w', 'wide')
    const css = document.createElement('style')
    css.textContent = `
      #cur{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
        border:2px solid rgba(10,108,125,.9);background:rgba(10,108,125,.12);
        pointer-events:none;z-index:9999;transition:transform .08s ease-out}
      #cur.down{transform:scale(.62);background:rgba(10,108,125,.4)}
      #cap{position:fixed;left:0;right:0;bottom:0;padding:14px 22px;z-index:9998;
        font:500 17px/1.4 system-ui,sans-serif;color:#fff;background:rgba(17,20,22,.92)}
      #cap small{display:block;font-weight:400;font-size:13.5px;opacity:.72;margin-top:3px}
      .btn{transition-duration:480ms !important}`
    document.head.appendChild(css)
    const c = document.createElement('div'); c.id = 'cur'; document.body.appendChild(c)
    const cap = document.createElement('div'); cap.id = 'cap'; document.body.appendChild(cap)
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    addEventListener('mousedown', () => c.classList.add('down'), true)
    addEventListener('mouseup', () => c.classList.remove('down'), true)
    ;(window as any).__cap = (t: string, s: string) => { cap.innerHTML = t + (s ? `<small>${s}</small>` : '') }
  })

  const caption = (t: string, s = '') => page.evaluate(([t, s]) => (window as any).__cap(t, s), [t, s])
  const pressEdge = async (id: string, times = 3) => {
    const btn = page.locator(`#${id} .btn`)
    await btn.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    for (let i = 0; i < times; i++) {
      const b = (await btn.boundingBox())!
      await page.mouse.move(b.x + b.width - 60, b.y + b.height / 2, { steps: 20 })
      await page.mouse.move(b.x + 3, b.y + b.height / 2, { steps: 28 })
      await page.waitForTimeout(260)
      await page.mouse.down()
      await page.waitForTimeout(900)
      await page.mouse.up()
      await page.waitForTimeout(700)
    }
  }

  await caption('Ten ways for a button to say “pressed”', 'Each card counts its own presses. Motion slowed 4× throughout.')
  await page.waitForTimeout(2400)

  await caption('What most design systems ship: shrink from the centre', 'Press just inside the edge, and watch the counter marked “lost”.')
  await pressEdge('base')
  await caption('Three presses. Nothing landed.', 'The button shrank out from under the pointer, so every release hit the page behind it.')
  await page.waitForTimeout(2600)

  await caption('The same 3%, pivoted on your finger instead', 'The pixel you pressed becomes the one point that cannot move.')
  await pressEdge('a')
  await caption('Three presses. Three landed.', 'Same shrink, same duration, same 3%. Only the pivot changed.')
  await page.waitForTimeout(2800)
})
