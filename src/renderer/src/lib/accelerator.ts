/*
 * Electron accelerator strings, rendered for a human and checked against the
 * combinations macOS has already spoken for.
 */

const GLYPHS: Record<string, string> = {
  Control: '⌃',
  Command: '⌘',
  Cmd: '⌘',
  Super: '⌘',
  Meta: '⌘',
  Shift: '⇧',
  Alt: '⌥',
  Option: '⌥',
  Return: '⏎',
  Space: 'Space'
}

const WORDS: Record<string, string> = {
  Control: 'Ctrl',
  Command: 'Super',
  Cmd: 'Super',
  Meta: 'Super',
  Option: 'Alt',
  Return: 'Enter'
}

/* The Mac glyphs are Mac keys. Off macOS the same modifier is a differently
   named, differently placed key, and printing ⌘ for it names a key the
   keyboard does not have. */
export function parts(accelerator: string, mac: boolean): string[] {
  return accelerator.split('+').map((part) => (mac ? (GLYPHS[part] ?? part) : (WORDS[part] ?? part)))
}

export function format(accelerator: string, mac: boolean): string {
  return parts(accelerator, mac).join(mac ? '' : '+')
}

/*
 * What macOS binds itself on a clean install. globalShortcut.register returns
 * false against these and the failure is otherwise silent, so the recorder
 * turns them down while the user can still pick something else.
 *
 * Modifier order does not matter, so each is compared as a set.
 */
const MAC_RESERVED = [
  'Control+Space',
  'Control+Alt+Space',
  'Control+Command+Space',
  'Control+Command+F',
  'Control+Command+Q',
  'Command+Space',
  'Alt+Command+Space',
  'Command+Tab',
  'Command+Shift+Tab',
  'Command+Shift+3',
  'Command+Shift+4',
  'Command+Shift+5',
  'Command+Shift+6',
  'Control+Up',
  'Control+Down',
  'Control+Left',
  'Control+Right'
]

function canonical(accelerator: string): string {
  const alias: Record<string, string> = { Super: 'Command', Cmd: 'Command', Meta: 'Command', Option: 'Alt' }
  return accelerator
    .split('+')
    .map((part) => alias[part] ?? part)
    .sort()
    .join('+')
    .toLowerCase()
}

const RESERVED = new Set(MAC_RESERVED.map(canonical))

export function isReservedByMacOS(accelerator: string): boolean {
  return RESERVED.has(canonical(accelerator))
}
