import type { Page } from '@playwright/test'

/**
 * Sets the page's theme the way a reader does: through the Appearance panel (playground spec,
 * section 9), the only control that sets it. Opened and closed with the pointer, so no focus ring
 * is left on the header button for a screenshot.
 */
export async function setTheme(page: Page, theme: string) {
  const word = theme.charAt(0).toUpperCase() + theme.slice(1).toLowerCase()
  const button = page.getByRole('button', { name: /^Appearance/ })
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: word, exact: true }).click()
  await button.click()
}
