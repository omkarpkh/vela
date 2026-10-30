/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The commit the site was built from (vite.demo.config.ts); absent in unit tests. */
  readonly VITE_VELA_COMMIT?: string
  /** The UTC date the site was built, YYYY-MM-DD (vite.demo.config.ts); absent in unit tests. */
  readonly VITE_VELA_BUILT?: string
}
