import * as React from 'react'
import { Toast as BaseToast } from '@base-ui/react/toast'
import { Button } from '../../components/Button'
import type { Severity } from '../../components/ContextualAlert'
import { CheckCircleIcon, CloseIcon, InfoCircleIcon, WarningTriangleIcon } from '../../lib/icons'
import { cn } from '../../lib/cn'
import { useOverlayPortal } from '../overlay'

/**
 * Toast on Base UI — headless-born (`guidelines/components/toast.md`); no core implementation.
 *
 * A toast confirms something that already happened. It is never the only record of it, never the
 * only place an Undo lives, and never carries a decision; the types make the mechanical half of
 * that true and the spec carries the rest as conventions.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **One provider, one hook.** Base UI's compound parts are not exposed. `ToastProvider` renders
 *   the region; `useToast()` wraps `useToastManager()` as `add` / `dismiss`.
 * - **Timing is derived, not passed.** Base UI's per-toast `timeout` is set here: the
 *   `--vela-duration-toast` token (read from the stylesheet on every `add`) for a `success` or
 *   `info` toast with no action, and `0` — never — for a `warning` or any toast with an action.
 * - **Always polite.** Base UI's `priority: 'high'` (an assertive copy, the toast hidden from
 *   assistive technology until focused) is never used.
 * - **Own buttons.** Base UI's `Toast.Close` hides itself from assistive technology unless the deck
 *   is expanded; the close button and the action here are Vela's own and call the manager.
 * - **Portal.** The portal element carries `vela-root` and the theme of where the provider is
 *   rendered, re-read on every `add` (`../overlay`).
 */

/** The Severity taxonomy's subset a toast may carry. Minor, major and critical belong in a Contextual Alert. */
export type ToastSeverity = Extract<Severity, 'success' | 'info' | 'warning'>
/** Where the region sits. `end` follows the writing direction. */
export type ToastPlacement = 'bottom-end' | 'top-end' | 'bottom-center'
/** How many toasts show at once. */
export type ToastLimit = 1 | 2 | 3

/** The one action a toast may carry: a shortcut to something that also exists on the page. */
export interface ToastAction {
  /** Required. A verb or "View" — "Undo", "View Report". Never an icon alone. */
  label: string
  /** Called once when the action is taken; the toast then dismisses. */
  onClick: () => void
}

/** What `add` takes. Nothing else: the timing and the politeness follow from severity and action. */
export interface ToastOptions {
  /** Required. What happened, past tense — "Policy saved". The toast's accessible name. */
  title: string
  /** One sentence of detail, wired as the toast's description. */
  description?: string
  /** `success`, `info` or `warning`. */
  severity?: ToastSeverity
  /** At most one. Undo on a toast is only a shortcut to an Undo that also exists in place. */
  action?: ToastAction
}

/** What `useToast()` returns. */
export interface ToastApi {
  /** Raises a toast and returns its id. */
  add: (options: ToastOptions) => string
  /** Dismisses the toast `add` returned `id` for. */
  dismiss: (id: string) => void
}

export interface ToastProviderProps {
  /** Where the region sits. */
  placement?: ToastPlacement
  /** How many toasts show at once; older ones wait, hidden, until newer ones leave. */
  limit?: ToastLimit
  /** The region's accessible name — the landmark F6 lands on. */
  label?: string
  /** The accessible name of every toast's close button. */
  dismissLabel?: string
  /** Required. The app. */
  children: React.ReactNode
}

interface ToastData {
  severity: ToastSeverity
  action?: ToastAction
}

const ICON: Record<ToastSeverity, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircleIcon,
  info: InfoCircleIcon,
  warning: WarningTriangleIcon,
}

/** Swipe toward the edge the toast sits on. Base UI's directions are physical (toast.md, Implementations). */
const SWIPE: Record<ToastPlacement, ('up' | 'down' | 'left' | 'right')[]> = {
  'bottom-end': ['right', 'down'],
  'top-end': ['right', 'up'],
  'bottom-center': ['down'],
}

/** The token's own value, which applies when no stylesheet is loaded. */
const DURATION_FALLBACK = 6000
/** `6000ms`, `6s` → milliseconds; anything else → the fallback. */
const readDuration = (el: Element | null) => {
  if (!el) return DURATION_FALLBACK
  const raw = getComputedStyle(el).getPropertyValue('--vela-duration-toast').trim()
  const m = /^(\d*\.?\d+)(ms|s)$/.exec(raw)
  return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : DURATION_FALLBACK
}

