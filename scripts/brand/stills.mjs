/**
 * npm run brand:stills — renders the four Overview mood stills from brand/mood-o.frag.glsl and
 * writes them to demo/public/brand/ as AVIF and WebP, each at 1× and 2×, named with the seed:
 *   mood-<desktop|phone>-<light|dark>-<seed>@<1|2>x.<avif|webp>
 * Run it when the minor or major version changes (RELEASING.md) and commit the result.
 *
 * The recipe is the Figma-library thread's (1 Nov 2026), unchanged: headless Chromium through
 * Playwright, WebGL 2 on SwiftShader, the uniforms and palettes below, desktop 1600 × 520 and phone
 * 720 × 900, rendered at 2×. The stored shader draws the 0.15.0 seed; applySeed writes this
 * version's seed into it as it is loaded, and the file itself is never edited (its hash identifies it).
 *
 * The 2× PNG is the master only: 4 to 5.6 MB, because the grain is per pixel, and never committed.
 * Its hash is compared with the recipe's, which was made on SwiftShader: a different renderer can
 * shift the grain by a few levels, so a mismatch there is not by itself a fault. The encoding is
 * scripts/brand/encode-stills.py (Python 3 with Pillow 11 or later, built with AVIF and WebP): the
 * 1× is the master resized with LANCZOS, not a second render, and every file is held to 250 kB.
 *
 * Options:
 *   --png <dir>    keep the PNG masters in <dir> (by default they go to a temporary folder)
 *   --crops <dir>  write one PNG per still to <dir>: 400 × 400 crops of the rings' corner from the
 *                  master, the 2× AVIF and the 2× WebP, side by side
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, mkdtempSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { markSeed, applySeed, seedLabel } from './mark-seed.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? resolve(process.argv[i + 1]) : null }
const pngDir = arg('--png') ?? mkdtempSync(join(tmpdir(), 'vela-stills-'))
const cropDir = arg('--crops')
const STILLS = [
  // [name, width, height, surface, expected SHA-256 prefix of the PNG on SwiftShader, 0.15.0 seed]
  ['desktop', 1600, 520, 'light', 'a5a8e666b8dfd650'],
  ['desktop', 1600, 520, 'dark', 'e4029771dc5bfcee'],
  ['phone', 720, 900, 'light', '51a9aa295f262a59'],
  ['phone', 720, 900, 'dark', 'a613390c9b415a7a'],
]

// The render page, kept here rather than as a file. render() is the recipe's own, as given.
const PAGE = `<!DOCTYPE html><html><body style="margin:0"><canvas id="c"></canvas>
<script>
async function render(w,h,surf,seal,src){
  const frag = src.split('\\n').filter(l=>!l.startsWith('//')).join('\\n');
  const c=document.getElementById('c'); c.width=w; c.height=h;
  const gl=c.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
  const vs=\`#version 300 es
in vec2 p; void main(){gl_Position=vec4(p,0,1);}\`;
  const mk=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o;};
  const pr=gl.createProgram();gl.attachShader(pr,mk(gl.VERTEX_SHADER,vs));gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,frag));gl.linkProgram(pr);gl.useProgram(pr);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);
  const P={cover:['#0a6c7d','#075462','#2f9db3','#35558a',0],light:['#f7f9f9','#eef2f2','#0a6c7d','#dde3e4',1],dark:['#1b2225','#11171a','#187e91','#262e31',0]};
  const p=P[surf]; const U=n=>gl.getUniformLocation(pr,n);
  gl.uniform2f(U('uRes'),w,h); gl.uniform1f(U('uT'),0);
  gl.uniform3fv(U('uBase'),hex(p[0]));gl.uniform3fv(U('uDeep'),hex(p[1]));gl.uniform3fv(U('uLine'),hex(p[2]));gl.uniform3fv(U('uAlt'),hex(p[3]));
  gl.uniform1f(U('uLight'),p[4]);gl.uniform1f(U('uQuiet'),0);gl.uniform1f(U('uSeal'),seal);gl.uniform1f(U('uStyle'),1);gl.uniform1f(U('uLit'),1);gl.uniform2f(U('uSealC'),.12,.98);
  gl.viewport(0,0,w,h); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  return c.toDataURL('image/png');
}
</script></body></html>`

const bytes = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const kb = (n) => `${(n / 1000).toFixed(1)} kB`

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const seed = markSeed(pkg.version)
const label = seedLabel(seed)
const source = applySeed(readFileSync(join(root, 'brand/mood-o.frag.glsl'), 'utf8'), seed)
const outDir = join(root, 'demo/public/brand')
mkdirSync(outDir, { recursive: true })
// Stills from an earlier seed go: the folder only ever holds this version's.
for (const f of readdirSync(outDir)) if (/^mood-.*@[12]x\.(avif|webp)$/.test(f)) rmSync(join(outDir, f))
for (const d of [pngDir, cropDir]) if (d) mkdirSync(d, { recursive: true })

console.log(`brand:stills  version ${pkg.version} → seed ${label} (${seed.lobes} lobes, step ${seed.step})`)
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let mismatches = 0
const masters = []
try {
  const page = await browser.newPage()
  await page.setContent(PAGE)
  for (const [name, w, h, surface, expected] of STILLS) {
    const png = bytes(await page.evaluate(([w, h, s, src]) => render(w, h, s, 1, src), [w * 2, h * 2, surface, source]))
    const hash = sha(png).slice(0, 16)
    // The recipe's hashes are for the 0.15.0 seed only.
    const verdict = label !== '0.15' ? 'no reference for this seed' : hash === expected ? 'matches the recipe' : `differs from the recipe (${expected})`
    if (label === '0.15' && hash !== expected) mismatches++
    const file = join(pngDir, `mood-${name}-${surface}-${label}@2x.png`)
    writeFileSync(file, png)
    masters.push(file)
    console.log(`  master ${name} ${surface}  ${w * 2} × ${h * 2}  PNG ${kb(png.length)}, sha256 ${hash}… ${verdict}`)
  }
} finally {
  await browser.close()
}

const py = spawnSync('python3', ['-I', join(root, 'scripts/brand/encode-stills.py'), outDir, ...(cropDir ? ['--crops', cropDir] : []), ...masters], { encoding: 'utf8' })
if (py.status !== 0) throw new Error(`encode-stills.py failed (status ${py.status}):\n${py.stderr}`)
for (const line of py.stdout.trim().split('\n')) {
  const r = JSON.parse(line)
  const q = r.quality === r.start ? `quality ${r.quality}` : `quality ${r.quality} (lowered from ${r.start} to fit)`
  console.log(`  ${r.file}  ${r.size}  ${kb(r.bytes)}  ${q}${r.fits ? '' : '  OVER THE 250 kB BUDGET'}`)
}
if (mismatches) console.log(`  ${mismatches} of 4 PNG hashes differ from the recipe's. On a renderer other than SwiftShader that is expected: compare by eye.`)
