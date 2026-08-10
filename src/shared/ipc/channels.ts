export const CH = {
  ITEMS_LIST: 'items:list',
  ITEMS_ADD: 'items:add',
  ITEMS_TOGGLE: 'items:toggle',
  ITEMS_UPDATE: 'items:update',
  ITEMS_DELETE: 'items:delete',
  ITEMS_REORDER: 'items:reorder',
  ITEMS_CLEAR_DONE: 'items:clearDone',

  CLIPBOARD_READ: 'clipboard:read',
  CLIPBOARD_WRITE: 'clipboard:write',

  STASH_SELECTION: 'stash:selection',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  WINDOW_OPEN_MAIN: 'window:openMain',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_HIDE_MAIN: 'window:hideMain',

  ON_ITEMS_CHANGED: 'on:itemsChanged',
  ON_SETTINGS_CHANGED: 'on:settingsChanged'
} as const

export type Channel = (typeof CH)[keyof typeof CH]
