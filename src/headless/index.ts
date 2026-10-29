/**
 * @omkarux/vela/headless — the Base UI-backed entry point. Experimental (GOVERNANCE.md).
 *
 * Same specs, same CSS, same tests as `@omkarux/vela`; the behaviour comes from Base UI
 * (`@base-ui/react`, MIT), which is an OPTIONAL peer dependency: install it to import from here.
 * The default entry point `@omkarux/vela` does not import this module and keeps zero runtime
 * dependencies — `scripts/verify-pack.mjs` asserts that against the built output.
 *
 * Styles are not imported here either; `import '@omkarux/vela/styles.css'` once, as usual.
 *
 * See `decisions/002-agent-ready-direction` for why two entry points, and each component's
 * spec ("Implementations") for where this implementation and the core one differ.
 */

export { Tabs } from './Tabs'
export type { TabsProps, TabListProps, TabTriggerProps, TabPanelProps } from './Tabs'
