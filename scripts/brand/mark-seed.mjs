/**
 * The release seed for Vela's brand assets (the Pulse mark's mood background). Not part of the
 * package: nothing under src/ imports it, and scripts/ is not in package.json `files`.
 *
 * A version's seed is fixed by its major and minor numbers, so a patch release keeps the stills
 * it already has and a minor or major release gets new ones (RELEASING.md):
 *   n     = major × 100 + minor
 *   lobes = n mod 24, or 24 when that is 0, and never under 3
 *   step  = lobes / 100
 */

/** @param {string} version a semver string such as "0.15.3" @returns {{ lobes: number, step: number }} */
export function markSeed(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(version))
  if (!m) throw new Error(`markSeed: not a semver version: ${version}`)
  const n = Number(m[1]) * 100 + Number(m[2])
  const lobes = Math.max(3, n % 24 || 24)
  return { lobes, step: lobes / 100 }
}

/** The seed as it is written in a file name: the step with two decimals, e.g. "0.15". */
export const seedLabel = (seed) => seed.step.toFixed(2)

/**
 * The stored shader (brand/mood-o.frag.glsl) is identified by its hash, so it is never edited. It
 * hard-codes the 0.15.0 seed in two places: 15 lobes (`15.*th`) and a 0.15 twist (`fi*.15`).
 * applySeed swaps in another seed's values at load time, in the shader's own number style, so the
 * 0.15.0 seed gives back the source unchanged. Each literal must occur exactly once, or it throws:
 * a changed shader cannot be seeded silently wrong.
 */
export function applySeed(source, seed) {
  const swaps = [
    [/\b15\.\*th\b/g, `${seed.lobes}.*th`],
    [/\bfi\*\.15\b/g, `fi*${seed.step.toFixed(2).replace(/^0/, '')}`],
  ]
  let out = source
  for (const [re, to] of swaps) {
    const hits = source.match(re)?.length ?? 0
    if (hits !== 1) throw new Error(`applySeed: expected ${re} exactly once in the shader, found ${hits}`)
    out = out.replace(re, to)
  }
  return out
}
