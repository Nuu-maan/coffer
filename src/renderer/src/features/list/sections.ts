import { itemLabel, type Item, type Section } from '@shared/types/item'

export type Group = {
  /** The section this group is drawn under. Null for the items nobody has filed. */
  section: Section | null
  items: Item[]
}

/*
 * The list, cut into the groups the captions sit above.
 *
 * Order comes from the sections themselves now rather than from the items in
 * them. It used to be read off the first member — a section appeared where its
 * earliest stash did — which meant a section could not be moved without moving
 * a stash, and a section with nothing in it could not be drawn at all. Both are
 * things a section is now asked to do.
 *
 * A section with no items still gets a group, and so a caption: that is the
 * whole of what "New section" makes, and a caption that vanished the moment it
 * was created would read as the button not working.
 *
 * The unfiled items are always last, because a caption cannot be drawn for them
 * and a run of uncaptioned cards in the middle of the list reads as a rendering
 * fault rather than as a group.
 */
export function group(items: Item[], sections: Section[]): Group[] {
  const groups: Group[] = sections.map((section) => ({ section, items: [] }))
  const byKey = new Map(groups.map((entry) => [entry.section?.name.toLocaleLowerCase(), entry]))
  const untagged: Item[] = []

  for (const item of items) {
    const entry = item.tag ? byKey.get(item.tag.toLocaleLowerCase()) : undefined
    if (entry) entry.items.push(item)
    else untagged.push(item)
  }

  if (untagged.length > 0) groups.push({ section: null, items: untagged })
  return groups
}

/*
 * Search matches the text and the section name, so typing a section's name
 * pulls up everything filed under it. Case- and accent-insensitive: someone
 * searching for "cafe" means the one they wrote as "café".
 */
export function matches(item: Item, query: string): boolean {
  const needle = fold(query)
  if (!needle) return true
  return fold(itemLabel(item)).includes(needle) || fold(item.tag ?? '').includes(needle)
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim()
}
