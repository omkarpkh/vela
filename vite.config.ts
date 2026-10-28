import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.types.json',
      include: ['src'],
      exclude: ['src/**/*.test.tsx', 'src/test-setup.ts'],
    }),
  ],
  build: {
    lib: {
      // Two entry points, one package (decisions/002-agent-ready-direction): `.` is the
      // zero-dependency core, `./headless` the Base UI-backed one. With preserveModules each
      // module keeps its path, so the second entry lands at dist/headless/index.js.
      entry: { index: './src/index.ts', 'headless/index': './src/headless/index.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      // Never bundle the consumer's React. This is what peerDependencies buys us. Base UI is the
      // headless entry's optional peer and is left external for the same reason; verify-pack
      // asserts the core entry never imports it.
      external: ['react', 'react-dom', 'react/jsx-runtime', /^@base-ui\//],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
