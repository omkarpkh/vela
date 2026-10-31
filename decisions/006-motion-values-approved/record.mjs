// The recorder for decision 006's clips (media/*.mp4). Not part of any suite; kept so the clips can
// be made again after a change to any of the values.
//
// Run against the production build of the playground, served on port 4199:
//   npm run demo:build && npx vite preview --config vite.demo.config.ts --port 4199 --strictPort
//   npm i --prefix /tmp/rec @fontsource/open-sans@5      # Open Sans, served locally to the page
//   PW=$(node -p "require.resolve('playwright')") node decisions/006-motion-values-approved/record.mjs
// It writes .webm files to /tmp/rec/out; the committed .mp4s were made from them with
//   ffmpeg -i <name>.webm -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -movflags +faststart -an <name>.mp4
// Pass a clip's name (toast, overlays, controls) to record only that one.
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright')
import { readFileSync, mkdirSync, renameSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FONTS = '/tmp/rec/node_modules/@fontsource/open-sans/files'
const OUT = '/tmp/rec/out'
mkdirSync(OUT, { recursive: true })
const W = 1280, H = 720

const fontCss = [300, 400, 600].map((w) => `@font-face{font-family:'Open Sans';font-style:normal;font-weight:${w};font-display:block;src:url(https://fonts.local/${w}.woff2) format('woff2')}`).join('\n')

const ONLY = process.argv[2]
async function clip(name, run, zoom = 1) {
  if (ONLY && ONLY !== name) return
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: { dir: join(OUT, name), size: { width: W, height: H } } })
  const page = await ctx.newPage()
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fontCss }))
  await page.route('https://fonts.local/**', (r) => { const w = r.request().url().match(/(\d+)\.woff2/)[1]; r.fulfill({ contentType: 'font/woff2', body: readFileSync(join(FONTS, `open-sans-latin-${w}-normal.woff2`)) }) })
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort())
  await page.goto('http://localhost:4199/#/motion')
  await page.getByRole('heading', { level: 1, name: 'Motion review' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
  // The controls are 16px; at 1:1 a 0.9 press is a pixel and a half. Magnify the page 1.6×.
  if (zoom !== 1) await page.addStyleTag({ content: `html{zoom:${zoom}}` })
  await page.addStyleTag({ content: `
    #cur{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid rgba(10,108,125,.95);background:rgba(10,108,125,.12);pointer-events:none;z-index:2147483647;transition:transform .08s ease-out}
    #cur.down{transform:scale(.62);background:rgba(10,108,125,.45)}
    #cap{position:fixed;left:0;right:0;top:0;padding:12px 22px;z-index:2147483646;font:600 17px/1.4 'Open Sans',system-ui,sans-serif;color:#fff;background:rgba(17,20,22,.92);pointer-events:none}
    #cap small{display:block;font-weight:400;font-size:14px;opacity:.78;margin-top:2px}` })
  await page.evaluate(() => {
    const c = document.createElement('div'); c.id = 'cur'; document.body.appendChild(c)
    const cap = document.createElement('div'); cap.id = 'cap'; document.body.appendChild(cap)
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    addEventListener('mousedown', () => c.classList.add('down'), true)
    addEventListener('mouseup', () => c.classList.remove('down'), true)
    window.__cap = (t, s) => { cap.innerHTML = t + (s ? `<small>${s}</small>` : '') }
  })
  const cap = (t, s = '') => page.evaluate(([t, s]) => window.__cap(t, s), [t, s])
  const slow = async (on) => {
    const sw = page.getByRole('switch', { name: '×5 slow motion' }).first()
    // Clicked without scrolling: the switch sits at the top of the page, far from the section.
    if ((await sw.getAttribute('aria-checked') === 'true') !== on) { await sw.evaluate((el) => el.click()); await page.waitForTimeout(200) }
  }
  const moveTo = async (loc, dx = 0.5, dy = 0.5, steps = 25) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + b.width * dx, b.y + b.height * dy, { steps }) }
  await run({ page, cap, slow, moveTo })
  await page.waitForTimeout(600)
  await ctx.close(); await browser.close()
  const dir = join(OUT, name); const f = readdirSync(dir).find((x) => x.endsWith('.webm'))
  renameSync(join(dir, f), join(OUT, `${name}.webm`))
}

const scrollToSection = async (page, id) => {
  await page.locator(`#${id}`).evaluate((el) => { const top = el.getBoundingClientRect().top + scrollY - 64; scrollTo({ top, behavior: 'instant' }) })
  await page.waitForTimeout(400)
}

