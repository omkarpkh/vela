// The recorder for decision 008's clip (media/dropdown-list.mp4). Not part of any suite; kept so the
// clip can be made again. Built the way decision 006's recorder is, and run the same way.
//
// Run against the production build of the playground, served on port 4199:
//   npm run demo:build && npx vite preview --config vite.demo.config.ts --port 4199 --strictPort
//   npm i --prefix /tmp/rec @fontsource/open-sans@5      # Open Sans, served locally to the page
//   PW=$(node -p "require.resolve('playwright')") node decisions/008-dropdown-list-overlay-motion/record.mjs
// It writes /tmp/rec/out/dropdown-list.webm; the committed .mp4 was made from it with
//   ffmpeg -i dropdown-list.webm -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -movflags +faststart -an dropdown-list.mp4
//
// What it shows. Four views of the Motion review page's Dropdown List, side by side: today's
// travel on the left, the proposed grow on the right, the light theme above and the dark below.
// Each view is the page itself in a frame, cut down to one theme's overlay frame. The right column
// is this branch exactly as built. The left column is the same build with today's three motion
// rules put back on top, copied unchanged from DropdownList.css at 8715db8 (TODAY, below), so the
// two differ by those rules and nothing else. All four lists are pressed together, by a pointer
// press dispatched into each view in the same moment: once opening below the trigger, once with
// the trigger near the foot of the view so the list flips above, at real speed and then through
// the page's own ×5 slow-motion switch. Focus rings are hidden in the views: only the one the
// window last focused would draw one, which would make one view differ for a reason that is not
// motion.
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright')
import { readFileSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const FONTS = '/tmp/rec/node_modules/@fontsource/open-sans/files'
const OUT = '/tmp/rec/out'
const BASE = process.env.BASE || 'http://localhost:4199'
mkdirSync(OUT, { recursive: true })
const W = 1280, H = 720
const CAP = 64, HEAD = 34
const VW = W / 2, VH = (H - CAP - HEAD) / 2

const fontCss = [300, 400, 600].map((w) => `@font-face{font-family:'Open Sans';font-style:normal;font-weight:${w};font-display:block;src:url(https://fonts.local/${w}.woff2) format('woff2')}`).join('\n')

// Today's motion, from src/headless/DropdownList/DropdownList.css at 8715db8, unchanged. Injected
// after the bundle, so its transition wins over the shared rule; its side-keyed starting style is
// more specific than the shared scale, so it wins too.
const TODAY = `
.vela-dropdown-list {
  transform-origin: var(--transform-origin);
  transition: opacity var(--vela-duration-base) var(--vela-ease-standard),
              transform var(--vela-duration-base) var(--vela-ease-standard);
}
.vela-dropdown-list[data-side='bottom'][data-starting-style] { opacity: 0; transform: translateY(calc(var(--vela-space-5) * -1)); }
.vela-dropdown-list[data-side='top'][data-starting-style] { opacity: 0; transform: translateY(var(--vela-space-5)); }
.vela-dropdown-list[data-ending-style] { opacity: 0; }
.vela-dropdown-list[data-instant],
.vela-dropdown-list[data-vela-instant] { transition: none; }`

const VIEWS = [
  { id: 'today-light', today: true, theme: 'light' },
  { id: 'proposed-light', today: false, theme: 'light' },
  { id: 'today-dark', today: true, theme: 'dark' },
  { id: 'proposed-dark', today: false, theme: 'dark' },
]

const shell = `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
html,body{margin:0;background:#111416;overflow:hidden}
#cap{position:absolute;left:0;right:0;top:0;height:${CAP}px;box-sizing:border-box;padding:10px 22px;font:600 17px/1.4 'Open Sans',system-ui,sans-serif;color:#fff;background:#111416}
#cap small{display:block;font-weight:400;font-size:14px;opacity:.78;margin-top:2px}
.head{position:absolute;top:${CAP}px;height:${HEAD}px;width:${VW}px;box-sizing:border-box;padding:6px 22px;font:600 14px/22px 'Open Sans',system-ui,sans-serif;color:#fff;background:#24292d}
.head span{font-weight:400;opacity:.8}
iframe{position:absolute;border:0;width:${VW}px;height:${VH}px;visibility:hidden}
body.ready iframe{visibility:visible}
#rule{position:absolute;left:${VW - 1}px;top:${CAP}px;width:2px;height:${H - CAP}px;background:#111416;z-index:2}
</style></head><body>
<div id="cap"></div>
<div class="head" style="left:0">Today <span>· a 5px step of travel, on ease-standard</span></div>
<div class="head" style="left:${VW}px">Proposed <span>· grows from 96%, on ease-out: Popover's rule</span></div>
${VIEWS.map((v, i) => `<iframe name="${v.id}" src="${BASE}/#/motion" style="left:${(i % 2) * VW}px;top:${CAP + HEAD + Math.floor(i / 2) * VH}px"></iframe>`).join('\n')}
<div id="rule"></div>
</body></html>`

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: { dir: join(OUT, 'dropdown-list'), size: { width: W, height: H } } })
await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fontCss }))
await ctx.route('https://fonts.local/**', (r) => { const w = r.request().url().match(/(\d+)\.woff2/)[1]; r.fulfill({ contentType: 'font/woff2', body: readFileSync(join(FONTS, `open-sans-latin-${w}-normal.woff2`)) }) })
await ctx.route('https://fonts.gstatic.com/**', (r) => r.abort())
await ctx.route(`${BASE}/__record-008.html`, (r) => r.fulfill({ contentType: 'text/html', body: shell }))
const page = await ctx.newPage()
await page.goto(`${BASE}/__record-008.html`)
const cap = (t, s = '') => page.evaluate(([t, s]) => { document.getElementById('cap').innerHTML = t + (s ? `<small>${s}</small>` : '') }, [t, s])
await cap('Dropdown List: today against the proposed grow', 'Loading…')

