import { describe, it, expect, afterEach, vi } from 'vitest'
import { copyText, COPY_WORDS } from '../../demo/shell/Copy'

// The playground's Copy stand-in (demo/shell/Copy.tsx) uses the Copy Button spec's words and never
// claims a selection that didn't happen (icon thread, 31 Oct).
describe('copyText', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = '' })
  const refuse = () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('NotAllowed')) } })
    document.execCommand = () => false
  }

  it('says "copied" when the clipboard takes it', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } })
    expect(await copyText('npm i @omkarux/vela', null)).toBe('copied')
  })

  it('leaves the shown text selected when both tries are refused', async () => {
    refuse()
    const el = document.createElement('code'); el.textContent = 'npm i @omkarux/vela'; document.body.appendChild(el)
    expect(await copyText('npm i @omkarux/vela', el)).toBe('selected')
    expect(window.getSelection()?.toString()).toBe('npm i @omkarux/vela')
  })

  it('says nothing was selected when the text cannot be found', async () => {
    refuse()
    expect(await copyText('npm i @omkarux/vela', null)).toBe('none')
  })
})

describe('the words', () => {
  it('are the Copy Button spec\'s, one platform each, and never claim the clipboard', () => {
    expect(COPY_WORDS.selected.other).toBe("Couldn't copy: your browser blocked the clipboard. The text is selected, so press Ctrl+C.")
    expect(COPY_WORDS.selected.apple).toMatch(/press ⌘C\.$/)
    expect(COPY_WORDS.selected.touch).toMatch(/tap and hold it, then choose Copy\.$/)
    expect(COPY_WORDS.none).toBe("Couldn't copy: your browser blocked the clipboard, so nothing was copied. Select the text and copy it yourself.")
    for (const w of [...Object.values(COPY_WORDS.selected), COPY_WORDS.none]) {
      expect(w).not.toMatch(/on a Mac|(on|in) your clipboard/)
      expect(w).not.toContain('(')
    }
  })
})
