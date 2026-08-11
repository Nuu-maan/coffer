# Coffer

A capture buffer and prompt queue for AI-assisted work. Windows and Linux.

Select text or an image anywhere on your desktop and tap `Shift` twice — it lands in Coffer. Press `Ctrl+Shift+Space` to clip a region of the screen, annotate it, and send it to the list. Or type a stash, paste an image, or drop one into the app window. Work the list down later, copying each item back into ChatGPT, Claude, or Cursor and checking it off.

Light, dark, or follow the system — the toggle lives in Settings.

An image stash has two copy targets: click the thumbnail to copy the image, click its caption to copy the text.

No account, no sync, no telemetry. Everything is a JSON file plus a folder of PNGs:

| Platform | Location |
| --- | --- |
| Windows | `%APPDATA%\coffer\` |
| Linux | `~/.config/coffer/` |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR for the renderer and reload for main |
| `npm run build` | Typecheck, then build all three bundles into `out/` |
| `npm test` | Unit tests (vitest) |
| `npm run typecheck` | Node and web tsconfigs |
| `npm run dist:win` | NSIS installer into `release/` |
| `npm run dist:linux` | AppImage and `.deb` into `release/` — must run on Linux |

Linux artefacts cannot be cross-built from Windows. `.github/workflows/release.yml` builds both on a tag push.

## Keys

Anywhere:

| Key | Action |
| --- | --- |
| `Shift` `Shift` | Stash the current selection (X11 and Windows) |
| `Ctrl+Shift+Space` | Clip a region of the screen |
| `Ctrl+Alt+Space` | Stash the selection — the fallback trigger |

Both accelerators are rebindable in Settings. Coffer refuses to register either if they collide, and says so.

On Wayland the compositor owns key bindings, so there are no defaults to list: Coffer registers the named actions `com.coffer.app:stash` and `com.coffer.app:clip` with the desktop portal, and Settings shows the config line that binds them. See [Wayland shortcuts](#wayland-shortcuts).

In the clipper overlay:

| Key | Action |
| --- | --- |
| Drag | Choose the region |
| `Esc` or right-click | Cancel |
| `Enter` in the form | Stash the clip |
| `Shift+Enter` | Newline in the note |

App window:

| Key | Action |
| --- | --- |
| `Enter` in the composer | Add a typed stash |
| `Shift+Enter` | Newline |
| `Ctrl+V` | Stash an image from the clipboard |
| `j` / `k` or arrows | Move selection |
| `Enter` | Copy selected item — the image, for an image stash |
| `Space` | Toggle done |
| `Delete` | Remove |
| `Esc` | Hide to tray |

Double-click an item to edit it, or to caption an image. Drag to reorder. Drop image files anywhere in the window.

## Architecture

Three processes with a hard boundary. The renderer has no filesystem, clipboard, or hook access; everything crosses through a typed bridge.

```
src/shared      contract imported by both sides
  ipc/channels  every channel name, nowhere else
  ipc/contract  the CofferApi surface
  types         Item, Store, Settings, PlatformInfo

src/main        Node, owns all privilege
  platform           session detection, Linux flags, Linux autostart
  hotkey             low-level keyboard hook + pure double-tap detector
  protocol           coffer:// scheme that serves stashed images
  windows            list window, clipper overlay, clip form
  store              load, atomic write, migrations
  features
    items            add, toggle, reorder, delete
    images           PNGs on disk, addressed by filename
    clipper          screen capture, region crop, the clip flow
    selection-capture  per-platform read of whatever is selected
    source-capture   foreground app and window title
    stash            the capture flow that ties them together
    settings
  tray
  ipc/register       binds every handler in one place

src/preload     contextBridge only

src/renderer    React + shadcn/ui, three HTML entries
  index.html         the list window
  clipper.html       the fullscreen region selector
  compose.html       the clip form
  components/ui      shadcn components, owned in-tree
