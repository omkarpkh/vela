import '@testing-library/jest-dom/vitest'

// jsdom has no PointerEvent. Base UI's Checkbox and Radio forward a click from the visible button
// to their hidden <input> as a `new PointerEvent('click', …)` (dispatchClickWithModifiers), so
// without this the headless Checkbox and Radio Group cannot be clicked in a unit test. A
// MouseEvent subclass is what browsers ship; the input's native activation runs on it the same way.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ''
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
}
