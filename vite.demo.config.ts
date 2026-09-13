import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE is set by the Pages deploy (/vela/); local dev, preview and tests serve from /.
export default defineConfig({
  root: 'demo',
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: { outDir: '../demo-dist', emptyOutDir: true },
})
