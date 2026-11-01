/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The commit the site was built from (vite.demo.config.ts); absent in unit tests. */
  readonly VITE_VELA_COMMIT?: string
  /** The UTC date the site was built, YYYY-MM-DD (vite.demo.config.ts); absent in unit tests. */
  readonly VITE_VELA_BUILT?: string
}

/** A spec cut to the facts the shell reads (scripts/vite-spec-facts.mjs, playground spec B8). */
declare module '*.md?facts' {
  const facts: string
  export default facts
}

/** The counts the browser can't make, made at build time (scripts/vite-site-facts.mjs). */
declare module 'virtual:vela-site-facts' {
  /** PAIRS.length in scripts/contrast-core.mjs. */
  export const PAIRS: number
  /** The line `export const PAIRS` starts on in scripts/contrast-core.mjs. */
  export const PAIRS_LINE: number
  /** How many runtime dependencies package.json declares. */
  export const DEPENDENCIES: number
  /** package.json's version, its date in CHANGELOG.md (YYYY-MM-DD) and the section's highlights. */
  export const RELEASE: { version: string; date: string | null; highlights: string[] }
}
