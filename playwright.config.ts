import { defineConfig, type Project } from '@playwright/test'

/**
 * Visual regression for the demo app. Every component section and both columns of the
 * "adopt without rewrite" view are screenshotted in light and dark and compared with a
 * committed baseline. Baselines are per platform (Playwright suffixes them -darwin/-linux):
 * the Linux set is what CI gates on, the darwin set is for local runs.
 *
 * Widths. Security consoles live on laptops, desktops and wide monitors, and the embeddable
 * components must survive whatever width a host gives them — so the component sections are
 * screenshotted at four widths, not one (DESIGN.md, "Responsive and density"):
 *   desktop 1440×900  — the full suite: every section, both adopt columns, the playground e2e
 *   laptop  1280×800  — component sections only
 *   wide    1920×1080 — component sections only
 *   narrow   400×860  — component sections only: the embeddable check
 * The 1440 baselines keep their original file names (button-light-linux.png); the other widths
 * carry a width suffix (button-light-1280-linux.png). Update deliberately:
 *   npm run test:visual:update            # every width, every baseline
 *   npm run test:visual:update:missing    # only baselines that do not exist yet
 * The Linux baselines are generated on the CI runner, never on a laptop: see
 * .github/workflows/visual-baselines.yml. A build container without Google Fonts access
 * renders a fallback face and must not write baselines.
 */
const widths: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  wide: { width: 1920, height: 1080 },
  narrow: { width: 400, height: 860 },
}

const sectionsOnly: Partial<Project> = {
  testMatch: /visual\/demo\.spec\.ts/,
  grep: /components ·/,
}

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
  // No {-projectName} in the template: the width is part of the screenshot name the test
  // builds, so the 1440 baselines keep the names they had before projects existed.
  snapshotPathTemplate: '{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}',
  use: {
    baseURL: 'http://localhost:4173',
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 },
  },
  projects: [
    { name: 'desktop', use: { viewport: widths.desktop } },
    { name: 'laptop', use: { viewport: widths.laptop }, ...sectionsOnly },
    { name: 'wide', use: { viewport: widths.wide }, ...sectionsOnly },
    { name: 'narrow', use: { viewport: widths.narrow }, ...sectionsOnly },
  ],
  // Screenshots come from the production build of the demo, served statically — the same
  // bytes every time, no HMR, no dev-only styles.
  webServer: {
    command: 'npm run demo:build && npx vite preview --config vite.demo.config.ts --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
