/**
 * The resting stage (slice 3 of the playground uplift; s5-site-map, "the resting stage shows the
 * component's range, not one button"). Under the live stage, the component across its main closed
 * values, at the page's other settings, so a reader sees the whole family before setting anything.
 *
 * - The same Stage part as the live demo, captioned "The range" with the props it holds still, so it
 *   is never taken for the live one; its region is named "The range".
 * - Each form is the real component, true to size, and inert: a picture of the family at rest, out
 *   of the tab order. Its name sits under it in words (or is heard only, when the component already
 *   shows the word, as a Risk Pill does), so the list reads the same to a screen reader.
 * - A form the spec's rules forbid with the page's settings is left out, and the rules' own words
 *   say why, under the plate: never a silent gap.
 * - With Compare on Themes, one row per theme, as the live stage does.
 */
import { cn } from '../../src'
import { Stage } from '../shell/Stage'
import { StageBoundary, type Settings } from '../shell/ErrorBoundary'
import type { Entry, Values } from './registry'
import type { RangeItem } from './live'
import type { Mode } from './tokens'

export function RangeStage({ entry, shown, left, across, stack, held, frames, reduced, settings, onReset }: {
  entry: Entry
  shown: { item: RangeItem; values: Values }[]
  left: string[]
  across: string
  stack?: boolean
  held: string
  frames: Mode[]
  reduced: boolean
  settings: Settings
  onReset: () => void
}) {
  return (
    <div className="pg-range-wrap" data-arrive="2">
      <Stage className={cn('pg-range', stack && 'pg-range--stack')} caption="The range" props={held} label="The range">
        <StageBoundary key={JSON.stringify(shown.map((s) => s.values))} component={entry.id} settings={settings} onReset={onReset}>
          <div className={cn('pg-range__frames', frames.length > 1 && 'pg-range__frames--two', reduced && 'pg-reduced')}>
            {frames.map((m) => (
              <div key={m} className={cn('vela-root pg-range__frame', frames.length > 1 && 'pg-range__frame--labelled')} data-theme={m}>
                {frames.length > 1 && <span className="pg-range__theme vela-meta">{m}</span>}
                <ul className="pg-range__list" aria-label={`${entry.name}, every ${across}${frames.length > 1 ? `, ${m}` : ''}`}>
                  {shown.map(({ item, values }) => {
                    const said = item.name ?? Object.values(item.patch).filter((x) => typeof x === 'string' && x !== '')[0] ?? ''
                    return (
                      <li key={JSON.stringify(item.patch)} className="pg-range__cell">
                        <span className="pg-range__pic" aria-hidden="true" inert>{entry.render(values)}</span>
                        <span className={item.name ? 'pg-range__name vela-meta' : 'vela-sr-only'}>{String(said)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </StageBoundary>
      </Stage>
      {left.length > 0 && <p className="pg-range__left">Not in the range with these settings: {left.join(' ')}</p>}
    </div>
  )
}
