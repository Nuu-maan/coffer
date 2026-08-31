# Architecture

Three processes with a hard boundary. The renderer has no filesystem, clipboard,
or hook access; everything crosses through a typed bridge.

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

src/renderer    React + Tailwind, three HTML entries
  index.html         the list window
  clipper.html       the fullscreen region selector
  compose.html       the clip form
  components/ui      primitives owned in-tree
  components/icons   every icon the app draws, behind one module
```

## How the clipper works

1. Screenshot every display first, via `desktopCapturer`.
2. Open one frameless always-on-top window per display, painted with that
   display's frozen frame. Because the screenshot is taken *before* the overlay
   exists, the overlay can never appear in the shot.
3. Drag a rectangle. Coordinates are CSS pixels, which equal DIPs because each
   overlay exactly covers its display — so cropping only needs the image-to-DIP
   scale factor, derived from the captured image rather than from `scaleFactor`.
4. Crop, then open a small form with the preview and a note field. `Enter` or the
   button commits it as an image item; `Esc` discards.

The overlays are created once at startup and reused, so a clip never waits for a
window to be built or a page to load. Main pushes the frame only after the
renderer reports it is listening, the renderer decodes the image before painting,
and the windows are revealed together once every one of them acks that it has
painted — which is what keeps the screen from flashing black. Frames cross as
bytes over the `coffer://` scheme rather than as base64 through IPC.

`hotkey/double-tap.ts` is a pure function over key events so the trickiest logic
is testable without a keyboard.

## How capture works per platform

| Session | Trigger | Reading the selection |
| --- | --- | --- |
| Windows | `uiohook-napi` low-level hook, or accelerator | Synthesize `Ctrl+C`, poll the clipboard, restore it on failure |
| macOS ¹ | Same hook once Accessibility is granted, or accelerator | Synthesize `⌘C` the same way, with `osascript` as the fallback |
| Linux / X11 | Same hook, or accelerator | Read the PRIMARY selection directly — no keystroke needed |
| Linux / Wayland | Named actions bound by the compositor through the XDG GlobalShortcuts portal | PRIMARY selection, falling back to the clipboard |

¹ macOS is in early development. Everything below describes what the code does
and what CI verifies on a runner; none of it has been watched by a person on a
real Mac, and the places that matters most are listed at the end of this file.

The double-tap trigger needs to watch the keyboard, which Wayland does not
permit. Neither does it permit `globalShortcut`, which reports success there and
then never fires. Coffer detects the session and takes the portal route instead
of pretending an accelerator was registered.

macOS permits both, but only after the user has said so, and it says no by
staying quiet rather than by failing. `hook_post_event` is declared `void` and
its darwin backend discards what `CGEventPost` returns, so an ungranted
`keyTap` reports success and sends nothing — which is why selection capture
asks `AXIsProcessTrusted` before it clears the clipboard rather than relying on
a `try`/`catch` that will never fire. The screen is the same shape of problem:
there is no request API (`askForMediaAccess` parses only camera and microphone),
so the request is a one-pixel capture, and the status that comes back is cached
for the life of the process — a grant made at that prompt still reads as denied
until Coffer restarts.

## Wayland shortcuts

The portal hands out *names*; the compositor owns the *keys*. Three things have
to line up:

1. **An app id.** xdg-desktop-portal refuses a shortcuts session from an
   application it cannot name (`An app id is required`), and it names unsandboxed
   applications by resolving `<app-id>.desktop` through GLib — which only
   succeeds if the entry exists in an XDG application directory *and* its `Exec`
   points at a real binary. Coffer writes its own `NoDisplay=true` entry at
   `$XDG_DATA_HOME/applications/com.coffer.app.desktop` so this holds however it
   was installed, including in `npm run dev`.
2. **Registration.** Coffer calls
   `org.freedesktop.host.portal.Registry.Register` on the same D-Bus connection
   before opening the session.
3. **A binding.** After `BindShortcuts` the actions exist but have no keys. On
   Hyprland, `hyprctl globalshortcuts` lists them and `hyprland.conf` binds them:

   ```
   bind = SUPER, S, global, com.coffer.app:stash
   bind = SUPER SHIFT, S, global, com.coffer.app:clip
   ```

   Settings shows the right snippet for the running desktop, with a copy button.

