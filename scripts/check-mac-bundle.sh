#!/usr/bin/env bash
set -euo pipefail

# Everything here answers a question that cannot be answered from a Windows
# machine, which is where this branch was written. Each check is a claim the
# build config makes about itself, read back off the artefact.

fail=0
note() { printf '  %-58s %s\n' "$1" "$2"; }
bad() { printf '  %-58s %s\n' "$1" "FAIL — $2"; fail=1; }

for arch in arm64 x64; do
  app="release/mac-${arch}/Coffer.app"
  echo
  echo "── ${app}"

  if [ ! -d "$app" ]; then
    bad "bundle exists" "not built"
    continue
  fi

  exe="${app}/Contents/MacOS/Coffer"
  plist="${app}/Contents/Info.plist"

  # The executable must be the architecture it claims. Building x64 on an
  # arm64 runner is exactly where this goes wrong silently.
  got="$(lipo -archs "$exe")"
  [ "$got" = "$arch" ] && note "executable is ${arch}" "ok" || bad "executable is ${arch}" "got ${got}"

  # No foreign prebuilds. The signer walks the bundle by sniffing binaries
  # rather than by extension, so an ELF or PE left inside gets handed to
  # codesign — and node-gyp-build would rather load build/Release than a
  # prebuild, so a stale one there wins over the correct binary.
  strays="$(find "$app" -path '*prebuilds/linux-*' -o -path '*prebuilds/win32-*' | head -5)"
  [ -z "$strays" ] && note "no linux or win32 prebuilds" "ok" || bad "no linux or win32 prebuilds" "$strays"

  leftover="$(find "$app" -path '*uiohook-napi/build/Release*' | head -3)"
  [ -z "$leftover" ] && note "no stale build/Release" "ok" || bad "no stale build/Release" "$leftover"

  # Every native binary that did ship must match the target.
  for node in $(find "$app" -name '*.node'); do
    narch="$(lipo -archs "$node" 2>/dev/null || echo unknown)"
    case " $narch " in
      *" $arch "*) note "$(basename "$(dirname "$node")")/$(basename "$node") is ${arch}" "ok" ;;
      *) bad "$(basename "$node") is ${arch}" "got ${narch}" ;;
    esac
  done

  # The OS floor is measured off the binary that ships rather than asserted.
  # Claiming support for something older than the binary allows is the failure
  # that matters; the exact number is printed either way.
  declared="$(plutil -extract LSMinimumSystemVersion raw -o - "$plist")"
  for node in $(find "$app" -name '*.node'); do
    minos="$(otool -l "$node" | awk '/LC_BUILD_VERSION/{f=1} f&&/minos/{print $2; exit}')"
    echo "      ${minos:-unknown} minos on $(basename "$node"), Info.plist declares ${declared}"
    if [ -n "${minos:-}" ]; then
      lowest="$(printf '%s\n%s\n' "$minos" "$declared" | sort -V | head -1)"
      [ "$lowest" = "$minos" ] || bad "declared floor covers the binary" "binary needs ${minos}, we claim ${declared}"
    fi
  done

  # Signing shape. These are expected to read differently the day a real
  # certificate lands, which is itself the signal that it did.
  if codesign -dv --verbose=4 "$app" 2>&1 | grep -q 'Signature=adhoc'; then
    note "signed ad-hoc" "ok"
  else
    bad "signed ad-hoc" "$(codesign -dv "$app" 2>&1 | grep -i signature || echo 'not signed at all')"
  fi

  codesign --verify --deep --strict "$app" \
    && note "signature verifies" "ok" \
    || bad "signature verifies" "codesign --verify rejected it"

  codesign -d --entitlements :- "$app" 2>/dev/null | grep -q 'disable-library-validation' \
    && note "library validation disabled" "ok" \
    || bad "library validation disabled" "the prebuilt .node will not load without it"

  # Info.plist. LSUIElement written as a YAML list rather than a mapping
  # packages cleanly and produces <key>0</key>, so this is checked at the root.
  id="$(plutil -extract CFBundleIdentifier raw -o - "$plist")"
  [ "$id" = "com.coffer.app" ] && note "bundle id" "ok" || bad "bundle id" "got ${id}"

  plutil -extract NSAppleEventsUsageDescription raw -o - "$plist" >/dev/null 2>&1 \
    && note "Apple events usage string" "ok" \
    || bad "Apple events usage string" "osascript needs it under the hardened runtime"

  # Deliberately absent: the activation policy moves at runtime instead, and an
  # accessory app has no menu bar — which is how ⌘C reaches a text field.
  plutil -extract LSUIElement raw -o - "$plist" >/dev/null 2>&1 \
    && bad "LSUIElement absent" "set, so the app would launch with no menu bar" \
    || note "LSUIElement absent" "ok"

  # Apple DTS traced CGEventTapCreate returning NULL on Sequoia to this key.
  plutil -extract LSBackgroundOnly raw -o - "$plist" >/dev/null 2>&1 \
    && bad "LSBackgroundOnly absent" "set, and it breaks event taps" \
    || note "LSBackgroundOnly absent" "ok"

  # None of these are real Apple keys. Shipping one looks like diligence and
  # does nothing, which is worse than omitting it.
  for key in NSScreenCaptureUsageDescription NSInputMonitoringUsageDescription NSAccessibilityUsageDescription; do
    plutil -extract "$key" raw -o - "$plist" >/dev/null 2>&1 \
      && bad "${key} absent" "not a key Apple defines" \
      || note "${key} absent" "ok"
  done
done

echo
# Squirrel.Mac cannot update an ad-hoc bundle, so advertising a channel would
# only cost users bandwidth.
[ ! -f release/latest-mac.yml ] \
  && note "no latest-mac.yml" "ok" \
  || bad "no latest-mac.yml" "an update channel nothing can consume"

echo
ls -la release/*.dmg release/*.zip 2>/dev/null || true

echo
[ "$fail" -eq 0 ] && echo "bundle checks passed" || echo "bundle checks failed"
exit "$fail"
