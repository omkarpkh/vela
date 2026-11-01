/**
 * What a component's still is made from, and the key that names it (npm run stills; the test in
 * src/styles/site-stills.test.ts). Shared by the script and the test, so the two cannot disagree.
 *
 * A still is stale when anything it was drawn from has changed: the component's own source and CSS
 * (its folder under src/components/ or src/headless/, or both, tests left out), and the resting form
 * that draws it (demo/shell/ComponentThumb.tsx, and this folder's harness for the overlays). The key
 * is the SHA-256 of those files, by path, in a fixed order, with the still's size. The PNG carries it
 * in a tEXt chunk, as the touch icon does (scripts/brand/touch-icon.mjs).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

/** The still's size in CSS pixels. Drawn at 2×; shown at this size, never scaled, so its words stay 12px or more. */
export const STILL = { width: 200, height: 120 }
/** The tEXt key the PNG names its source by. */
export const STILL_KEY = 'vela-source-sha256'
/** The folder the stills are served from, under demo/public/. */
export const STILL_DIR = 'stills'
export const THEMES = ['light', 'dark']
/** The files every still is drawn through. */
const SCENE_FILES = ['demo/shell/ComponentThumb.tsx', 'scripts/stills/harness.tsx']

/** Every built component, from the catalogue the site reads (demo/playground/catalog.ts): its id and source folder. */
export function components(root) {
  const src = readFileSync(join(root, 'demo/playground/catalog.ts'), 'utf8')
  return [...src.matchAll(/\{ id: '([^']+)', file: '[^']+', src: '([^']+)'/g)].map((m) => ({ id: m[1], src: m[2] }))
}

/** The files a still of this component is drawn from, by path from the root. */
export function sourcesOf(root, src) {
  const own = ['src/components', 'src/headless']
    .map((d) => `${d}/${src}`)
    .filter((d) => existsSync(join(root, d)) && statSync(join(root, d)).isDirectory())
    .flatMap((d) => readdirSync(join(root, d)).filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\./.test(f)).sort().map((f) => `${d}/${f}`))
  if (!own.length) throw new Error(`still-key: no source folder for ${src}`)
  return [...own, ...SCENE_FILES]
}

/** The key a still of this component must carry. */
export function stillKey(root, src) {
  const h = createHash('sha256')
  h.update(`${STILL.width}x${STILL.height}\n`)
  for (const f of sourcesOf(root, src)) { h.update(`${f}\n`); h.update(readFileSync(join(root, f))) }
  return h.digest('hex')
}

/** The two files of one still, by name: AVIF at 2× first, PNG at 1× as the fallback. */
export const stillFiles = (id, theme) => ({ avif: `${id}-${theme}@2x.avif`, png: `${id}-${theme}.png` })
