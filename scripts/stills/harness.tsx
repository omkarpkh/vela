/**
 * The page npm run stills renders each component's still from (scripts/stills/stills.mjs). It is
 * never part of the site: Vite serves it from this folder while the script runs, and nothing in
 * demo/ imports it.
 *
 * `?id=<component>&theme=<light|dark>` draws that component's resting form, the real component at
 * its real size, in a frame of the still's size on the well colour (--vela-bg-container), so the
 * still reads as the site's own thumbnail well. Never scaled, so its words stay at 12px or more.
 *
 * - The fourteen components with an inline thumbnail use it as it is (demo/shell/ComponentThumb.tsx),
 *   so the Status page, Not found and the stills show one resting form.
 * - The five overlays rest closed, as a trigger; a still of that would be just a button. So each is
 *   drawn open, as it is when you meet it: the Popover and the Dropdown List open from their trigger,
 *   the Tooltip shown (stills.mjs points at its trigger), the Dialog open, and a Toast raised. The
 *   frame is the page here, so an overlay sits where it would in a window of the still's size.
 */
import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/index.css'
import '../../demo/shell/shell.css'
import { Button } from '../../src'
import { Popover, Tooltip, Dialog, DropdownList, ToastProvider, useToast } from '../../src/headless'
import { ComponentThumb, hasThumb } from '../../demo/shell/ComponentThumb'

// Once, though StrictMode runs an effect twice: a still shows one toast.
let raised = false
function RaiseToast() {
  const toast = useToast()
  useEffect(() => { if (!raised) { raised = true; toast.add({ severity: 'success', title: 'Saved' }) } }, [toast])
  return null
}

const OVERLAYS: Record<string, () => ReactNode> = {
  popover: () => (
    <Popover trigger={<Button size="tiny">Filters</Button>} title="Filter alerts" placement="bottom" align="start" defaultOpen>
      <p className="vela-body">Critical and major only.</p>
    </Popover>
  ),
  tooltip: () => (
    <Tooltip content="Export as CSV" placement="bottom" align="start">
      <Button size="tiny" data-still-hover="">Export</Button>
    </Tooltip>
  ),
  dialog: () => (
    <Dialog title="Edit policy" trigger={<Button>Edit Policy</Button>} defaultOpen>
      <p className="vela-body">Saved for all.</p>
    </Dialog>
  ),
  toast: () => <ToastProvider placement="top-end"><RaiseToast /></ToastProvider>,
  'dropdown-list': () => (
    <DropdownList
      trigger={<Button size="tiny">Views</Button>}
      label="Views"
      items={[{ value: 'open', label: 'Open alerts' }, { value: 'mine', label: 'Assigned to me' }, { value: 'closed', label: 'Closed' }]}
      defaultValue="open"
      defaultOpen
    />
  ),
}

const q = new URLSearchParams(window.location.search)
const id = q.get('id') ?? ''
const theme = q.get('theme') === 'dark' ? 'dark' : 'light'
// The still's size, from still-key.mjs through the address (that module reads files, so it stays in Node).
const STILL = { width: Number(q.get('w') ?? 200), height: Number(q.get('h') ?? 120) }
document.documentElement.setAttribute('data-theme', theme)

function Scene() {
  const overlay = id in OVERLAYS ? OVERLAYS[id] : undefined
  return (
    <div
      className="vela-root still"
      style={{
        width: STILL.width, height: STILL.height, boxSizing: 'border-box', overflow: 'hidden', padding: 'var(--vela-space-15)',
        display: 'flex', alignItems: overlay ? 'flex-start' : 'center', justifyContent: 'safe center',
        background: 'var(--vela-bg-container)', color: 'var(--vela-text-default)', fontFamily: 'var(--vela-font-family-primary)',
      }}
    >
      {/* The thumbnail's own frame fills the still, so a wide one (Table) keeps its width and is clipped. */}
      <style>{'.still > .shell-thumb { width: 100%; height: 100%; padding: 0; justify-content: safe center; }'}</style>
      {overlay ? overlay() : hasThumb(id) ? <ComponentThumb id={id} /> : <p>No still for “{id}”</p>}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Scene /></StrictMode>)
// The script waits for this before it looks: fonts, then two frames for the overlays to place.
Promise.all(['400 16px "Open Sans"', '600 16px "Open Sans"'].map((f) => document.fonts.load(f))).then(() => document.fonts.ready).then(() => requestAnimationFrame(() => requestAnimationFrame(() => { (window as unknown as { __stillReady: boolean }).__stillReady = true })))
