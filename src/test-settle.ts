import { act } from '@testing-library/react'

/**
 * Lets an overlay finish what it does on opening or closing: the given time for its timers, then two
 * animation frames for the work Base UI defers to the next frame (focus moving into a menu, a popup
 * measuring itself). A fixed wait alone raced that frame on a busy CI runner: the Dropdown List's
 * "lands on the current item" test failed now and then (10 Nov 2026), and with the wait cut to 1ms
 * most of its file failed, while the frames alone kept every test green. Test-only: excluded from the
 * type build beside test-setup.ts.
 */
export const settle = (ms = 30) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  })
