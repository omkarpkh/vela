import { test } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

test('is the rate stable, or is 35/40 noise', async ({ page, browserName }) => {
  test.setTimeout(900000)
  await page.goto(pathToFileURL(join(process.cwd(), 'decisions/press-feedback/prototype.html')).href)
  await page.evaluate(() => (document as any).fonts.ready)
  await page.evaluate(() => document.body.setAttribute('data-w', 'wide'))
  await page.waitForTimeout(500)
  const btn = page.locator('#base .btn')
  await btn.scrollIntoViewIfNeeded()
  await btn.evaluate((el: HTMLElement) => {
    const w = window as any; w.__h = 0
    el.addEventListener('click', () => w.__h++)
  })
  const runs: number[] = []
  for (let r = 0; r < 4; r++) {
    let lost = 0
    for (let i = 0; i < 40; i++) {
      const b = (await btn.boundingBox())!
      const pre = await page.evaluate(() => (window as any).__h)
      await page.mouse.move(b.x + 2, b.y + b.height / 2)
      await page.mouse.down(); await page.waitForTimeout(140); await page.mouse.up()
      await page.waitForTimeout(40)
      if (await page.evaluate(() => (window as any).__h) === pre) lost++
    }
    runs.push(lost)
  }
  const tot = runs.reduce((a, b) => a + b, 0)
  console.log(`  ${browserName}: ${runs.join(', ')} lost per 40  →  ${tot}/160 = ${(tot / 160 * 100).toFixed(0)}%`)
})
