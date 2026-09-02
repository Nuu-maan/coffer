#!/usr/bin/env bash
set -euo pipefail

# Everything here answers a question that cannot be answered from a Windows
# machine, which is where this branch was written. Each check is a claim the
# build config makes about itself, read back off the artefact.

fail=0
note() { printf '  %-58s %s\n' "$1" "$2"; }
bad() { printf '  %-58s %s\n' "$1" "FAIL — $2"; fail=1; }

# Discovered rather than assumed. electron-builder names the output directory
# for the runner's own architecture differently from the cross-built one, so a
# hardcoded release/mac-x64 is right in one direction and wrong in the other.
apps="$(find release -maxdepth 2 -name 'Coffer.app' -type d | sort)"

if [ -z "$apps" ]; then
  echo "no Coffer.app anywhere under release/"
  ls -la release 2>/dev/null || true
  exit 1
fi

echo "found:"
echo "$apps" | sed 's/^/  /'

for app in $apps; do
  exe="${app}/Contents/MacOS/Coffer"
  # The bundle says which architecture it is; the directory name is a guess.
  arch="$(lipo -archs "$exe" | awk '{ print $1 }')"

  # lipo says x86_64 where every directory and package name says x64. Written
  # as an if rather than a bare && because this script runs under set -e, and a
  # test that is simply false would otherwise end it.
  if [ "$arch" = "x86_64" ]; then slice=x64; else slice="$arch"; fi

  echo
  echo "── ${app}  (${arch})"
  plist="${app}/Contents/Info.plist"

  # One architecture per bundle, and it must be one we ship.
  got="$(lipo -archs "$exe")"
  case "$got" in
    arm64 | x86_64) note "executable is a single slice" "${got}" ;;
    *) bad "executable is a single slice" "got '${got}'" ;;
  esac

  # No foreign prebuilds. The signer walks the bundle by sniffing binaries
  # rather than by extension, so an ELF or PE left inside gets handed to
  # codesign — and node-gyp-build would rather load build/Release than a
  # prebuild, so a stale one there wins over the correct binary.
  foreign="$(find "$app" -type d -name 'darwin-*' ! -name "darwin-${slice}" | head -3)"
  [ -z "$foreign" ] && note "only the ${slice} prebuild" "ok" || bad "only the ${slice} prebuild" "$foreign"

  strays="$(find "$app" -path '*prebuilds/linux-*' -o -path '*prebuilds/win32-*' | head -5)"
  [ -z "$strays" ] && note "no linux or win32 prebuilds" "ok" || bad "no linux or win32 prebuilds" "$strays"

  leftover="$(find "$app" -path '*uiohook-napi/build/Release*' | head -3)"
  [ -z "$leftover" ] && note "no stale build/Release" "ok" || bad "no stale build/Release" "$leftover"

  # Every native binary that shipped must match the bundle it shipped in. The
  # afterPack hook drops the other architecture's prebuild, so a mismatch here
  # means it did not run or did not find it.
  for node in $(find "$app" -name '*.node'); do
    narch="$(lipo -archs "$node" 2>/dev/null || echo unknown)"
    where="$(basename "$(dirname "$node")")/$(basename "$node")"
    case " $narch " in
      *" $arch "*) note "${where} is ${arch}" "ok" ;;
      *) bad "${where} matches the bundle" "bundle is ${arch}, binary is ${narch}" ;;
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

  # Signing shape: ad-hoc unless the workflow imported an identity, in which
  # case the bundle must carry that identity and nothing else.
  signature="$(codesign -dv --verbose=4 "$app" 2>&1)"
  if [ -n "${MAC_SIGN_IDENTITY:-}" ]; then
    echo "$signature" | grep -q "Authority=${MAC_SIGN_IDENTITY}" \
      && note "signed as \"${MAC_SIGN_IDENTITY}\"" "ok" \
      || bad "signed as \"${MAC_SIGN_IDENTITY}\"" "$(echo "$signature" | grep -iE 'signature|authority' | head -3 | tr '\n' ' ')"
  elif echo "$signature" | grep -q 'Signature=adhoc'; then
    note "signed ad-hoc" "ok"
  else
    bad "signed ad-hoc" "$(echo "$signature" | grep -i signature || echo 'not signed at all')"
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