// 1 · Toast
await clip('toast', async ({ page, cap, slow, moveTo }) => {
  const raise = (s) => page.getByRole('group', { name: 'Raise a toast (light)' }).getByRole('button', { name: `Raise ${s}` })
  const region = page.locator('.vela-overlay-portal[data-theme="light"]').getByRole('region', { name: 'Notifications' })
  await scrollToSection(page, 'motion-toast')
  for (const speed of [false, true]) {
    await slow(speed)
    const tag = speed ? '×5 slow motion' : 'Real speed'
    await cap(`Toast · ${tag}`, 'Raise three: each enters from its edge; the older ones step back behind it, smaller')
    for (const s of ['Info', 'Success', 'Info']) { await moveTo(raise(s), 0.5, 0.5, 12); await raise(s).click(); await page.waitForTimeout(speed ? 1300 : 900) }
    await cap(`Toast · ${tag}`, 'Hover the stack: it spreads on the spring. Leave it: it closes up')
    const t = region.getByRole('dialog').first()
    await moveTo(t, 0.5, 0.5, 30); await page.waitForTimeout(speed ? 3500 : 1400)
    await page.mouse.move(700, 300, { steps: 30 }); await page.waitForTimeout(speed ? 3500 : 1400)
    if (!speed) { await cap('Toast', 'Waiting for the success and info toasts to time out (6 s)…'); await page.waitForTimeout(7000) }
  }
  await slow(false); await page.waitForTimeout(7000)
  await cap('Toast · real speed', 'A warning behind the front toast keeps the stack spread: a warning never times out')
  await moveTo(raise('Warning')); await raise('Warning').click(); await page.waitForTimeout(900)
  await moveTo(raise('Success')); await raise('Success').click(); await page.waitForTimeout(2600)
})

// 2 · Popover and Tooltip
await clip('overlays', async ({ page, cap, slow, moveTo }) => {
  await scrollToSection(page, 'motion-overlays')
  const sec = page.locator('section[aria-labelledby="motion-overlays"] .motion-frame[data-theme="light"]')
  for (const speed of [false, true]) {
    await slow(speed)
    const tag = speed ? '×5 slow motion' : 'Real speed'
    await cap(`Popover · ${tag}`, 'Press Filters: it grows out of the button from 96%, as it fades in; it leaves on a fade')
    const f = sec.getByRole('button', { name: 'Filters' })
    await moveTo(f); await page.waitForTimeout(300); await f.click(); await page.waitForTimeout(speed ? 2400 : 1200)
    { const fb = await sec.boundingBox(); await page.mouse.move(fb.x + fb.width * 0.85, fb.y + fb.height * 0.8, { steps: 25 }); await page.mouse.down(); await page.mouse.up() } await page.waitForTimeout(speed ? 2000 : 900)
    await cap(`Tooltip · ${tag}`, 'Rest on Export: after the 600ms wait it grows the same way, faster; it leaves on a fade')
    const e = sec.getByRole('button', { name: 'Export' })
    await moveTo(e); await page.waitForTimeout(speed ? 3400 : 1600)
    { const fb = await sec.boundingBox(); await page.mouse.move(fb.x + fb.width * 0.85, fb.y + fb.height * 0.8, { steps: 25 }) }; await page.waitForTimeout(speed ? 2000 : 900)
  }
})

// 3 · Checkbox, Radio Group, Toggle
await clip('controls', async ({ page, cap, slow, moveTo }) => {
  await scrollToSection(page, 'motion-controls')
  const sec = page.locator('section[aria-labelledby="motion-controls"] .motion-frame[data-theme="light"]')
  for (const speed of [false, true]) {
    await slow(speed)
    const tag = speed ? '×5 slow motion' : 'Real speed'
    const hold = async (loc, ms) => { await moveTo(loc, 0.5, 0.5); await page.waitForTimeout(250); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(speed ? 1800 : 700) }
    await cap(`Checkbox · ${tag}`, 'Press and hold: the box presses to 90%. Release: the tick scales in from half size')
    await hold(sec.locator('.vela-checkbox__box').first(), speed ? 1600 : 500)
    await cap(`Radio Group · ${tag}`, 'Choose another: the new dot scales in, the old one fades')
    await hold(sec.getByRole('radio', { name: 'Quarantine' }), speed ? 900 : 250)
    await hold(sec.getByRole('radio', { name: 'Monitor' }), speed ? 900 : 250)
    await cap(`Toggle · ${tag}`, 'Flip it: the track presses, the knob slides, the colour settles')
    await hold(sec.getByRole('switch', { name: 'Email alerts' }), speed ? 900 : 250)
    await hold(sec.getByRole('switch', { name: 'Email alerts' }), speed ? 900 : 250)
  }
  await slow(false)
  await cap('From the keyboard · real speed', 'Space on the checkbox, arrows in the radios, Space on the toggle: every change lands at once, nothing animates')
  await sec.getByRole('checkbox').first().focus(); await page.waitForTimeout(600)
  await page.keyboard.press('Space'); await page.waitForTimeout(800)
  await page.keyboard.press('Tab'); await page.waitForTimeout(500)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800)
  await page.keyboard.press('Tab'); await page.waitForTimeout(500)
  await page.keyboard.press('Space'); await page.waitForTimeout(800)
  await page.keyboard.press('Space'); await page.waitForTimeout(1200)
}, 1.6)
console.log('done')
