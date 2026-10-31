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
