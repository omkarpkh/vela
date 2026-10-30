import { useEffect, useState } from 'react'
import { Markdown } from '../playground/Markdown'
import { REGISTRY } from '../playground/registry'
import { PROPOSALS, loadProposal } from '../playground/proposals'
import type { ProposalPage } from '../playground/proposal-read'
import { LINKS, figmaUrl } from '../links'

// A Proposal page (playground spec, section 7; P1 request, item 3, following GOV.UK): a written
// spec that is not built. No stage, no controls, no snippet and no install. The first block is a
// heading; then what it is, the way out to the spec, and the spec's own summary, Responsive
// behaviour table, Props tables (read-only) and what it waits on.
// Slice 1 adds the facts grid and the "Proposal" tab name; this is slice 0.
const BUILT = REGISTRY.map((e) => e.name)

export function Proposal({ id }: { id: string }) {
  const p = PROPOSALS.find((x) => x.id === id)
  const [page, setPage] = useState<(ProposalPage & { waitingOnText: string }) | null>(null)
  useEffect(() => {
    let live = true
    setPage(null)
    // The spec and its parser load together, when the page opens; neither is in the main bundle.
    const md = loadProposal(id)
    if (md && p) {
      Promise.all([md, import('../playground/proposal-read')]).then(([source, { readProposal, waitingOnText }]) => {
        if (!live) return
        const read = readProposal(source, p.name, BUILT)
        setPage({ ...read, waitingOnText: waitingOnText(read.waitingOn) })
      })
    }
    return () => { live = false }
  }, [id, p])

  if (!p) return <p className="vela-body">No proposal called “{id}”.</p>
  return (
    <article className="doc proposal">
      <header className="page-head proposal__head">
        <h1 className="vela-h2">{p.name}</h1>
        <p className="vela-body proposal__banner">
          <strong>Proposal.</strong> This component is a written spec. It isn't built and can't be installed yet.
        </p>
        <ul className="vela-body proposal__links">
          <li><a href={`${LINKS.github}/blob/main/guidelines/proposals/${p.file}`}>Read the spec on GitHub</a></li>
          {p.discuss && <li><a href={p.discuss}>Follow or discuss this proposal</a></li>}
          <li>{p.figma ? <a href={figmaUrl(p.figma)}>See the design in Figma</a> : 'There is no Figma set yet.'}</li>
        </ul>
      </header>
      <div className="doc__body" aria-busy={page ? undefined : true}>
        {page && (
          <>
            <Markdown source={page.summary} />
            {page.responsive && (
              <section aria-labelledby="proposal-responsive">
                <h2 id="proposal-responsive" className="vela-h3 pg-h1">Responsive behaviour</h2>
                <Markdown source={page.responsive} />
              </section>
            )}
            {page.props.length > 0 && (
              <section aria-labelledby="proposal-props">
                <h2 id="proposal-props" className="vela-h3 pg-h1">Props</h2>
                <p className="pg-p">These may change before the component is built.</p>
                {page.props.map((t, i) => <Markdown key={i} source={t} />)}
              </section>
            )}
            <p className="pg-p proposal__waits">
              {page.waitingOn.length > 0
                ? `Waiting on: ${page.waitingOnText}.`
                : 'Waiting on: nothing. Every part it is built from is in the kit.'}
            </p>
          </>
        )}
      </div>
    </article>
  )
}
