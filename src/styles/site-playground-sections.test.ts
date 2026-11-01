import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSpec } from '../../demo/playground/spec'
import { propsOf, statesOf, keyboardOf } from '../../demo/playground/SpecSections'
import { INDEX_MIN } from '../../demo/shell/SectionIndex'

// Slice 7 (s5-tabs, Playground tab): Props, States and Keyboard, read from the spec, never written.
const spec = (name: string) => parseSpec(readFileSync(resolve(process.cwd(), `guidelines/components/${name}.md`), 'utf8'))

describe("the Playground tab's spec sections", () => {
  it('Props repeats the Props table, every row', () => {
    const button = propsOf(spec('button'))!
    expect(button.table.split('\n')[0]).toMatch(/^\| Prop/)
    expect(button.count).toBe(spec('button').props.length)
    expect(button.table.split('\n').length - 2).toBe(button.count)
    // A component made of parts repeats its Composition table, parts and all.
    expect(propsOf(spec('tabs'))!.table).toContain('`Tabs.Trigger`')
  })

  it('States is the spec section, counted by its items; none when the spec has none', () => {
    expect(statesOf(spec('tabs'))!.count).toBe(6)
    expect(statesOf(spec('button'))!.count).toBe(4)
    expect(statesOf(spec('icon-button'))!.count).toBeGreaterThan(0) // a table, counted by rows
    expect(statesOf(spec('input'))).toBeNull()
  })

  it("Keyboard is what Accessibility says about keys, and nothing when it says nothing", () => {
    expect(keyboardOf(spec('tabs'))).toMatch(/Roving tabindex/)
    expect(keyboardOf(spec('tabs'))).not.toMatch(/Correct roles throughout/)
    // Nested lines stay with their item.
    expect(keyboardOf(spec('dropdown-list'))).toMatch(/\*\*Keys:\*\*\n\s+- Arrow Up and Arrow Down/)
    expect(keyboardOf(spec('button'))).toBeNull()
    expect(keyboardOf(spec('status-indicator'))).toBeNull()
  })

  it('a page with the stage, the code and two of these gets the index; Status Indicator does not', () => {
    const sections = (n: string) => 2 + [propsOf(spec(n)), statesOf(spec(n)), keyboardOf(spec(n))].filter(Boolean).length
    expect(sections('tabs')).toBeGreaterThanOrEqual(INDEX_MIN)
    expect(sections('button')).toBeGreaterThanOrEqual(INDEX_MIN)
    expect(sections('status-indicator')).toBeLessThan(INDEX_MIN)
  })
})
