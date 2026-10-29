import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import { Button } from '../../components/Button'
import { CloseIcon } from '../../lib/icons'
import { cn } from '../../lib/cn'
import { fromKeyboard, useOverlayPortal } from '../overlay'

/**
 * Dialog (modal) and its `alert` variant on Base UI — headless-born
 * (`guidelines/components/dialog.md`); no core implementation.
 *
 * Where Base UI's defaults differ from the spec, the mapping is made here and recorded in the
 * spec's "Implementations" section:
 *
 * - **Two Base UI components, one Vela component.** `variant="standard"` is Base UI's `Dialog`;
 *   `variant="alert"` is its `AlertDialog` (`role="alertdialog"`, no dismissal on outside press).
 *   The parts are the same (`AlertDialog` re-exports Dialog's Popup, Title, Close…), so one tree
 *   renders both.
 * - **The alert's actions are not a slot.** The spec fixes them: an explicit cancel, and a confirm
 *   that is always a `destructive` Button. Base UI leaves both to the author.
 * - **Initial focus.** Base UI focuses the first tabbable element, which in a standard dialog is
 *   the header's close button. The spec moves focus to the first control in the body or footer
 *   (the close button when there is none), and in an alert to the cancel action — the safe one.
 * - **Portal.** The portal element carries `vela-root` and the theme of the dialog's trigger or,
 *   with no trigger, of where the Dialog is rendered (`../overlay`).
 */

export type DialogSize = 'regular' | 'wide'
export type DialogVariant = 'standard' | 'alert'

interface DialogBaseProps {
  /** Required. Rendered as the dialog's heading and wired as its accessible name. */
  title: string
  /** A sentence under the title, wired by `aria-describedby`. A string: it is read, not used. */
  description?: string
  /** The popup width: `--vela-dialog-width` or `--vela-dialog-width-wide`. */
  size?: DialogSize
  /** The element that opens the dialog. Omit it when `open` is driven from elsewhere. */
  trigger?: React.ReactElement
  /** Receives the NEXT open state. */
  onOpenChange?: (open: boolean) => void
  /** The body. It scrolls; the header and the footer stay. */
  children?: React.ReactNode
  className?: string
}

type DialogOpenProps =
  | { /** Controlled. */ open: boolean; defaultOpen?: never }
  | { open?: never; /** Uncontrolled initial state. */ defaultOpen?: boolean }

interface StandardDialogProps {
  variant?: 'standard'
  /** The actions, right-aligned under the body. Wrap one in `Dialog.Close` to close on click. */
  footer?: React.ReactNode
  /** The accessible name of the header's close button. */
  closeLabel?: string
  cancelLabel?: never
  confirmLabel?: never
  onConfirm?: never
}

interface AlertDialogProps {
  /** Confirm a destructive or irreversible action. */
  variant: 'alert'
  /** Required. The safe way out — focused on open, and what Escape does. */
  cancelLabel: string
  /** Required. The destructive action, verb-first ("Delete Policy"). Always a destructive Button. */
  confirmLabel: string
  /** Required. Called on confirm; the dialog then closes. */
  onConfirm: () => void
  footer?: never
  closeLabel?: never
}

export type DialogProps = DialogBaseProps & DialogOpenProps & (StandardDialogProps | AlertDialogProps)

export interface DialogCloseProps {
  /** The ONE element that closes the dialog when activated — usually a Button. */
  children: React.ReactElement
}

// Vela's own provider guard for Dialog.Close, so the named error is the kit's and not Base UI's.
const VelaDialogContext = React.createContext(false)

// What can take focus in the body or the footer, in document order.
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
const firstTabbable = (root: Element | null) =>
  root
    ? [...root.querySelectorAll<HTMLElement>(TABBABLE)].find(
        (el) => el.tabIndex >= 0 && !el.closest('[aria-hidden="true"]') && !el.hasAttribute('data-base-ui-focus-guard'),
      ) ?? null
    : null

function DialogRoot(props: DialogProps) {
  const {
    title,
    description,
    size = 'regular',
    trigger,
    open,
    defaultOpen,
    onOpenChange,
    children,
    className,
  } = props
  const alert = props.variant === 'alert'
  const Base = alert ? BaseAlertDialog : BaseDialog
  const anchor = React.useRef<HTMLElement | null>(null)
  // The trigger is a button; with no trigger, the anchor is the hidden marker below.
  const triggerRef = anchor as React.RefObject<HTMLButtonElement | null>
  const portal = useOverlayPortal(anchor)
  const popup = React.useRef<HTMLDivElement | null>(null)
  const cancel = React.useRef<HTMLButtonElement | null>(null)
  const [instant, setInstant] = React.useState(false)

  const handleOpenChange = React.useCallback(
    (next: boolean, details: BaseDialog.Root.ChangeEventDetails) => {
      setInstant(fromKeyboard(details))
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  // Standard: the first control in the body, then the footer, else Base UI's default (the close
  // button). Alert: always the cancel action.
  const initialFocus = React.useCallback(() => {
    if (alert) return cancel.current ?? true
    const p = popup.current
    return firstTabbable(p?.querySelector('.vela-dialog__body') ?? null) ?? firstTabbable(p?.querySelector('.vela-dialog__footer') ?? null) ?? true
  }, [alert])

  const footer = alert ? (
    <>
      <BaseDialog.Close render={<Button ref={cancel}>{props.cancelLabel}</Button>} />
      <BaseDialog.Close render={<Button variant="destructive" onClick={props.onConfirm}>{props.confirmLabel}</Button>} />
    </>
  ) : (
    props.footer
  )

  return (
    <VelaDialogContext.Provider value={true}>
      <Base.Root open={open} defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
        {trigger ? (
          <Base.Trigger ref={triggerRef} render={trigger} />
        ) : (
          // No trigger: a hidden marker where the Dialog is rendered, so the portal can read its theme.
          <span ref={anchor} hidden className="vela-dialog__anchor" />
        )}
        <Base.Portal {...portal}>
          <Base.Backdrop className="vela-dialog__backdrop" data-vela-instant={instant || undefined} />
          <Base.Viewport className="vela-dialog__viewport">
            <Base.Popup
              ref={popup}
              initialFocus={initialFocus}
              className={cn('vela-dialog', `vela-dialog--${size}`, alert && 'vela-dialog--alert', className)}
              data-vela-instant={instant || undefined}
            >
              <div className="vela-dialog__header">
                <div className="vela-dialog__heading">
                  <Base.Title className="vela-dialog__title">{title}</Base.Title>
                  {description && <Base.Description className="vela-dialog__description">{description}</Base.Description>}
                </div>
                {!alert && (
                  <BaseDialog.Close
                    className="vela-dialog__close"
                    aria-label={(props as StandardDialogProps).closeLabel ?? 'Close'}
                  >
                    <CloseIcon />
                  </BaseDialog.Close>
                )}
              </div>
              {children !== undefined && <div className="vela-dialog__body">{children}</div>}
              {footer && <div className="vela-dialog__footer">{footer}</div>}
            </Base.Popup>
          </Base.Viewport>
        </Base.Portal>
      </Base.Root>
    </VelaDialogContext.Provider>
  )
}

function DialogClose({ children }: DialogCloseProps) {
  if (!React.useContext(VelaDialogContext)) throw new Error('<Dialog.Close> must be rendered inside <Dialog>.')
  return <BaseDialog.Close render={children} />
}

/** A modal that blocks the page for a decision. For a panel that does not block, use Popover. */
export const Dialog = Object.assign(DialogRoot, { Close: DialogClose })
