import { CATALOG as REGISTRY, GROUPS } from '../playground/catalog'
import { href } from '../router'
import { LINKS } from '../links'
import { ScrollRegion } from '../shell/ScrollRegion'
import { ComponentThumb, hasThumb } from '../shell/ComponentThumb'
import { LABELS, statusOf, type Label } from '../playground/status'
import './docs.css'

// Component status (slice 5 of the playground uplift): one table of every component, each with its
// picture (the real component), its label in words, and what still stands before it is Approved, in
// the spec's own words. What a label promises is the same for every row that carries it, so it is
// written once, as the column's key, never repeated per row (Omkar's review rule 2). Labels, notes
// and counts are read from each spec, so the site and the spec cannot disagree.

/** What each label promises, from GOVERNANCE.md's table, in plain words. Written once, as the key. */
export const PROMISE: Record<Label, string> = {
  Approved: 'Semver applies in full: a breaking change waits for a major release.',
  'Known bugs': 'Still safe to use. The defects are linked from the spec and fixed in a patch.',
  Experimental: 'May change in a minor release, without a deprecation window.',
  Retired: 'Stays for two minor releases with a warning in development, then is removed. The spec names what replaces it.',
}

/**
 * The spec's note, for a reader: no file paths or parentheses, links as their words, no pointer to
 * GOVERNANCE.md (the key says what the label means), no dashes. The "Approved once" sentence when the
 * spec has one, since that is what still stands; otherwise the note's first sentence.
 */
export function stillToCome(note: string): string {
  const plain = note
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[;,]?\s*[Ss]ee GOVERNANCE\.md\.?/g, '.')
    .replace(/\s+[—–]\s+/g, ': ')
    .replace(/\.\.+/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
  const once = plain.match(/(?:It is )?(Approved once [^.]+)\./)
  const line = once ? once[1] : plain.split(/(?<=\.)\s+/)[0].replace(/\.$/, '')
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}.`
}

/** "A, B and C". */
const listOf = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

export function Status() {
  const rows = GROUPS.flatMap((g) => REGISTRY.filter((e) => e.group === g))
    .map((e) => ({ id: e.id, name: e.name, group: e.group, ...statusOf(e.spec) }))
  const count = (l: Label) => rows.filter((r) => r.label === l).length
  const inUse = LABELS.filter((l) => count(l) > 0)
  const unpictured = rows.filter((r) => !hasThumb(r.id)).map((r) => r.name)
  return (
    <article className="doc status">
      <header className="page-head">
        <p className="vela-meta page-head__eyebrow">Record</p>
        <h1 className="vela-h2">Component status</h1>
        <p className="vela-body status__lede">
          {rows.length} components: {inUse.map((l) => `${count(l)} ${l}`).join(', ')}. Each label is read from the component's own spec.
        </p>
      </header>

      <section className="status__key" aria-labelledby="status-key">
        <h2 id="status-key" className="vela-h4">What each label promises</h2>
        <dl className="status__labels">
          {LABELS.map((l) => (
            <div key={l} className="status__label">
              <dt><span className="site-tag">{l}</span> <span className="status__count">{count(l)}</span></dt>
              <dd>{PROMISE[l]}</dd>
            </div>
          ))}
        </dl>
        <p className="vela-meta status__more">
          Approved means specced, built, tested, in the Figma library, and every rule tagged and proved. <a href={`${LINKS.github}/blob/main/GOVERNANCE.md`}>How a component moves between labels</a>
        </p>
      </section>

      <ScrollRegion label="Component status, scrollable" className="status-scroll">
        <table className="status-table">
          <caption className="vela-sr-only">Every component, its label, and what still stands before it is Approved</caption>
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col" className="status-table__pic"><span className="vela-sr-only">Picture</span></th>
              <th scope="col">Label</th>
              <th scope="col">Still to come</th>
              <th scope="col">Spec</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <a href={href({ kind: 'component', id: r.id })}>{r.name}</a>
                  <span className="status-table__group">{r.group}</span>
                </th>
                <td className="status-table__pic">
                  {hasThumb(r.id) && <div className="status-table__thumb" aria-hidden="true" inert>{<ComponentThumb id={r.id} />}</div>}
                </td>
                <td><span className="site-tag">{r.label}</span></td>
                <td className="status-table__note">{r.note ? stillToCome(r.note) : ''}</td>
                <td><a href={`${LINKS.github}/blob/main/guidelines/components/${r.id}.md`}>Spec<span className="vela-sr-only"> for {r.name}</span></a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      <p className="vela-meta status__foot">
        Pictures are the real components.{unpictured.length > 0 && <> {listOf(unpictured)} open from a trigger into a layer over the page, so they have no picture here; each one's page shows it live.</>}
      </p>
    </article>
  )
}
