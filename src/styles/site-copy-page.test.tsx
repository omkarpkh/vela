import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import copyMd from '../../guidelines/patterns/copy.md?raw'
import { CopyPattern, SPECIMENS, wordsRows, SHOWN } from '../../demo/pages/CopyPattern'
import { componentOf, hasHidden, RLM } from '../../demo/pages/copy-more'
import { CopyGroupProvider, useCopyMark } from '../../demo/shell/CopyGroup'
import { readPattern, splitParagraph, visible, PARAGRAPH_MAX } from '../../demo/pages/copy-read'
import { CopyMorph } from '../../demo/shell/CopyMorph'
import { parseHash, href } from '../../demo/router'
import { PATTERNS } from '../../demo/nav'

// Slice 6a: the Copy pattern page (playground spec, section 12). The page's words are copy.md's;
// these checks hold the playground's own rules over what the page renders.
const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8')
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.innerHTML = '' })

describe('the Copy pattern page', () => {
  it(`renders no paragraph longer than ${PARAGRAPH_MAX} characters`, () => {
    render(<CopyPattern />)
    const long = [...document.querySelectorAll('article p')].map((p) => (p.textContent ?? '').trim()).filter((t) => t.length > PARAGRAPH_MAX)
    expect(long).toEqual([])
    // And it rendered words from copy.md, not an empty page that passes by saying nothing.
    expect(document.querySelectorAll('article p').length).toBeGreaterThan(15)
  })

  it('splits a long copy.md paragraph between sentences, keeping every word', () => {
    const opening = readPattern(copyMd).find((s) => s.n === 0)!.body.split(/\n\s*\n/)[0].replace(/\n/g, ' ')
    const parts = splitParagraph(opening)
    for (const p of parts) expect(visible(p).length).toBeLessThanOrEqual(PARAGRAPH_MAX)
    expect(parts.join(' ')).toBe(opening)
    // Never inside bold or code.
    expect(splitParagraph(`**${'Bold words. '.repeat(30)}** end.`)).toHaveLength(1)
  })

  it('shows the opening and every numbered section, each led by a live example or its table', () => {
    expect(SHOWN).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    render(<CopyPattern />)
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]) {
      const heading = screen.getByRole('heading', { level: 2, name: new RegExp(`^${n} · `) })
      // The first thing after the heading is the example, before any paragraph.
      const next = heading.nextElementSibling!
      expect(next, `section ${n}`).toHaveClass('copy-example')
      expect(next).toHaveTextContent('Experimental, not yet in the kit')
    }
    // Sections 10 and 12 are tables, and the table leads; 13, the open questions, is words.
    for (const n of [10, 12]) {
      const next = screen.getByRole('heading', { level: 2, name: new RegExp(`^${n} · `) }).nextElementSibling!
      expect(next.querySelector('table') ?? (next.tagName === 'TABLE' ? next : null), `section ${n}`).not.toBeNull()
      expect(next.querySelector('p:not(caption p)')?.compareDocumentPosition(next.querySelector('table')!) ?? 0).not.toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    }
    // No note sends the reader to GitHub for sections the page lacks.
    expect(document.body.textContent).not.toMatch(/sections 5 to 13 are in/)
  })

  it('reads every word-table row each later section needs, so a renamed row fails here', () => {
    render(<CopyPattern />)
    expect(screen.getAllByText('Contains hidden characters').length).toBeGreaterThan(0)
    expect(screen.getAllByText("Contains curly quotes, which shells don't accept").length).toBeGreaterThan(0)
  })

  it('a rule from a built component is found in the catalog; a Copy rule is not built yet', () => {
    expect(componentOf('dropdown-list-locked-not-chosen')).toBe('dropdown-list')
    expect(componentOf('tabs-keyboard-arrows')).toBe('tabs')
    expect(componentOf('copy-button-confirms-after-write')).toBeUndefined()
    expect(componentOf('copyable-value-mark-by-identity')).toBeUndefined()
  })

  it('draws every "don\'t" as an image with alt text, never as something to focus or press', () => {
    render(<CopyPattern />)
    const drawings = [...document.querySelectorAll('.copy-drawing')]
    expect(drawings).toHaveLength(5)
    for (const d of drawings) {
      expect(d).toHaveAttribute('role', 'img')
      expect(d.getAttribute('aria-label')).toMatch(/^Don't: /)
      expect(d).not.toHaveAttribute('tabindex')
      expect(d.querySelectorAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0)
    }
  })

  it('names every copy control "Copy <what>", never "Copy" alone', () => {
    render(<CopyPattern />)
    const names = [...document.querySelectorAll('button.shell-cm')].map((b) => b.getAttribute('aria-label'))
    expect(names.length).toBeGreaterThan(5)
    for (const n of names) expect(n).toMatch(/^Copy \S/)
  })

  it('has a "Show me" for every row of the words table', () => {
    const rows = wordsRows()
    expect(rows.length).toBeGreaterThan(15)
    expect(rows.map((r) => r.key).filter((k) => !SPECIMENS[k])).toEqual([])
  })

  it('lists a pattern only when copy.md says it is approved, at #/patterns/<id>', () => {
    for (const p of PATTERNS) expect(read(`guidelines/patterns/${p.id}.md`)).toMatch(/\*\*Approved by /)
    expect(parseHash('#/patterns/copy')).toEqual({ kind: 'pattern', id: 'copy' })
    expect(href({ kind: 'pattern', id: 'copy' })).toBe('#/patterns/copy')
  })
})

