import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The commit the site is built from, for the error boundaries' "Report it on GitHub" link
// (demo/shell/ErrorBoundary.tsx). CI provides GITHUB_SHA; a local build asks git; neither gives
// "unknown", and the build still succeeds.
function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return 'unknown' }
}

// VITE_BASE is set by the Pages deploy (/vela/); local dev, preview and tests serve from /.
export default defineConfig({
  root: 'demo',
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // The build date goes beside the commit in each component page's facts grid ("Built"), so a reader
  // knows which build the proofs come from (playground spec, A25). UTC, as a date only.
  define: {
    'import.meta.env.VITE_VELA_COMMIT': JSON.stringify(commit()),
    'import.meta.env.VITE_VELA_BUILT': JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: { outDir: '../demo-dist', emptyOutDir: true },
})
