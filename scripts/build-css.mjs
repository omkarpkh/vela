/**
 * CSS build.
 *
 * The dark theme is authored ONCE as a selector-less block of declarations,
 * then emitted under two selectors:
 *   1. @media (prefers-color-scheme: dark) :root:not([data-theme="light"])
 *   2. :root[data-theme="dark"]
 * so the OS preference is respected by default and an explicit toggle wins in
 * both directions. Authoring it twice by hand is how the two copies drift.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

const light = read('src/styles/tokens.light.css')
const darkBody = read('src/styles/tokens.dark.body.css')

const indent = (s, pad) => s.split('\n').map((l) => (l.trim() ? pad + l : l)).join('\n')

const tokens = `${light}
/* -- dark: OS preference, unless an explicit light choice overrides it ------ */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${indent(darkBody, '  ')}
  }
}

/* -- dark: explicit opt-in, wins over the OS preference -------------------- */
:root[data-theme="dark"] {
${darkBody}
}
`

// Order is load-bearing: tokens define the variables everything else consumes.
const COMPONENTS = [
  'src/components/Button/Button.css',
  'src/components/Toggle/Toggle.css',
  'src/components/Input/Input.css',
  'src/components/ContextualAlert/ContextualAlert.css',
  'src/components/StatusIndicator/StatusIndicator.css',
  'src/components/Tabs/Tabs.css',
]

const banner = `/*! @omkarux/vela — design tokens + component styles. MIT. */\n`
const bundle = [banner, tokens, read('src/styles/base.css'), read('src/styles/typography.css'), ...COMPONENTS.map(read)].join('\n')

// Dev entry consumed by `npm run dev`, so the preview and the published
// bundle can never disagree about the cascade. Generated, never committed.
writeFileSync(join(root, 'src/styles/tokens.dev.css'), tokens)

mkdirSync(join(root, 'dist'), { recursive: true })
writeFileSync(join(root, 'dist/tokens.css'), banner + tokens)
writeFileSync(join(root, 'dist/vela.css'), bundle)

console.log(`build:css  src/styles/tokens.dev.css (dev entry)`)
console.log(`build:css  dist/tokens.css  ${(banner + tokens).length} bytes`)
console.log(`build:css  dist/vela.css    ${bundle.length} bytes`)
