<div align="center">

<img src="resources/icon.png" alt="Coffer" width="88">

# Coffer

**A capture buffer and prompt queue for AI-assisted work.**

Grab anything off your screen, keep it in one list, and work it down.

[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-black)](#install)
[![Local only](https://img.shields.io/badge/data-local%20only-black)](#your-data)

<img src="docs/media/list-light.png#gh-light-mode-only" alt="Coffer" width="420">
<img src="docs/media/list-dark.png#gh-dark-mode-only" alt="Coffer" width="420">

</div>

---

Working with an AI assistant means constantly ferrying things into it — an error
from a terminal, a paragraph from a spec, a screenshot of the thing that looks
wrong. Coffer is the place those land on the way. Capture without leaving what
you are doing, then work the list down later, copying each item into ChatGPT,
Claude, or Cursor and ticking it off.

- **Stash a selection** — select text anywhere and tap `Shift` twice.
- **Clip a region** — `Ctrl+Shift+Space`, drag a box, add a note.
- **Type or drop** — a prompt you thought of, an image pasted or dragged in.

No account, no sync, no telemetry, no network calls of any kind.

## Install

Download the latest build from the [releases page](https://github.com/Nuu-maan/coffer/releases/latest).

### Windows

Run `Coffer-Setup.exe`. The installer is not code-signed yet, so SmartScreen
will warn on first run — choose **More info → Run anyway**.

### macOS

Take `Coffer-arm64.dmg` on Apple silicon, or `Coffer-x64.dmg` on an Intel Mac.
Requires macOS 13.5 or newer.

The build is signed, but not with an Apple Developer ID, so it is not notarised
and Gatekeeper will stop the first launch. macOS 15 removed the old
Control-click shortcut, so the route is:

1. Open Coffer. You will be told macOS "could not verify" it — click **Done**,
   not *Move to Trash*.
2. **System Settings → Privacy & Security**, scroll to **Security**, and click
   **Open Anyway** beside Coffer.
3. Confirm, and authenticate.

Or, in one line:

```bash
xattr -dr com.apple.quarantine /Applications/Coffer.app
```

Coffer then asks for two permissions, and Settings shows the state of both:

| Permission | What stops working without it |
| --- | --- |
| Accessibility | Stash — copying the selection out of another app |
| Screen & System Audio Recording | Clip — reading the screen it freezes |

Both take effect only after Coffer is restarted, and macOS 15 and newer will
re-confirm screen recording every month or so. That is Apple's behaviour, not
Coffer's.

Two things to know before you rely on it. Because the build is not signed with
a Developer ID, macOS identifies it by a hash that changes with every release —
so **both permissions must be granted again after each update**. And for the
same reason **macOS does not auto-update**; new versions come from this page.
Both go away if the project ever gets a Developer ID certificate.

### Linux

**AppImage** — works on any distribution, nothing to install.

```bash
chmod +x Coffer.AppImage
./Coffer.AppImage
```

**Debian / Ubuntu** — integrates with the system package manager.

```bash
sudo apt install ./Coffer.deb
```

`xdotool` and `libayatana-appindicator3-1` are recommended, not required: the
first improves selection capture on X11, the second gives a tray icon on
desktops that need one.

### Updates

The Windows installer and the AppImage check quietly in the background and
apply the update the next time you quit — you are never interrupted mid-session
to be told about a version. The `.deb` updates through your package manager
instead, as it should. macOS does not update itself yet, for the reason above.

## Using it

Coffer lives in the tray. These work anywhere on your desktop:

| Key | Action |
| --- | --- |
| `Shift` `Shift` | Stash the current selection |
| `Ctrl+Shift+Space` | Clip a region of the screen |
| `Ctrl+Alt+Space` | Stash the selection — fallback trigger |

Both accelerators are rebindable in Settings, and Coffer refuses to register
either if they collide rather than failing silently.

In the window:

| Key | Action |
| --- | --- |
| `Enter` | Copy the selected stash |
| `Space` | Toggle done |
| `Delete` | Remove |
| `j` `k` or arrows | Move the selection |
| `Ctrl+C` / `Ctrl+Shift+C` | Copy the selection, plain or as a list |
| `Ctrl+V` | Stash an image from the clipboard |
| `Esc` | Hide to tray |

Double-click a stash to edit it or caption an image. Drag to reorder. Drop image
files anywhere in the window. An image stash has two copy targets: the thumbnail
copies the image, the caption copies the text.

<div align="center">
<img src="docs/media/settings-light.png#gh-light-mode-only" alt="Settings" width="380">
<img src="docs/media/settings-dark.png#gh-dark-mode-only" alt="Settings" width="380">
</div>

### Wayland

The compositor owns key bindings on Wayland, so there are no defaults to list.
Coffer registers the named actions `com.coffer.app:stash` and `com.coffer.app:clip`
with the desktop portal, and Settings shows the exact config line to bind them
for the desktop you are running. On Hyprland:

```
bind = SUPER, S, global, com.coffer.app:stash
bind = SUPER SHIFT, S, global, com.coffer.app:clip
```

Compositors that do not speak the shortcuts portal can bind a command instead:
`coffer --stash` and `coffer --clip` are forwarded to the running instance.

## Your data

Everything is a JSON file and a folder of PNGs, on your machine, in a location
you can open:

| Platform | Location |
| --- | --- |
| Windows | `%APPDATA%\coffer\` |
| Linux | `~/.config/coffer/` |

Delete the folder and Coffer is gone. Nothing is uploaded, and the app makes no
outbound requests.

## Roadmap

- An [Omarchy](https://omarchyplugins.com) plugin — a bar widget and panel for
  stashing and reviewing without opening the window.
- Code signing on Windows, to retire the SmartScreen warning.
- macOS.

## Development

Requires Node 22 or newer.

```bash
npm ci
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server, HMR for the renderer and reload for main |
| `npm run build` | Typecheck, then build all three bundles into `out/` |
| `npm test` | Unit tests |
| `npm run typecheck` | Node and web tsconfigs |
| `npm run dist:win` | NSIS installer into `release/` |
| `npm run dist:linux` | AppImage and `.deb` into `release/` — must run on Linux |

Linux artefacts cannot be cross-built from Windows; CI builds both on a tag push.

Three processes with a hard boundary: the renderer has no filesystem, clipboard,
or hook access, and everything crosses through a typed bridge. The internals —
how the clipper freezes the screen, how capture differs per platform, and what
the Wayland portal dance actually involves — are written up in
[docs/architecture.md](docs/architecture.md).

## Contributing

Issues and pull requests are welcome. Keep a branch to one subject, run
`npm run typecheck && npm test` before opening it, and describe what changed and
why rather than what the diff already says.

## License

[MIT](LICENSE)
