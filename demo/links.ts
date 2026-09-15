// The project's public homes. One place, so every link on the site agrees.
export const LINKS = {
  site: 'https://omkarpkh.github.io/vela/',
  github: 'https://github.com/omkarpkh/vela',
  npm: 'https://www.npmjs.com/package/@omkarux/vela',
  figma: 'https://www.figma.com/design/XO2rmeCcgOjyKe4oipgF4j/Vela-Design-System',
} as const

/** A link into the library file: the cover page, or a node when the caller knows one ("12:34" or "12-34"). */
export const figmaUrl = (nodeId?: string) => `${LINKS.figma}?node-id=${(nodeId ?? '0:1').replace(':', '-')}`