describe('the sample secrets', () => {
  it('use the invented vela_sample_ format, labelled [sample], and no real provider prefix', () => {
    const src = ['demo/pages/CopyPattern.tsx', 'demo/pages/copy-parts.tsx', 'demo/pages/copy-more.tsx'].map(read).join('\n')
    expect(src).toContain("'vela_sample_")
    expect(src).toContain('[sample]')
    for (const prefix of ['sk_live', 'sk_test', 'ghp_', 'gho_', 'github_pat_', 'AKIA', 'xoxb-', 'xoxp-', 'AIza', 'glpat-', 'sk-ant-', 'sk-proj-'])
      expect(src, prefix).not.toContain(prefix)
  })
})

describe('hidden characters', () => {
  // Built from code points, so this file holds none of them either.
  const ranges = [[0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2060], [0x2066, 0x2069], [0xfeff, 0xfeff]]
  const hidden = new RegExp(`[${ranges.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join('')}]`)
  const FILES = [
    'demo/pages/CopyPattern.tsx', 'demo/pages/copy-read.ts', 'demo/shell/CopyMorph.tsx', 'demo/shell/Copy.tsx',
    'demo/shell/shell.css', 'demo/demo.css', 'demo/router.ts', 'demo/nav.ts', 'demo/App.tsx',
    'src/styles/site-copy-page.test.tsx', 'tests/e2e/site.spec.ts',
    'demo/pages/copy-parts.tsx', 'demo/pages/copy-more.tsx', 'demo/shell/CopyGroup.tsx', 'demo/playground/StageWidth.tsx',
    'demo/playground/Markdown.tsx', 'demo/demo.css',
  ]
  it.each(FILES)('%s holds no literal hidden character', (f) => {
    const m = read(f).match(hidden)
    expect(m && `U+${m[0].charCodeAt(0).toString(16).toUpperCase()}`).toBeNull()
  })

  it('the commands example makes a real right-to-left mark at runtime, and shows it only as an escape', () => {
    expect(RLM.charCodeAt(0)).toBe(0x200f)
    expect(hasHidden(`a${RLM}b`)).toBe(true)
    expect(hasHidden('vela scan')).toBe(false)
    render(<CopyPattern />)
    expect(document.querySelector('.copy-escape')).toHaveTextContent('\\u200F')
    expect(document.body.innerHTML).not.toContain(RLM)
  })

  it('the page makes them at runtime and shows them as escapes', () => {
    render(<CopyPattern />)
    fireEvent.click(screen.getByRole('button', { name: 'Show me: Hidden characters found' }))
    expect(document.querySelector('.copy-specimen__value')).toHaveTextContent('\\u200B')
  })
})

