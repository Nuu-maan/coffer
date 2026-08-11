/**
 * Translates an Electron accelerator into the trigger syntax the desktop
 * portal's GlobalShortcuts interface expects: modifiers in caps, then an XKB
 * keysym name, all joined by '+'. Coffer only ever sends this as a *preferred*
 * trigger. Compositors are free to ignore it, and Hyprland does.
 */

const MODIFIERS: Record<string, string> = {
  control: 'CTRL',
  ctrl: 'CTRL',
  commandorcontrol: 'CTRL',
  cmdorctrl: 'CTRL',
  alt: 'ALT',
  option: 'ALT',
  altgr: 'ALT',
  shift: 'SHIFT',
  super: 'LOGO',
  meta: 'LOGO',
  command: 'LOGO',
  cmd: 'LOGO'
}

const KEYSYMS: Record<string, string> = {
  space: 'space',
  return: 'Return',
  enter: 'Return',
  tab: 'Tab',
  backspace: 'BackSpace',
  delete: 'Delete',
  insert: 'Insert',
  esc: 'Escape',
  escape: 'Escape',
  home: 'Home',
  end: 'End',
  pageup: 'Prior',
  pagedown: 'Next',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  '`': 'grave',
  '-': 'minus',
  '=': 'equal',
  '[': 'bracketleft',
  ']': 'bracketright',
  '\\': 'backslash',
  ';': 'semicolon',
  "'": 'apostrophe',
  ',': 'comma',
  '.': 'period',
  '/': 'slash'
}

export function toPortalTrigger(accelerator: string): string | undefined {
  const parts = accelerator.split('+').filter(Boolean)
  if (parts.length === 0) return undefined

  const modifiers: string[] = []
  let key: string | null = null

  for (const part of parts) {
    const lower = part.toLowerCase()
    const modifier = MODIFIERS[lower]

    if (modifier) {
      if (!modifiers.includes(modifier)) modifiers.push(modifier)
      continue
    }

    key = keysym(part, lower)
  }

  if (!key) return undefined
  return [...modifiers, key].join('+')
}

function keysym(part: string, lower: string): string | null {
  const named = KEYSYMS[lower]
  if (named) return named

  if (/^f\d{1,2}$/.test(lower)) return part.toUpperCase()
  if (/^[a-z0-9]$/.test(lower)) return lower

  return null
}
