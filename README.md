# Coffer

A capture buffer and prompt queue for AI-assisted work, for Windows.

Select text anywhere on your desktop and tap `Shift` twice — it lands in Coffer. Or type a stash directly in the app window. Work the list down later, copying each item back into ChatGPT, Claude, or Cursor and checking it off.

No account, no sync, no telemetry. Everything is a JSON file at `%APPDATA%\coffer\store.json`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR for the renderer and reload for main |
| `npm run build` | Typecheck, then build all three bundles into `out/` |
| `npm test` | Unit tests (vitest) |
| `npm run typecheck` | Node and web tsconfigs |
| `npm run dist` | Build plus an NSIS installer into `release/` |

## Keys

Anywhere:

| Key | Action |
| --- | --- |
| `Shift` `Shift` | Stash the current selection |

App window:

| Key | Action |
| --- | --- |
| `Enter` in the composer | Add a typed stash |
| `Shift+Enter` | Newline |

| Key | Action |
| --- | --- |
| `j` / `k` or arrows | Move selection |
| `Enter` | Copy selected item to clipboard |
| `Space` | Toggle done |
| `Delete` | Remove |
| `Esc` | Hide to tray |

Double-click an item to edit it. Drag to reorder.

## Architecture

Three processes with a hard boundary. The renderer has no filesystem, clipboard, or hook access; everything crosses through a typed bridge.

```
src/shared      contract imported by both sides
  ipc/channels  every channel name, nowhere else
  ipc/contract  the CofferApi surface
  types         Item, Store, Settings

src/main        Node, owns all privilege
  hotkey             low-level keyboard hook + pure double-tap detector
  windows            list window and positioning
  store              load, atomic write, migrations
  features
    items            add, toggle, reorder, delete
    selection-capture  synthesize Ctrl+C, read the clipboard back
    source-capture   foreground app and window title
    stash            the capture flow that ties them together
    settings
  tray
  ipc/register       binds every handler in one place

src/preload     contextBridge only

src/renderer    React, feature folders
```

`hotkey/double-tap.ts` is a pure function over key events so the trickiest logic is testable without a keyboard.

## Notes

- The double-Shift trigger uses a system-wide low-level keyboard hook (`uiohook-napi`). Some managed or antivirus-protected machines block it. Settings offers `Ctrl+Shift+Space` as a fallback, and the app falls back automatically if the hook cannot start.
- Stashing a selection works by synthesizing `Ctrl+C` into the foreground app and reading the clipboard back. That means it works anywhere `Ctrl+C` works, and nowhere it does not. The previous clipboard contents are restored if nothing was selected.
- `source` (foreground app and window title) is recorded on every capture but not yet shown in the UI. It cannot be reconstructed later, so it is captured from day one.
- Renaming the app means editing `src/shared/constants.ts` plus `name` in `package.json` and `appId`/`productName` in `electron-builder.yml`.
