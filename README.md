<div align="center">

<img src="resources/icon.png" alt="Coffer" width="88">

# Coffer

**A capture buffer and prompt queue for AI-assisted work.**

Grab anything off your screen, keep it in one list, and work it down.

[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux-black)](#install)
[![macOS](https://img.shields.io/badge/macOS-early%20development-orange)](#macos--early-development)
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
- **Clip a region** — `Ctrl+Shift+Space` (`⌃⌘R` on a Mac), drag a box, add a note.
- **Type or drop** — a prompt you thought of, an image pasted or dragged in.
- **File it** — sections group the list, and a deleted stash can be put back.

No account, no sync, no telemetry, no network calls of any kind.

Windows and Linux are supported. [macOS is in early development](#macos--early-development)
— it builds, CI drives the packaged app on every release, and the permission
flow has been worked through, but it has had little time on real hardware.

## Install

Download the latest build from the [releases page](https://github.com/Nuu-maan/coffer/releases/latest).

### Windows

Run `Coffer-Setup.exe`. The installer is not code-signed yet, so SmartScreen
will warn on first run — choose **More info → Run anyway**.

### macOS — early development

> **macOS support is early and unproven on real hardware.**
>
> It builds, it starts, and CI drives the packaged app on every change — the
> keyboard hook starts, a stash runs end to end, and the region overlay covers
> the whole display. But a CI Mac is a headless machine with permissions already
> granted, and it cannot answer the questions that matter most: whether copying
> out of Safari or Terminal really works, whether the overlay covers the menu bar
> and the Dock the way it should, or whether Gatekeeper behaves as described
> below. None of that has been seen by a person on a real Mac.
>
> Treat it as a preview. Windows and Linux are the supported platforms; if you
> run macOS and something is wrong, an issue with what you saw is genuinely
> useful.

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

Accessibility takes effect the moment it is granted. Screen Recording takes
effect once Coffer is reopened — Settings offers a button for that — and macOS
15 and newer will re-confirm it every month or so. That is Apple's behaviour,
not Coffer's.

If a permission shows as switched on in System Settings but Coffer still says
it is missing, macOS is holding the grant for an earlier copy of the app. Press
**Grant…** in Coffer's Settings: it clears that entry and asks again.

Two things to know before you rely on it. Until releases are signed with a
persistent certificate, macOS identifies each one by a hash that changes with
every release — so **both permissions must be granted again after each update**
(Grant… handles it, as above). And because the build has no Developer ID,
**macOS does not auto-update**; new versions come from this page.

The panel keeps the system's own window corners on macOS, so the corner radius
setting is not offered there.

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

Coffer lives in the tray — the menu bar on a Mac. These work anywhere on your
desktop:

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Stash the current selection | `Shift` `Shift` | `Shift` `Shift` |
| Clip a region of the screen | `Ctrl+Shift+Space` | `⌃⌘R` |
| Stash the selection — fallback trigger | `Ctrl+Alt+Space` | `⌃⌘S` |

The double tap is the default trigger wherever the keyboard can be read; the
fallback accelerator takes over where it cannot, and on a Mac until
Accessibility is granted. Both accelerators are rebindable in Settings, and
Coffer refuses to register either if they collide rather than failing silently.

In the window (`⌘` for `Ctrl` on a Mac):

| Key | Action |
| --- | --- |
| `Enter` | Copy the selected stash |
| `Space` | Toggle done |
| `Delete` / `Backspace` | Remove — undoable from the toast |
| `j` `k` or arrows | Move the selection; hold `Shift` to extend it |
| `Alt+↑` / `Alt+↓` | Move the selected stash, or the focused section |
| `Ctrl+A` | Select everything |
| `Ctrl+C` / `Ctrl+Shift+C` | Copy the selection, plain or as a list |
| `Ctrl+V` | Stash an image from the clipboard |
| `Ctrl+F` | Search the list |
| `Esc` | Clear the selection, then hide to tray |

Double-click a stash to edit it or caption an image. Drag to reorder, or drag a
section caption to move the whole section. Drop image files anywhere in the
window. An image stash has two copy targets: the thumbnail copies the image, the
caption copies the text.

Sections keep the list in order: make one from the `+` menu on the composer or
by tagging a stash, double-click a caption to rename it, and use the caption's
menu to tick, move or clear everything in it at once. Settings and the changelog
are behind the `⋯` in the title bar.

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
| macOS | `~/Library/Application Support/coffer/` |
| Linux | `~/.config/coffer/` |

Delete the folder and Coffer is gone. Nothing is uploaded, and the app makes no
outbound requests.

If `store.json` cannot be read when Coffer starts, it is moved aside as
`store.json.unreadable-<timestamp>` rather than written over, so the contents
are there to recover.

## Roadmap

- Getting macOS out of early development, which mostly means someone running it
  on a real Mac and reporting what breaks.
- An [Omarchy](https://omarchyplugins.com) plugin — a bar widget and panel for
  stashing and reviewing without opening the window.
- Code signing on Windows, to retire the SmartScreen warning.
- Signing macOS releases with a persistent certificate, so permissions survive
  updates — the pipeline is in place and only needs the certificate.
- An Apple Developer ID, which would retire the Gatekeeper detour and let macOS
  auto-update like the other two.

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
| `npm run dist:mac` | Both architectures into `release/` — must run on macOS |
| `npm run dist:linux` | AppImage and `.deb` into `release/` — must run on Linux |
| `npm run icons` | Redraws the macOS icons from the SVGs in `resources/` |

macOS and Linux artefacts cannot be cross-built from Windows; CI builds all
three on a tag push, and the macOS job additionally reads the finished bundle
back — architecture, signature, entitlements, `Info.plist` — starts the packaged
app once on its own, then drives it through Playwright: the keyboard hook, a
stash end to end, the overlay covering the display, and the renderer painting
without errors. A manual run of the same workflow packages everything without
publishing.

macOS releases are ad-hoc signed unless the repository has a `MAC_SIGN_CERT`
secret (a base64 `.p12`) and `MAC_SIGN_CERT_PASSWORD`, in which case the
workflow imports that certificate and re-signs the bundle with it. A self-signed
certificate is enough for macOS to recognise the app across releases and keep
its permissions.

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
