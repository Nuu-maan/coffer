export const CH = {
  ITEMS_LIST: 'items:list',
  ITEMS_ADD: 'items:add',
  ITEMS_ADD_IMAGE: 'items:addImage',
  ITEMS_TOGGLE: 'items:toggle',
  ITEMS_UPDATE: 'items:update',
  ITEMS_DELETE: 'items:delete',
  ITEMS_DELETE_MANY: 'items:deleteMany',
  ITEMS_RESTORE: 'items:restore',
  ITEMS_REORDER: 'items:reorder',
  ITEMS_CLEAR_DONE: 'items:clearDone',
  ITEMS_SET_TAG: 'items:setTag',

  SECTIONS_ADD: 'sections:add',
  SECTIONS_RENAME: 'sections:rename',
  SECTIONS_REMOVE: 'sections:remove',
  SECTIONS_REORDER: 'sections:reorder',
  SECTIONS_MOVE_ITEMS: 'sections:moveItems',
  SECTIONS_SET_DONE: 'sections:setDone',

  CLIPBOARD_READ: 'clipboard:read',
  CLIPBOARD_WRITE: 'clipboard:write',
  CLIPBOARD_WRITE_IMAGE: 'clipboard:writeImage',

  STASH_SELECTION: 'stash:selection',

  CLIPPER_START: 'clipper:start',
  CLIPPER_REGION: 'clipper:region',
  CLIPPER_CANCEL: 'clipper:cancel',
  CLIPPER_COMMIT: 'clipper:commit',
  CLIPPER_DRAFT: 'clipper:draft',
  CLIPPER_MOUNTED: 'clipper:mounted',
  CLIPPER_PAINTED: 'clipper:painted',

  PLATFORM_INFO: 'platform:info',
  PERMISSIONS_STATUS: 'permissions:status',
  PERMISSIONS_REQUEST: 'permissions:request',
  HOTKEY_STATUS: 'hotkey:status',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  WINDOW_OPEN_MAIN: 'window:openMain',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_HIDE_MAIN: 'window:hideMain',

  ON_CLIPPER_FRAME: 'on:clipperFrame',
  ON_ITEMS_CHANGED: 'on:itemsChanged',
  ON_SETTINGS_CHANGED: 'on:settingsChanged',
  ON_HOTKEY_STATUS: 'on:hotkeyStatus',
  ON_PERMISSIONS_CHANGED: 'on:permissionsChanged',
  ON_SHOW_SETTINGS: 'on:showSettings'
} as const

export type Channel = (typeof CH)[keyof typeof CH]
