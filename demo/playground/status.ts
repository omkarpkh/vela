// Component lifecycle, read from the specs. GOVERNANCE.md: Approved is the default and is not
// written down; any other label is a `**Status:**` line under the intent paragraph. The Status
// page and each component page's facts grid show the label the spec carries, so the site and
// the spec cannot disagree.
export type Label = 'Approved' | 'Known bugs' | 'Experimental' | 'Retired'
export const LABELS: Label[] = ['Approved', 'Known bugs', 'Experimental', 'Retired']

export function statusOf(spec: string): { label: Label; note: string } {
  const m = spec.match(/^\*\*Status:\*\*\s*([^\n]+?)(?:\s+[—-]\s+([\s\S]*?))?\n\n/m)
  if (!m) return { label: 'Approved', note: '' }
  const word = LABELS.find((l) => m[1].trim().toLowerCase().startsWith(l.toLowerCase()))
  // A `**Dependencies:**` line may sit directly under the Status line; it is not part of the note.
  const note = (m[2] ?? '').replace(/^\*\*Dependencies:\*\*[^\n]*$/m, '')
  return { label: word ?? 'Approved', note: note.replace(/`/g, '').replace(/\s+/g, ' ').trim() }
}
