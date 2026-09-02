<div align="center">

<img src="resources/icon.png" alt="" width="80">

# Coffer

**A capture buffer and prompt queue for AI-assisted work.**

[![Latest release](https://img.shields.io/github/v/release/Nuu-maan/coffer?display_name=tag&color=black&label=release)](https://github.com/Nuu-maan/coffer/releases/latest)
[![Platforms](https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-black)](#install)
[![Local only](https://img.shields.io/badge/data-local%20only-black)](#your-data)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

<br>

<img src="docs/media/hero-light.png#gh-light-mode-only" alt="The Coffer panel and its settings" width="900">
<img src="docs/media/hero-dark.png#gh-dark-mode-only" alt="The Coffer panel and its settings" width="900">

<br><br>

Working with an AI assistant means constantly carrying things into it — an error
from a terminal, a paragraph of a spec, a screenshot of the thing that looks
wrong. Coffer is where those land on the way there.

</div>

<br>

<table>
<tr>
<th align="left" width="33%">Stash</th>
<th align="left" width="33%">Clip</th>
<th align="left" width="33%">Work it down</th>
</tr>
<tr valign="top">
<td>Select text in any app and tap <code>Shift</code> twice. It lands in the list with the app it came from, and your clipboard is left as it was.</td>
<td>Press the clip shortcut, draw a box on the screen, add a caption. Multiple displays, menu bars and docks included.</td>
<td>Copy each item into ChatGPT, Claude or Cursor with <code>Enter</code> and tick it off. Sections, search and undo keep a long list honest.</td>
</tr>
</table>

Type a prompt straight into the composer, or paste and drop images. Everything
stays on your machine: no account, no sync, no network calls of any kind.

## Install

Download the latest build from the [releases page](https://github.com/Nuu-maan/coffer/releases/latest).

| Platform | Get | Notes |
| --- | --- | --- |
| Windows | `Coffer-Setup.exe` | Not code-signed yet; SmartScreen warns once. Choose **More info → Run anyway**. |
| macOS | `Coffer-arm64.dmg` on Apple silicon, `Coffer-x64.dmg` on Intel | macOS 13.5+. First launch and permissions below. |
| Linux | `Coffer.AppImage` or `Coffer.deb` | `chmod +x` the AppImage; `sudo apt install ./Coffer.deb` for the package. On Arch, `makepkg -si` in `packaging/aur/coffer-bin` until the AUR package is up. |

Windows and the AppImage update themselves quietly, applied the next time you
quit. The `.deb` updates through your package manager. macOS releases come from
the releases page.

<details>
<summary><b>macOS — first launch</b></summary>
<br>

The build is signed, but not with an Apple Developer ID, so Gatekeeper stops
the first launch:

1. Open Coffer. macOS says it "could not verify" it — click **Done**, not
   *Move to Trash*.
2. Open **System Settings → Privacy & Security**, scroll to **Security**, and
   click **Open Anyway** beside Coffer.
3. Confirm and authenticate.

Or, in one line:

```bash
xattr -dr com.apple.quarantine /Applications/Coffer.app
```

</details>

<details>
<summary><b>macOS — permissions</b></summary>
<br>

Coffer asks for two permissions. Settings shows the state of both and can raise
each request again.

| Permission | What it is for | Takes effect |
| --- | --- | --- |
| Accessibility | Stash — copying the selection out of another app | Immediately |
| Screen & System Audio Recording | Clip — reading the screen it freezes | After a relaunch; Settings has a button |

macOS 15 and newer re-confirm Screen Recording every month or so. That is
Apple's behaviour, not Coffer's.

**Switched on in System Settings, but Coffer still says it is missing?** macOS
is holding the grant for an earlier copy of the app. Press **Grant…** in
Coffer's Settings: it clears that entry and asks again. Until releases are
signed with a persistent certificate, this happens after every update.

</details>

<details>
<summary><b>Linux — Wayland shortcuts</b></summary>
<br>

The compositor owns key bindings on Wayland, so there are no defaults to list.
Coffer registers the named actions `com.coffer.app:stash` and
`com.coffer.app:clip` with the desktop portal, and Settings shows the exact
config line to bind them on the desktop you are running. On Hyprland:

```
bind = SUPER, S, global, com.coffer.app:stash
bind = SUPER SHIFT, S, global, com.coffer.app:clip
```

Compositors that do not speak the shortcuts portal can bind a command instead;
see [Command line](#command-line). Stashing on Wayland reads the selection
through `wl-clipboard`, so install it; `xdotool` does the same on X11, and
`libayatana-appindicator3-1` provides a tray icon on desktops that need one.

</details>

## Shortcuts

Coffer lives in the tray — the menu bar on a Mac. These work anywhere on the
desktop:

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Stash the current selection | `Shift` `Shift` | `Shift` `Shift` |
| Clip a region of the screen | `Ctrl+Shift+Space` | `⌃⌘R` |
| Stash the selection — fallback | `Ctrl+Alt+Space` | `⌃⌘S` |

The double tap is the default wherever the keyboard can be read; the fallback
accelerator takes over where it cannot, and on a Mac until Accessibility is
granted. Both accelerators are rebindable, and Coffer refuses to register either
if they collide rather than failing silently.

<details>
<summary><b>In the window</b></summary>
<br>

`⌘` stands in for `Ctrl` on a Mac.

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
| `Esc` | Clear the selection, then hide to the tray |

Double-click a stash to edit it or caption an image. Drag to reorder, or drag a
section caption to move the whole section. Drop image files anywhere in the
window. An image stash has two copy targets: the thumbnail copies the image, the
caption copies the text.

Sections keep the list in order: make one from the `+` menu on the composer or
by tagging a stash, double-click a caption to rename it, and use the caption's
menu to tick, move or clear everything in it at once. Settings and the changelog
are behind `⋯` in the title bar.

</details>

## Command line

A second `coffer` invocation is forwarded to the running instance, so any
launcher, bar or script can drive it without opening the window:

| Command | Effect |
| --- | --- |
| `coffer --stash` | Stash the current selection |
| `coffer --clip` | Start a region clip |
| `coffer --copy <id>` | Put a stash on the clipboard |
| `coffer --done <id>` | Tick a stash off |

Ids are the `id` field in `store.json`, and `--copy=<id>` is accepted too. On
Wayland, `--copy` cannot take the clipboard from an unfocused process — the
compositor only allows the focused client to — so pipe the text to `wl-copy`
yourself there.

## Your data

Everything is one JSON file and a folder of PNGs, on your machine:

| Platform | Location |
| --- | --- |
| Windows | `%APPDATA%\coffer\` |
| macOS | `~/Library/Application Support/coffer/` |
| Linux | `~/.config/coffer/` |

Delete the folder and Coffer is gone. If `store.json` cannot be read at
startup, it is moved aside as `store.json.unreadable-<timestamp>` rather than
written over, so the contents are there to recover.

## Roadmap

- Code signing on Windows, to retire the SmartScreen warning.
- Signing macOS releases with a persistent certificate, so permissions survive
  updates. The pipeline is in place and needs only the certificate.
- An Apple Developer ID, to retire the Gatekeeper detour and let macOS update
  itself like the other two.
- An [Omarchy](https://omarchyplugins.com) plugin: a bar widget for stashing and
  reviewing without opening the window.

## Development

Requires Node 22 or newer.

```bash
npm ci
npm run dev
```

<details>
<summary><b>Commands, CI and release signing</b></summary>
<br>

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server, with HMR for the renderer and reload for main |
| `npm run build` | Typecheck, then build all three bundles into `out/` |
| `npm test` | Unit tests |
| `npm run typecheck` | Node and web tsconfigs |
| `npm run dist:win` | NSIS installer into `release/` |
| `npm run dist:mac` | Both architectures into `release/` — must run on macOS |
| `npm run dist:linux` | AppImage and `.deb` into `release/` — must run on Linux |
| `npm run icons` | Redraws the macOS icons from the SVGs in `resources/` |
| `node scripts/readme-shots.mjs` | Renders the README screenshots from a built app |

CI builds all three platforms on a tag push. The macOS job also reads the
finished bundle back — architecture, signature, entitlements, `Info.plist` —
starts the packaged app once on its own, then drives it through Playwright: the
keyboard hook, a stash end to end, the overlay covering the display, and the
renderer painting without errors. A manual run of the same workflow packages
everything without publishing.

macOS releases are ad-hoc signed unless the repository has a `MAC_SIGN_CERT`
secret (a base64 `.p12`) and `MAC_SIGN_CERT_PASSWORD`. With those, the workflow
imports the certificate and re-signs the bundle with it; a self-signed
certificate is enough for macOS to recognise the app across releases and keep
its permissions.

The renderer has no filesystem, clipboard or hook access; everything crosses a
typed bridge into the main process. How the clipper freezes the screen, how
capture differs per platform and what the Wayland portal involves are written
up in [docs/architecture.md](docs/architecture.md).

</details>

## Contributing

Issues and pull requests are welcome. Keep a branch to one subject, run
`npm run typecheck && npm test` before opening it, and describe what changed and
why rather than what the diff already says.

## License

[MIT](LICENSE)
