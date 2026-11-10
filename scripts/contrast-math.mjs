/**
 * WCAG 2.1 relative luminance, contrast and sRGB compositing, on #rgb / #rrggbb hex. No file
 * access and no Node imports, so the site's bundle can import it (demo/adopt-contrast.ts) and
 * measure with the same function `npm test` asserts PAIRS with. scripts/contrast-core.mjs
 * re-exports all three; import them from there in Node.
 */

export function toRgb(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(fgHex, bgHex) {
  const a = luminance(fgHex)
  const b = luminance(bgHex)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * `fg` drawn at `alpha` over `bg`, composited per channel in sRGB the way a browser paints it, and
 * rounded to the 8-bit colour that reaches the screen. For a graphic drawn at an opacity, such as
 * the hero logo's outer ring, or a translucent text colour such as Material's rgba(0, 0, 0, 0.87).
 */
export function composite(fgHex, bgHex, alpha) {
  const [f, b] = [toRgb(fgHex), toRgb(bgHex)]
  return '#' + f.map((c, i) => Math.round(alpha * c + (1 - alpha) * b[i]).toString(16).padStart(2, '0')).join('')
}