```

## How the clipper works

1. Screenshot every display first, via `desktopCapturer`.
2. Open one frameless always-on-top window per display, painted with that display's frozen frame. Because the screenshot is taken *before* the overlay exists, the overlay can never appear in the shot.
3. Drag a rectangle. Coordinates are CSS pixels, which equal DIPs because each overlay exactly covers its display — so cropping only needs the image-to-DIP scale factor, derived from the captured image rather than from `scaleFactor`.
4. Crop, then open a small form with the preview and a note field. `Enter` or the button commits it as an image item; `Esc` discards.

The overlays are created once at startup and reused, so a clip never waits for a window to be built or a page to load. Main pushes the frame only after the renderer reports it is listening, the renderer decodes the image before painting, and the windows are revealed together once every one of them acks that it has painted — which is what keeps the screen from flashing black. Frames cross as bytes over the `coffer://` scheme rather than as base64 through IPC.

`hotkey/double-tap.ts` is a pure function over key events so the trickiest logic is testable without a keyboard.

## How capture works per platform

| Session | Trigger | Reading the selection |
| --- | --- | --- |
| Windows | `uiohook-napi` low-level hook, or accelerator | Synthesize `Ctrl+C`, poll the clipboard, restore it on failure |
| Linux / X11 | Same hook, or accelerator | Read the PRIMARY selection directly — no keystroke needed |
| Linux / Wayland | Named actions bound by the compositor through the XDG GlobalShortcuts portal | PRIMARY selection, falling back to the clipboard |

The double-tap trigger needs to watch the keyboard, which Wayland does not permit. Neither does it permit `globalShortcut`, which reports success there and then never fires. Coffer detects the session and takes the portal route instead of pretending an accelerator was registered.

### Wayland shortcuts

The portal hands out *names*; the compositor owns the *keys*. Three things have to line up:

1. **An app id.** xdg-desktop-portal refuses a shortcuts session from an application it cannot name (`An app id is required`), and it names unsandboxed applications by resolving `<app-id>.desktop` through GLib — which only succeeds if the entry exists in an XDG application directory *and* its `Exec` points at a real binary. Coffer writes its own `NoDisplay=true` entry at `$XDG_DATA_HOME/applications/com.coffer.app.desktop` so this holds however it was installed, including in `npm run dev`.
2. **Registration.** Coffer calls `org.freedesktop.host.portal.Registry.Register` on the same D-Bus connection before opening the session.
3. **A binding.** After `BindShortcuts` the actions exist but have no keys. On Hyprland, `hyprctl globalshortcuts` lists them and `hyprland.conf` binds them:

   ```
   bind = SUPER, S, global, com.coffer.app:stash
   bind = SUPER SHIFT, S, global, com.coffer.app:clip
   ```

   Settings shows the right snippet for the running desktop, with a copy button.

Compositors that do not speak the shortcuts portal can bind a command instead: `coffer --stash` and `coffer --clip` are forwarded to the running instance through the single-instance lock.

## Notes

- The `uiohook-napi` hook is blocked on some managed or antivirus-protected machines. Settings offers `Ctrl+Shift+Space`, and the app falls back automatically if the hook cannot start.
- Wayland global shortcuts go through Coffer's own D-Bus client (`hotkey/portal.ts`) rather than Chromium's `GlobalShortcutsPortal` feature, so the action names, the bound state, and any portal refusal are all visible in Settings instead of failing silently.
- Images are written to `images/<id>.png` beside the store rather than inlined as base64, so the store file stays small and every debounced save stays cheap. The renderer loads them over a registered `coffer://` scheme, so the CSP never needs to allow `file:`.
- On Wayland the clipper does not use `desktopCapturer`, whose screencast portal demands a source picker on every use. It tries, in order of what the session supports: `grim` on wlroots compositors, the `org.freedesktop.portal.Screenshot` portal, then `spectacle` on KDE. The portal may ask for permission once, then stays silent. If every backend fails it falls back to `desktopCapturer` and the picker returns.
- Theme is stored in settings and pushed to `nativeTheme.themeSource` in the main process. Every renderer then just follows `prefers-color-scheme`, so the overlay and the clip form stay in sync with the list window for free.
- `source` (foreground app and window title) is recorded on Windows and X11. Wayland does not expose it to applications at all.
- Renaming the app means editing `src/shared/constants.ts` plus `name` in `package.json` and `appId`/`productName` in `electron-builder.yml`.
