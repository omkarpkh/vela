import { defineConfig } from '@playwright/test'

/**
 * Visual regression for the demo app. Every component section and both columns of the
 * "adopt without rewrite" view are screenshotted in light and dark and compared with a
 * committed baseline. Baselines are per platform (Playwright suffixes them -darwin/-linux):
 * the Linux set is what CI gates on, the darwin set is for local runs. Update deliberately:
 *   npm run test:visual:update
 */
export default defineConfig({
  testDir: 'tests',
  // tests/media holds the recorders that regenerate the case-study clips. They are not checks —
  // they record video and assert nothing — so they stay out of the suite. testIgnore applies to
  // discovery, so naming the path is not enough to run them: use RECORD=1.
  //   RECORD=1 npx playwright test tests/media --reporter=line
  testIgnore: process.env.RECORD ? [] : '**/media/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 },
  },
  // Screenshots come from the production build of the demo, served statically — the same
  // bytes every time, no HMR, no dev-only styles.
  webServer: {
    command: 'npm run demo:build && npx vite preview --config vite.demo.config.ts --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