describe('the copy morph', () => {
  const clip = (impl: () => Promise<void>) => {
    const writeText = vi.fn(impl)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    return writeText
  }

  it('shows the tick only once the write has resolved, and reports it once', async () => {
    let done!: () => void
    clip(() => new Promise<void>((r) => { done = r }))
    const onResult = vi.fn()
    render(<CopyMorph what="request id" text="req_1" onResult={onResult} />)
    const button = screen.getByRole('button', { name: 'Copy request id' })
    fireEvent.click(button, { detail: 1 })
    await act(async () => {})
    expect(button).toHaveAttribute('data-state', 'idle')
    await act(async () => { done() })
    expect(button).toHaveAttribute('data-state', 'copied')
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith('copied', 'req_1')
    // The name stays the same in every state.
    expect(button).toHaveAccessibleName('Copy request id')
  })

  it('from the keyboard, nothing animates', async () => {
    clip(() => Promise.resolve())
    render(<CopyMorph what="request id" text="req_1" />)
    const button = screen.getByRole('button', { name: 'Copy request id' })
    await act(async () => { fireEvent.click(button, { detail: 0 }) })
    expect(button).toHaveAttribute('data-state', 'copied')
    expect(button).toHaveAttribute('data-instant')
  })

  it('a simulated refusal replaces its own calls and never reaches the browser\'s clipboard', async () => {
    const writeText = clip(() => Promise.resolve())
    document.execCommand = vi.fn(() => true)
    const onResult = vi.fn()
    render(<><span id="v">req_1</span><CopyMorph what="request id" text="req_1" shownId="v" simulate={{ api: true, fallback: true }} onResult={onResult} /></>)
    await act(async () => { fireEvent.click(screen.getByRole('button'), { detail: 1 }) })
    expect(writeText).not.toHaveBeenCalled()
    expect(document.execCommand).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledWith('selected')
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'failed')
    expect(window.getSelection()?.toString()).toBe('req_1')
  })

  it('an embedded app refuses only the Clipboard API; the copy command still works', async () => {
    const writeText = clip(() => Promise.resolve())
    document.execCommand = vi.fn(() => true)
    const onResult = vi.fn()
    render(<><span id="v">req_1</span><CopyMorph what="request id" text="req_1" shownId="v" simulate={{ api: true }} onResult={onResult} /></>)
    await act(async () => { fireEvent.click(screen.getByRole('button'), { detail: 1 }) })
    expect(writeText).not.toHaveBeenCalled()
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(onResult).toHaveBeenCalledWith('copied', 'req_1')
  })

  it('holds the tick for 1.5s, then hands back; never disabled by its own success', async () => {
    vi.useFakeTimers()
    try {
      clip(() => Promise.resolve())
      vi.spyOn(document, 'hasFocus').mockReturnValue(true)
      const onHandBack = vi.fn()
      render(<CopyMorph what="request id" text="req_1" onHandBack={onHandBack} />)
      const button = screen.getByRole('button')
      await act(async () => { fireEvent.click(button, { detail: 1 }) })
      expect(button).toHaveAttribute('data-state', 'copied')
      expect(button).not.toBeDisabled()
      await act(async () => { vi.advanceTimersByTime(1400) })
      expect(button).toHaveAttribute('data-state', 'copied')
      await act(async () => { vi.advanceTimersByTime(200) })
      expect(button).toHaveAttribute('data-state', 'idle')
      expect(onHandBack).toHaveBeenCalledTimes(1)
    } finally { vi.useRealTimers() }
  })
})

describe('the copy group', () => {
  function Value({ id, value }: { id: string; value: string }) {
    const m = useCopyMark(id, value)
    return <span data-testid={id} onClick={() => m.take(value)}>{m.word ?? ''}</span>
  }

  it('keeps one mark on the page, by identity, and says when its value changed', () => {
    const { rerender } = render(<CopyGroupProvider><Value id="a" value="1" /><Value id="b" value="2" /></CopyGroupProvider>)
    fireEvent.click(screen.getByTestId('a'))
    expect(screen.getByTestId('a')).toHaveTextContent('Copied')
    fireEvent.click(screen.getByTestId('b'))
    expect(screen.getByTestId('a')).toHaveTextContent('')
    expect(screen.getByTestId('b')).toHaveTextContent('Copied')
    // Re-ordered: the mark stays with b. Changed: it says so.
    rerender(<CopyGroupProvider><Value id="b" value="2" /><Value id="a" value="1" /></CopyGroupProvider>)
    expect(screen.getByTestId('b')).toHaveTextContent('Copied')
    rerender(<CopyGroupProvider><Value id="b" value="3" /><Value id="a" value="1" /></CopyGroupProvider>)
    expect(screen.getByTestId('b')).toHaveTextContent('Changed since you copied')
  })

  it('the person\'s own copy clears it', () => {
    render(<CopyGroupProvider><Value id="a" value="1" /></CopyGroupProvider>)
    fireEvent.click(screen.getByTestId('a'))
    act(() => { document.dispatchEvent(new Event('copy')) })
    expect(screen.getByTestId('a')).toHaveTextContent('')
  })
})
