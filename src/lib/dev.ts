// Module-scoped, so it shadows (and never conflicts with) @types/node's global in the repo's own
// typecheck, and needs no Node types in the published declarations.
declare const process: { env: { NODE_ENV?: string } }

/**
 * Whether development-time checks run. A consumer's bundler replaces the literal
 * `process.env.NODE_ENV` (as it does for React and Base UI), so a production build reads
 * "production" and skips them. Loaded unbundled, `process` does not exist and the checks run.
 */
export function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return true
  }
}