const VelaToastContext = React.createContext<ToastApi | null>(null)

/**
 * The region and the context `useToast()` reads. One per app, near the root; toasts appear at
 * `placement`, announced politely, `limit` at a time.
 */
export function ToastProvider({
  placement = 'bottom-end',
  limit = 3,
  label = 'Notifications',
  dismissLabel = 'Dismiss',
  children,
}: ToastProviderProps) {
  return (
    <BaseToast.Provider limit={limit}>
      <ToastRegion placement={placement} label={label} dismissLabel={dismissLabel}>
        {children}
      </ToastRegion>
    </BaseToast.Provider>
  )
}

function ToastRegion({
  placement,
  label,
  dismissLabel,
  children,
}: Required<Omit<ToastProviderProps, 'limit'>>) {
  const manager = BaseToast.useToastManager()
  const { add: baseAdd, close } = manager
  // A hidden marker where the provider is rendered: the portal reads its theme, and the timer its
  // --vela-duration-toast, from here.
  const anchor = React.useRef<HTMLSpanElement | null>(null)
  const portal = useOverlayPortal(anchor)
  const portalNode = React.useRef<HTMLDivElement | null>(null)
  const syncTheme = portal.ref
  const portalRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      portalNode.current = node
      syncTheme(node)
    },
    [syncTheme],
  )

  const api = React.useMemo<ToastApi>(
    () => ({
      add({ title, description, severity = 'info', action }) {
        // The region lives as long as the provider; a theme switched since it mounted is picked up here.
        syncTheme(portalNode.current)
        const timeout = severity === 'warning' || action ? 0 : readDuration(anchor.current)
        const data: ToastData = { severity, action }
        return baseAdd({ title, description, type: severity, timeout, priority: 'low', data })
      },
      dismiss: (id) => close(id),
    }),
    [baseAdd, close, syncTheme],
  )

  return (
    <VelaToastContext.Provider value={api}>
      {children}
      <span ref={anchor} hidden className="vela-toast__anchor" />
      <BaseToast.Portal ref={portalRef} className={portal.className}>
        <BaseToast.Viewport
          aria-label={label}
          className={cn('vela-toast-region', `vela-toast-region--${placement}`)}
        >
          {manager.toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} swipe={SWIPE[placement]} dismissLabel={dismissLabel} close={close} />
          ))}
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </VelaToastContext.Provider>
  )
}

function ToastItem({
  toast,
  swipe,
  dismissLabel,
  close,
}: {
  toast: BaseToast.Root.ToastObject<ToastData>
  swipe: ('up' | 'down' | 'left' | 'right')[]
  dismissLabel: string
  close: (id: string) => void
}) {
  const severity = toast.data?.severity ?? 'info'
  const action = toast.data?.action
  const Icon = ICON[severity]
  // From the keyboard, nothing animates: a toast dismissed by Escape, or by Enter or Space on one of
  // its buttons, leaves at once. A pointer press clears the mark.
  const [instant, setInstant] = React.useState(false)
  return (
    <BaseToast.Root
      toast={toast}
      swipeDirection={swipe}
      className={cn('vela-toast', `vela-toast--${severity}`)}
      data-vela-instant={instant || undefined}
      onKeyDownCapture={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setInstant(true)
      }}
      onPointerDownCapture={() => setInstant(false)}
    >
      <span className="vela-toast__mark" aria-hidden="true">
        <Icon className="vela-toast__icon" />
      </span>
      <div className="vela-toast__content">
        <BaseToast.Title className="vela-toast__title" />
        <BaseToast.Description className="vela-toast__description" />
        {action && (
          <Button
            size="tiny"
            className="vela-toast__action"
            onClick={() => {
              action.onClick()
              close(toast.id)
            }}
          >
            {action.label}
          </Button>
        )}
      </div>
      <button type="button" className="vela-toast__close" aria-label={dismissLabel} onClick={() => close(toast.id)}>
        <CloseIcon />
      </button>
    </BaseToast.Root>
  )
}

/** Raise and dismiss toasts. Inside a `ToastProvider` only. */
export function useToast(): ToastApi {
  const api = React.useContext(VelaToastContext)
  if (!api) throw new Error('useToast() must be called inside <ToastProvider>: there is no region to add a toast to.')
  return api
}
