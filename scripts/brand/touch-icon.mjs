/**
 * npm run brand:touch-icon — renders brand/vela-app-icon.svg to demo/public/apple-touch-icon.png,
 * 180 × 180, the size iOS asks for. Run it when the app icon changes, and commit the result.
 *
 * The app icon is rendered as it is drawn, never redrawn: headless Chromium through Playwright
 * paints the file at 180px on a page the tile's own teal (primary-500, #0a6c7d), and the PNG is that
 * screenshot. iOS fills transparent pixels with black and applies its own corner mask, so a full-bleed
 * square in the tile's colour is what it needs: its mask rounds the corners, with no black slivers.
 *
 * The PNG carries the SHA-256 of the SVG it came from, in a tEXt chunk keyed `vela-source-sha256`.
 * src/styles/brand.test.ts reads it back and fails when the app icon has changed since the PNG was
 * written, so the two cannot drift apart.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = 'brand/vela-app-icon.svg'
const OUT = 'demo/public/apple-touch-icon.png'
const SIZE = 180
const SOURCE_KEY = 'vela-source-sha256'

const svg = readFileSync(join(root, SOURCE))
const sha = createHash('sha256').update(svg).digest('hex')

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 })
  // The file as an image, stretched to the square: its viewBox is 32 × 32, so nothing is cropped.
  const src = `data:image/svg+xml;base64,${svg.toString('base64')}`
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#0a6c7d"><img id="i" src="${src}" width="${SIZE}" height="${SIZE}" style="display:block"></body></html>`)
  await page.waitForFunction(() => document.getElementById('i').complete)
  const png = await page.locator('#i').screenshot({ animations: 'disabled' })
  writeFileSync(join(root, OUT), withText(png, SOURCE_KEY, sha))
  console.log(`brand:touch-icon  ${OUT}  ${SIZE} × ${SIZE}, from ${SOURCE} (sha256 ${sha.slice(0, 16)}…)`)
} finally {
  await browser.close()
}

/** The PNG with one tEXt chunk added after IHDR. Every chunk is length, type, data, CRC-32. */
function withText(png, key, value) {
  const ihdrEnd = 8 + 4 + 4 + png.readUInt32BE(8) + 4
  const data = Buffer.from(`${key}\0${value}`, 'latin1')
  const type = Buffer.from('tEXt', 'latin1')
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  type.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), 8 + data.length)
  // The image data is Chromium's, byte for byte.
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)])
}

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
