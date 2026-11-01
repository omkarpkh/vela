/**
 * npm run brand:stills — renders the four Overview mood stills from brand/mood-o.frag.glsl and
 * writes them as WebP to demo/public/brand/, named with the release seed:
 *   mood-<desktop|phone>-<light|dark>-<seed>@2x.webp
 * Run it when the minor or major version changes (RELEASING.md) and commit the result.
 *
 * The recipe is the Figma-library thread's (1 Nov 2026), unchanged: headless Chromium through
 * Playwright, WebGL 2 on SwiftShader, the uniforms and palettes below, desktop 1600 × 520 and phone
 * 720 × 900, both at 2×. The stored shader draws the 0.15.0 seed; applySeed writes this version's
 * seed into it as it is loaded, and the file itself is never edited (its hash identifies it).
 *
 * The PNGs are 4 to 5.6 MB each (the grain is per pixel), so they are not committed. Their hashes
 * are compared with the recipe's, which were made on SwiftShader: a different renderer can shift
 * the grain by a few levels, so a mismatch there is not by itself a fault.
 *
 * Options:
 *   --png <dir>      also keep the PNGs, in <dir>
 *   --compare <dir>  also encode WebP at 82 and 95, and write one PNG per still to <dir> with
 *                    400 × 400 crops of the rings' corner side by side: PNG, WebP 82, 90, 95
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { markSeed, applySeed, seedLabel } from './mark-seed.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? resolve(process.argv[i + 1]) : null }
const pngDir = arg('--png')
const compareDir = arg('--compare')

const QUALITY = 0.9 // the shipped WebP
const COMPARE = [0.82, 0.9, 0.95]
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
// The canvas still holds the last render (preserveDrawingBuffer), so it encodes again as WebP.
function webp(q){ return document.getElementById('c').toDataURL('image/webp', q) }
// 400 × 400 from the bottom-right corner, where the rings are, of each image, side by side.
async function crops(urls, labels){
  const imgs = await Promise.all(urls.map(u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = u })));
  const S = 400, G = 16, T = 28, out = document.createElement('canvas');
  out.width = urls.length * S + (urls.length - 1) * G; out.height = S + T;
  const x = out.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, out.width, out.height);
  x.fillStyle = '#1b2225'; x.font = '16px sans-serif';
  imgs.forEach((i, k) => { x.drawImage(i, i.width - S, i.height - S, S, S, k * (S + G), T, S, S); x.fillText(labels[k], k * (S + G) + 4, 19) });
  return out.toDataURL('image/png');
}
</script></body></html>`

const bytes = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const seed = markSeed(pkg.version)
const label = seedLabel(seed)
const source = applySeed(readFileSync(join(root, 'brand/mood-o.frag.glsl'), 'utf8'), seed)
const outDir = join(root, 'demo/public/brand')
mkdirSync(outDir, { recursive: true })
// Stills from an earlier seed go: the folder only ever holds this version's.
for (const f of readdirSync(outDir)) if (/^mood-.*@2x\.webp$/.test(f)) rmSync(join(outDir, f))
for (const d of [pngDir, compareDir]) if (d) mkdirSync(d, { recursive: true })

console.log(`brand:stills  version ${pkg.version} → seed ${label} (${seed.lobes} lobes, step ${seed.step})`)
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let mismatches = 0
try {
  const page = await browser.newPage()
  await page.setContent(PAGE)
  for (const [name, w, h, surface, expected] of STILLS) {
    const png = bytes(await page.evaluate(([w, h, s, src]) => render(w, h, s, 1, src), [w * 2, h * 2, surface, source]))
    const hash = sha(png).slice(0, 16)
    // The recipe's hashes are for the 0.15.0 seed only.
    const verdict = label !== '0.15' ? 'no reference for this seed' : hash === expected ? 'matches the recipe' : `differs from the recipe (${expected})`
    if (label === '0.15' && hash !== expected) mismatches++
    const file = `mood-${name}-${surface}-${label}@2x.webp`
    const shipped = bytes(await page.evaluate((q) => webp(q), QUALITY))
    writeFileSync(join(outDir, file), shipped)
    console.log(`  ${file}  ${w * 2} × ${h * 2}  WebP ${QUALITY * 100}: ${kb(shipped.length)}  ·  PNG ${kb(png.length)}, sha256 ${hash}… ${verdict}`)
    if (pngDir) writeFileSync(join(pngDir, `mood-${name}-${surface}-${label}@2x.png`), png)
    if (compareDir) {
      const urls = [`data:image/png;base64,${png.toString('base64')}`]
      const labels = ['PNG']
      for (const q of COMPARE) {
        const d = await page.evaluate((q) => webp(q), q)
        console.log(`      WebP ${Math.round(q * 100)}: ${kb(bytes(d).length)}`)
        urls.push(d); labels.push(`WebP ${Math.round(q * 100)}`)
      }
      writeFileSync(join(compareDir, `crops-${name}-${surface}.png`), bytes(await page.evaluate(([u, l]) => crops(u, l), [urls, labels])))
    }
  }
} finally {
  await browser.close()
}
if (mismatches) console.log(`  ${mismatches} of 4 PNG hashes differ from the recipe's. On a renderer other than SwiftShader that is expected: compare by eye.`)
