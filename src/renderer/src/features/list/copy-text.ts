import { itemLabel, type Item } from '@shared/types/item'

/**
 * A numbered list, one stash per entry, in the order the list shows them.
 *
 * A stash's own line breaks are folded into its entry rather than carried
 * through. A numbered list is a sequence of things and the number is the claim
 * that each line is one of them — a two-line stash pasted in raw would arrive
 * as one numbered entry with an orphaned line hanging under it, and nothing
 * about the paste would say which of the two it was.
 */
export function asNumberedList(items: Item[]): string {
  return labels(items)
    .map((label, index) => `${index + 1}. ${label.replace(/\s*\n\s*/g, ' ')}`)
    .join('\n')
}

/** Blank lines between, the way copying paragraphs out of a document does. */
export function asParagraphs(items: Item[]): string {
  return labels(items).join('\n\n')
}

/* An image's label is its caption, which is often empty — an uncaptioned image
   has nothing to contribute to a list of text and is left out rather than
   numbered as a blank. */
function labels(items: Item[]): string[] {
  return items.map((item) => itemLabel(item).trim()).filter(Boolean)
}
