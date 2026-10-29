/**
 * The spring behind `--vela-ease-spring`.
 *
 * DTCG 2025.10 has no spring type and CSS has no spring timing function, so the token keeps the
 * three physical source values (stiffness, damping, mass) in its vendor extension, and this
 * module turns them into a CSS `linear()` easing at token build time. Nothing runs at runtime:
 * the browser interpolates the points like any other timing function, so the motion stays a CSS
 * transition — interruptible, compositor-friendly, slowed by the reduced-motion collapse.
 *
 * The model is a damped harmonic oscillator released from rest at 0 towards 1:
 *
 *   m·x'' + c·x' + k·(x − 1) = 0,   x(0) = 0,   x'(0) = 0
 *
 * solved in closed form for all three regimes (under-, critically and over-damped), sampled every
 * millisecond across the transition's duration, and reduced with Ramer–Douglas–Peucker so the
 * string carries only the points the shape needs. The curve is drawn over a fixed duration (the
 * transition's own), so the spring has to have settled by then: `springLinear` refuses a spring
 * still more than `settle` away from 1 at the end, rather than snapping a visible jump.
 */

/** Position at time t (seconds) of the spring released from 0 towards 1. */
export function springAt({ stiffness: k, damping: c, mass: m }, t) {
  const w0 = Math.sqrt(k / m)
  const zeta = c / (2 * Math.sqrt(k * m))
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const s = Math.sqrt(zeta * zeta - 1)
  const r1 = -w0 * (zeta - s)
  const r2 = -w0 * (zeta + s)
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1)
}

/** The damping ratio ζ: below 1 the spring overshoots once and settles; at 1 or above it never overshoots. */
export const dampingRatio = ({ stiffness: k, damping: c, mass: m }) => c / (2 * Math.sqrt(k * m))

const check = (p) => {
  for (const key of ['stiffness', 'damping', 'mass']) {
    if (typeof p?.[key] !== 'number' || !(p[key] > 0)) throw new Error(`spring: ${key} must be a positive number, got ${JSON.stringify(p?.[key])}`)
  }
}

/** Perpendicular distance from b to the segment a–c, in the curve's own (time fraction, progress) space. */
const distance = (a, b, c) => {
  const dx = c[0] - a[0]
  const dy = c[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(b[0] - a[0], b[1] - a[1])
  return Math.abs(dy * b[0] - dx * b[1] + c[0] * a[1] - c[1] * a[0]) / len
}

/** Ramer–Douglas–Peucker: keep the points a straight segment cannot stand in for. */
function simplify(points, tolerance) {
  if (points.length < 3) return points
  let index = 0
  let max = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = distance(points[0], points[i], points[points.length - 1])
    if (d > max) { max = d; index = i }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]]
  const left = simplify(points.slice(0, index + 1), tolerance)
  const right = simplify(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

const round = (n, places) => {
  const f = 10 ** places
  const r = Math.round(n * f) / f
  return Object.is(r, -0) ? 0 : r
}

/**
 * The spring as a CSS `linear()` easing over `durationMs`.
 *
 * Returns { css, points, overshoot, residual, zeta }:
 *   css        the `linear(...)` string
 *   points     [timeFraction, progress] pairs, time strictly increasing, from [0, 0] to [1, 1]
 *   overshoot  how far past 1 the spring travels (0.0134 is 1.34%)
 *   residual   |x − 1| at the end of the duration, before the last point is pinned to 1
 *
 * Options: `settle` (default 0.002) is the largest residual allowed — the last point is pinned to
 * exactly 1, so the residual is the size of the jump the curve would make; `tolerance` (default
 * 0.001) is how far the simplified polyline may stray from the true curve.
 */
export function springLinear(params, durationMs, { settle = 0.002, tolerance = 0.001 } = {}) {
  check(params)
  if (!(durationMs > 0)) throw new Error(`spring: duration must be a positive number of milliseconds, got ${durationMs}`)
  const steps = Math.round(durationMs)
  const samples = []
  let overshoot = 0
  for (let i = 0; i <= steps; i++) {
    const x = springAt(params, (i / steps) * (durationMs / 1000))
    overshoot = Math.max(overshoot, x - 1)
    samples.push([i / steps, x])
  }
  const residual = Math.abs(samples[steps][1] - 1)
  if (residual > settle) {
    throw new Error(
      `spring: stiffness ${params.stiffness}, damping ${params.damping}, mass ${params.mass} is still ${(residual * 100).toFixed(2)}% from rest ` +
        `after ${durationMs}ms (allowed ${(settle * 100).toFixed(2)}%). Stiffen it, damp it, or give it a longer duration.`,
    )
  }
  samples[steps] = [1, 1]
  const points = simplify(samples, tolerance).map(([t, x], i, all) => [i === all.length - 1 ? 1 : round(t, 4), i === 0 ? 0 : i === all.length - 1 ? 1 : round(x, 4)])
  const stops = points.map(([t, x], i) => (i === 0 ? '0' : i === points.length - 1 ? '1' : `${x} ${round(t * 100, 2)}%`))
  return { css: `linear(${stops.join(', ')})`, points, overshoot, residual, zeta: dampingRatio(params) }
}
