/**
 * Join class names. Deliberately ~5 lines rather than a dependency:
 * a design system's dependency list is a liability its consumers inherit.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