Compositors that do not speak the shortcuts portal can bind a command instead:
`coffer --stash` and `coffer --clip` are forwarded to the running instance
through the single-instance lock, along with `coffer --copy <id>` and
`coffer --done <id>`. `features/cli/args.ts` turns argv into one of those four
actions; `index.ts` runs it, both on a second launch and on a cold start, and
falls back to showing the window when there is none.

## Notes

- The `uiohook-napi` hook is blocked on some managed or antivirus-protected
  machines. Settings offers `Ctrl+Shift+Space`, and the app falls back
  automatically if the hook cannot start.
- Wayland global shortcuts go through Coffer's own D-Bus client
  (`hotkey/portal.ts`) rather than Chromium's `GlobalShortcutsPortal` feature, so
  the action names, the bound state, and any portal refusal are all visible in
  Settings instead of failing silently.
- Images are written to `images/<id>.png` beside the store rather than inlined as
  base64, so the store file stays small and every debounced save stays cheap. The
  renderer loads them over a registered `coffer://` scheme, so the CSP never
  needs to allow `file:`.
- On Wayland the clipper does not use `desktopCapturer`, whose screencast portal
  demands a source picker on every use. It tries, in order of what the session
  supports: `grim` on wlroots compositors, the
  `org.freedesktop.portal.Screenshot` portal, then `spectacle` on KDE. The portal
  may ask for permission once, then stays silent. If every backend fails it falls
  back to `desktopCapturer` and the picker returns.
- Theme is stored in settings and pushed to `nativeTheme.themeSource` in the main
  process. Every renderer then just follows `prefers-color-scheme`, so the
  overlay and the clip form stay in sync with the list window for free.
- `source` (foreground app and window title) is recorded on Windows and X11.
  macOS records the app only, read from `lsappinfo`, which needs no consent; the
  window title is the part macOS gates behind Screen Recording, and it is not
  worth a permission prompt for a field that only annotates a stash. Wayland
  does not expose either to applications at all.
- Renaming the app means editing `src/shared/constants.ts` plus `name` in
  `package.json` and `appId`/`productName` in `electron-builder.yml`. On macOS
  that reaches further than it looks: `productName` becomes `CFBundleName`, and
  the userData folder is derived from the app name — so a rename moves where
  every existing user's stash lives and needs a migration, not just an edit.
- macOS ships signed ad-hoc rather than with a Developer ID. That is what makes
  Gatekeeper stop the first launch, what makes both permissions need granting
  again after each update (TCC keys a grant to the code identity, which for an
  ad-hoc bundle is a hash that changes every build), and why the updater is off
  there — Squirrel.Mac verifies the signature, and it does so only after
  downloading the whole update.

## What macOS still needs a real Mac for

CI builds both architectures, reads the finished bundle back, and drives the
packaged app: the keyboard hook starts, a stash runs end to end without losing
the clipboard, the region overlay covers the full display, and the renderer
paints without errors. A hosted runner also turns out to be trusted for
Accessibility and screen capture, so the granted paths are exercised too.

What it cannot answer, and what would move macOS out of early development:

- Whether the synthesised `⌘C` really copies out of Safari, Chrome, VS Code,
  Terminal and Notes, and whether the 500ms clipboard window suits the macOS
  pasteboard.
- Whether the overlay visually covers the menu bar, the Dock, the notch band and
  another app's fullscreen Space — and whether the crosshair cursor appears.
- Whether the traffic lights land centred in the 38px header, and what
  `env(titlebar-area-x)` actually evaluates to.
- Whether Gatekeeper's first-launch sequence matches what the README claims, for
  someone downloading the DMG in a browser. CI never sets the quarantine
  attribute, so none of that story is testable there.
- Whether the per-keystroke `dispatch_sync` in libuiohook's darwin backend causes
  system-wide input lag under load (uiohook-napi#47).
- Whether the x64 build runs on an Intel Mac at all. The runner is Apple silicon
  with no Rosetta, so it can build that slice but never execute it.