const frames = []
for (const v of VIEWS) {
  const f = page.frame({ name: v.id })
  await f.waitForLoadState()
  await f.getByRole('heading', { level: 1, name: 'Motion review' }).waitFor()
  await f.evaluate(() => document.fonts.ready)
  if (v.today) await f.addStyleTag({ content: TODAY })
  // Only this theme's overlay frame, and the list's portal, are drawn; the rest of the page keeps
  // its place, so the page scrolls as it always does. The page behind takes the frame's surface.
  await f.addStyleTag({ content: `
    html{scrollbar-width:none}
    body *{visibility:hidden}
    section[aria-labelledby="motion-overlays"] .motion-frame[data-theme="${v.theme}"],
    section[aria-labelledby="motion-overlays"] .motion-frame[data-theme="${v.theme}"] *,
    .vela-overlay-portal, .vela-overlay-portal *{visibility:visible}
    /* Only the view the window last focused would draw a focus ring, which says nothing about
       motion and would make one of the four look different. */
    .vela-root :focus-visible{outline:none}
    #ring{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid rgba(10,108,125,.95);background:rgba(10,108,125,.12);pointer-events:none;z-index:2147483647;visibility:visible;opacity:0;transition:opacity .12s ease-out}
    #ring.on{opacity:1}` })
  await f.evaluate((theme) => {
    const frame = document.querySelector(`section[aria-labelledby="motion-overlays"] .motion-frame[data-theme="${theme}"]`)
    document.documentElement.style.background = getComputedStyle(frame).backgroundColor
    document.body.style.background = 'transparent'
    const r = document.createElement('div'); r.id = 'ring'; document.body.appendChild(r)
  }, v.theme)
  frames.push(f)
}

const all = (fn, arg) => Promise.all(frames.map((f, i) => f.evaluate(fn, [VIEWS[i].theme, arg])))
// Scroll each view so the list's trigger sits `y` px from the top of the view.
const place = (y) => all(([theme, y]) => {
  const t = [...document.querySelectorAll(`section[aria-labelledby="motion-overlays"] .motion-frame[data-theme="${theme}"] button`)].find((b) => b.textContent.trim() === 'Switch View')
  scrollBy({ top: t.getBoundingClientRect().top - y, behavior: 'instant' })
}, y)
// A pointer press on the trigger, the way a mouse makes one: Base UI's menu opens on the
// mousedown, and the click that follows has a detail of 1, so it is not taken for the keyboard.
const press = () => all(([theme]) => {
  const t = [...document.querySelectorAll(`section[aria-labelledby="motion-overlays"] .motion-frame[data-theme="${theme}"] button`)].find((b) => b.textContent.trim() === 'Switch View')
  const b = t.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2
  const ring = document.getElementById('ring'); ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.classList.add('on')
  setTimeout(() => ring.classList.remove('on'), 260)
  const m = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, clientX: x, clientY: y, detail: 1, view: window }
  const p = { ...m, pointerId: 1, pointerType: 'mouse', isPrimary: true }
  t.dispatchEvent(new PointerEvent('pointerdown', p)); t.dispatchEvent(new MouseEvent('mousedown', m))
  t.dispatchEvent(new PointerEvent('pointerup', { ...p, buttons: 0 })); t.dispatchEvent(new MouseEvent('mouseup', { ...m, buttons: 0 }))
  t.dispatchEvent(new MouseEvent('click', { ...m, buttons: 0 }))
})
const slow = (on) => all(([, on]) => {
  const named = (s) => s.getAttribute('aria-label') || document.getElementById(s.getAttribute('aria-labelledby') || '')?.textContent || s.closest('label')?.textContent || ''
  const sw = [...document.querySelectorAll('[role="switch"]')].find((s) => named(s).includes('slow motion'))
  if ((sw.getAttribute('aria-checked') === 'true') !== on) sw.click()
}, on)
const openCount = () => all(() => document.querySelectorAll('[role="menu"]').length)
const wait = (ms) => page.waitForTimeout(ms)

// The views are shown once all four are cut down, so the clip never shows the whole page loading.
await page.evaluate(() => document.body.classList.add('ready'))
await wait(400)
for (const speed of [false, true]) {
  await slow(speed); await wait(250)
  const tag = speed ? '×5 slow motion' : 'Real speed, 180ms'
  await cap(`Dropdown List · ${tag}`, 'Opening below: today steps 5px down into place; proposed grows out of the button from 96%')
  await place(44); await wait(speed ? 900 : 900)
  await press(); await wait(speed ? 2200 : 1100)
  if ((await openCount()).some((n) => n !== 1)) throw new Error('a list did not open')
  await cap(`Dropdown List · ${tag}`, 'Closing: both leave on a fade alone, unchanged')
  await press(); await wait(speed ? 1800 : 900)
  await cap(`Dropdown List · ${tag}`, 'Flipped above, no room below: today steps 5px up; proposed grows from its bottom edge')
  await place(VH - 40); await wait(speed ? 900 : 700)
  await press(); await wait(speed ? 2200 : 1100)
  await press(); await wait(speed ? 1800 : 900)
}
await slow(false)
await cap('Dropdown List', 'Unchanged: from the keyboard nothing animates, the highlight moves at once, the chevron stays still')
await wait(1800)

const video = await page.video().path()
await ctx.close(); await browser.close()
renameSync(video, join(OUT, 'dropdown-list.webm'))
console.log('done')
