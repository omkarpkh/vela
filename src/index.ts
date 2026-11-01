/**
 * @omkarux/vela — public API.
 *
 * Everything exported here is a promise: renaming or removing any of it is a
 * MAJOR version. Anything not exported here is internal and free to change.
 *
 * Styles are NOT imported by this file. Consumers import them explicitly:
 *   import '@omkarux/vela/styles.css'
 * That keeps the JS bundle free of CSS side effects and leaves SSR and
 * style ordering under the consuming app's control.
 */

export { Button } from './components/Button'
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  SolidButtonProps,
  TextLinkButtonProps,
} from './components/Button'

export { Toggle } from './components/Toggle'
export type { ToggleProps } from './components/Toggle'

export { Input } from './components/Input'
export type { InputProps } from './components/Input'

export { TextArea } from './components/TextArea'
export type { TextAreaProps } from './components/TextArea'

export { ContextualAlert } from './components/ContextualAlert'
export type { ContextualAlertProps, Severity } from './components/ContextualAlert'

export { StatusIndicator } from './components/StatusIndicator'
export type { StatusIndicatorProps, Status } from './components/StatusIndicator'

export { RiskPill } from './components/RiskPill'
export type { RiskPillProps, Risk } from './components/RiskPill'

export { Tabs } from './components/Tabs'
export type { TabsProps, TabListProps, TabTriggerProps, TabPanelProps } from './components/Tabs'

// The curated icon set (decisions/003-icons-lucide-curated): one component and the closed list of
// names. The individual glyph components are internal and not exported.
export { Icon } from './components/Icon'
export type { IconProps, IconSize, IconTone } from './components/Icon'
export { ICON_NAMES } from './icons/names'
export type { IconName } from './icons/names'

// Another company's own logo, to link to its service: a closed set of two, kept apart from Icon
// (guidelines/components/brand-mark.md). The owners' files and their source notes are in src/brand-marks/.
export { BrandMark } from './components/BrandMark'
export type { BrandMarkProps, BrandMarkName, BrandMarkSize } from './components/BrandMark'

export { Table } from './components/Table'
export type {
  TableProps,
  TableSectionProps,
  TableRowProps,
  TableHeaderCellProps,
  TableCellProps,
  TableEmptyProps,
  TableSort,
  TableSortDirection,
  TableDensity,
  TableLayout,
  TableAlign,
} from './components/Table'

export { cn } from './lib/cn'

// Filter Grammar (guidelines/contracts/filter-grammar.md): one contract for "these records, and not
// the others", with no UI. A host declares its fields once; every condition, typed, linked, saved or
// emitted by an agent, is checked against that declaration, and each query has one text form and one
// readback sentence. Plain functions with no dependencies, so a backend in Node imports the same ones.
export {
  defineFields,
  parseQuery,
  validateQuery,
  normalise,
  queryToText,
  readback,
  evaluate,
  leftOutQuery,
  LeftOutNotExpressible,
} from './grammar'
export type {
  Fields,
  FieldName,
  FieldSchema,
  FieldSpec,
  FieldTrust,
  FieldType,
  EnumValue,
  Query,
  Group,
  Node,
  Condition,
  MatchFor,
  PositiveCondition,
  PositiveConjunction,
  Operator,
  PositiveOperator,
  NegatedOperator,
  Duration,
  DurationUnit,
  Range,
  ValueList,
  ParseError,
  ParseResult,
  FieldRecord,
  Evaluation,
  EvaluateOptions,
  LeftOutOptions,
  ReadbackOptions,
  ReadbackStrings,
  ReadbackStringsInput,
} from './grammar'
