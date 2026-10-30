/**
 * The hover preview (the Seed) and the line it grows into on a press, in the underline's place.
 * Decorative and empty: the selection is aria-selected on the tab, and the tab's name is its label.
 * Shared with the headless implementation so both render the same markup for Tabs.css.
 */
export function TabLayers() {
  return (
    <>
      <span className="vela-tabs__seed" aria-hidden="true" />
      <span className="vela-tabs__line" aria-hidden="true" />
    </>
  )
}
