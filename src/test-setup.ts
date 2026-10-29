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

// jsdom matches selectors with nwsapi, and nwsapi 2.2.27 answers the top-layer pseudo-classes
// (`:modal`, `:popover-open`, `:fullscreen`) by asking the element's own `matches` — which is
// nwsapi again — so each query recurses until the stack overflows and the error is swallowed. It
// costs seconds per call and starves the test worker. Floating UI asks `:popover-open` and `:modal`
// on every position update of a Popover, Tooltip or Dialog (`isTopLayer`). jsdom has no top layer,
// so the honest answer is `false`, given here without the recursion. Browsers are unaffected.
if (typeof Element !== 'undefined') {
  const nativeMatches = Element.prototype.matches
  const TOP_LAYER = /^\s*:(modal|popover-open|fullscreen)\s*$/
  Element.prototype.matches = function matches(this: Element, selector: string) {
    return TOP_LAYER.test(selector) ? false : nativeMatches.call(this, selector)
  }
}
