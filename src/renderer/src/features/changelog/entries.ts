export type Release = {
  version: string
  /** ISO, or '' while the release has not been cut. */
  date: string
  /** Set on the one nobody has shipped yet. */
  unreleased?: boolean
  changes: string[]
}

/*
 * What has changed, in the app rather than only in a file on GitHub.
 *
 * Written by hand and kept here rather than generated from the commit log: a
 * commit message is addressed to whoever is reading the diff, and half of them
 * are about the build. This is addressed to whoever is using the panel, and it
 * says what they can now do that they could not before.
 *
 * Newest first, which is the only order anyone reads a changelog in.
 */
export const RELEASES: Release[] = [
  {
    version: '0.3.1',
    date: '2026-09-02',
    changes: [
      'macOS: a permission that System Settings shows as granted but Coffer could not see — the usual state after an update — is cleared and asked for again from Grant…, and the first stash refused for lack of Accessibility asks as well.',
      'macOS: Accessibility takes effect the moment it is granted. The panel updates and the double-tap trigger starts without a restart; Screen Recording still needs one, and Settings now has a button for it.',
      'macOS: the panel keeps the system’s own window corners, and the corner radius setting is gone there.',
      'Undo keeps every stash of a large delete rather than the first fifty, and their images with them.',
      'A stash file that cannot be read on launch is set aside rather than written over.'
    ]
  },
  {
    version: '0.3.0',
    date: '2026-08-31',
    changes: [
      'Sections are real: make an empty one from the + menu, drag a caption to move the whole section, and rename it in place.',
      'Tick or untick a whole section at once, or move everything in it somewhere else in one go.',
      'The + menu moved into the composer, next to the field the stash is typed in. Settings and this changelog are behind the ⋯ in the title bar.',
      'The accent is monochrome. A saturated blue on a translucent panel was the loudest thing on screen; emphasis is carried by contrast now.',
      'Raised contrast throughout — secondary text, placeholders, hairlines and the step between a card and the window behind it.',
      'The panel no longer sits on an opaque tray. Its rounded corners are the window’s corners.',
      'Redesigned the New Clip window, and the copy badge on a card.',
      'Deleting is undoable. A deleted stash offers Undo, and its image is kept until the offer has gone.',
      'Reorder without a pointer: Alt with an arrow moves the selected stash, or the focused section caption.',
      'Toasts can be swiped away in any direction, and stay long enough to reach the Undo in them.',
      'The tray icon is white, so it reads on a dark bar.'
    ]
  },
  {
    version: '0.2.0',
    date: '2026-08-24',
    changes: [
      'macOS support: the menu bar, the permission prompts it needs, and a build that is actually signed.',
      'Sections, so a long list can be cut into groups.',
      'Search across everything stashed, from the title bar.',
      'Select several stashes at once and copy them as text or as a list.',
      'Clip a region of the screen and stash it with a note.'
    ]
  },
  {
    version: '0.1.0',
    date: '2026-08-10',
    changes: ['The first public build: stash a selection with a shortcut, and get it back from the tray.']
  }
]
