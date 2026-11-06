// The screenshots for decision 007 (media/*.png). Not part of any suite; kept so the comparison can
// be made again, before and after a change to the display face.
//
// Run against a production build of the site, served statically on a spare port, once per build:
//   npm run demo:build && npx vite preview --config vite.demo.config.ts --port 4391 --strictPort
//   npm i --prefix /tmp/rec @fontsource/open-sans@5      # Open Sans, served locally to the page
//   node decisions/007-display-face-open-sans/shots.mjs http://localhost:4391 before /tmp/rec/out
// It shoots the Overview facts, a How it is made step number and check count, and the Foundation
// page's three faces, at 1440 and 390 wide, in light and dark, at 2x, and prints the computed face of
// each number. Google Fonts is answered from the local Open Sans files, so the type is real Open Sans.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('@playwright/test')

const [base, when, out] = process.argv.slice(2)
const FILES = process.env.FONTS ?? '/tmp/rec/node_modules/@fontsource/open-sans/files/'
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'
const css = [300, 400, 600].flatMap((w) => [
  `@font-face{font-family:'Open Sans';font-style:normal;font-weight:${w};font-display:swap;src:url(https://fonts.gstatic.com/local/open-sans-latin-ext-${w}-normal.woff2) format('woff2');unicode-range:${LATIN_EXT};}`,
  `@font-face{font-family:'Open Sans';font-style:normal;font-weight:${w};font-display:swap;src:url(https://fonts.gstatic.com/local/open-sans-latin-${w}-normal.woff2) format('woff2');unicode-range:${LATIN};}`,
]).join('\n')

const TARGETS = [
  ['overview-facts', '/#/', '.ov-facts'],
  ['how-steps', '/#/how', '.how-step__head'],
  ['how-checks', '/#/how', '.how-checks__total'],
  ['foundation-faces', '/#/foundations/typography', '.fd-faces'],
]

const browser = await chromium.launch()
for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 2 })
    await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }))
    await ctx.route('https://fonts.gstatic.com/local/**', (r) => {
      const name = r.request().url().split('/').pop()
      r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(join(FILES, name)) })
    })
    const page = await ctx.newPage()
    for (const [name, path, sel] of TARGETS) {
      await page.goto(base + path)
      await page.evaluate(() => document.fonts.ready)
      const el = page.locator(sel).first()
      await el.waitFor()
      await el.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const loaded = await page.evaluate(() => document.fonts.check('300 32px "Open Sans"') && [...document.fonts].some((f) => f.family.includes('Open Sans') && f.status === 'loaded'))
      const face = await el.evaluate((e) => {
        const n = e.querySelector('.ov-fact__n, .how-checks__number, .how-step__n, .fd-face__sample.fd-face--display') ?? e
        const s = getComputedStyle(n)
        return `${s.fontFamily.split(',')[0]} ${s.fontWeight} ${s.fontSize} ${s.fontVariantNumeric}`
      })
      const file = `${name}-${width}-${theme}-${when}.png`
      await el.screenshot({ path: join(out, file) })
      console.log(file, '| Open Sans loaded:', loaded, '|', face)
    }
    await ctx.close()
  }
}
await browser.close()
