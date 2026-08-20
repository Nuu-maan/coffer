import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import { _electron as electron } from 'playwright-core'

/*
 * Drives the packaged macOS app on a CI runner and asserts what a machine with
 * no TCC grants can honestly assert.
 *
 * A hosted runner turns out to be TRUSTED for both Accessibility and screen
 * capture, which I had assumed it could not be — the first run to get this far
 * proved otherwise. That is better than expected: it means the granted paths
 * are exercised here too, including uIOhook.start() actually succeeding.
 *
 * So nothing below asserts a particular grant. It asserts that the answers are
 * well formed and that the app's own state agrees with them, which holds on a
 * machine in either condition — including a developer's Mac.
 *
 * What genuinely cannot be checked here is in the README of this branch and in
 * the PR: whether a granted Cmd+C actually copies out of Safari, whether the
 * overlay covers the menu bar, whether Gatekeeper lets the DMG open.
 */
const APP = process.argv[2] ?? 'release/mac-arm64/Coffer.app/Contents/MacOS/Coffer'

const results = []
let failures = 0

function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then((note) => results.push(`  ok    ${name}${note ? ` — ${note}` : ''}`))
    .catch((error) => {
      failures += 1
      results.push(`  FAIL  ${name}\n          ${error.message.split('\n')[0]}`)
    })
}

if (!existsSync(APP)) {
  console.error(`no packaged app at ${APP}`)
  process.exit(1)
}

/* Deliberately not given a --user-data-dir: where Electron puts userData on a
   packaged macOS bundle is one of the things this run exists to find out, and
   overriding it would answer a question nobody asked. */
const app = await electron.launch({ executablePath: APP, timeout: 120_000 }).catch((error) => {
  console.error(
    'the app never became ready. The startup log from the step before this one is ' +
      'where the reason will be, if it printed one.'
  )
  throw error
})

const pageErrors = []
app.on('window', (page) => {
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
})

await check('the app boots, so the tray was created without throwing', async () => {
  const name = await app.evaluate(({ app }) => app.getName())
  return `app.getName() = ${name}`
})

/* Not firstWindow(): the overlay pool primes one hidden window per display
   before anything else, so the first window is never the one we want. */
async function mainWindow() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const found = app.windows().find((page) => page.url().includes('index.html'))
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`no index.html window; saw ${app.windows().map((w) => w.url()).join(', ')}`)
}

const page = await mainWindow()

await check('the renderer paints', async () => {
  await page.waitForFunction(() => document.body.innerText.length > 0, { timeout: 30_000 })
  await page.screenshot({ path: 'smoke-mac.png' })
  return 'screenshot written'
})

const info = await page.evaluate(() => window.coffer.platform.info())

await check('platformInfo reports darwin and a macos session', async () => {
  assert.equal(info.platform, 'darwin')
  assert.equal(info.session, 'macos', `session was ${info.session}`)
  assert.equal(info.supportsAccelerators, true)
  assert.equal(info.supportsSourceCapture, true)
  return `session=${info.session} doubleShift=${info.supportsDoubleShift}`
})

await check('the permission answers are well formed and agree with each other', async () => {
  const access = await page.evaluate(() => window.coffer.permissions.status())

  assert.equal(typeof access.accessibility, 'boolean')
  assert.ok(
    ['granted', 'denied', 'restricted', 'not-determined', 'unknown'].includes(access.screen),
    `screen was ${access.screen}`
  )
  // supportsDoubleShift is derived from the same grant. They must not disagree.
  assert.equal(
    info.supportsDoubleShift,
    access.accessibility,
    'the trigger flag and the permission it comes from say different things'
  )
  return `accessibility=${access.accessibility} screen=${access.screen}`
})

/* With the grant in hand this proves uIOhook.start() really succeeded on
   macOS; without it, that the fallback published a mode and a reason. Either
   way it is the whole hotkey path, in the real signed process. */
await check('the hotkey manager settled on the mode its permissions allow', async () => {
  const status = await page.evaluate(() => window.coffer.hotkeys.status())

  if (info.supportsDoubleShift) {
    assert.equal(status.mode, 'double-shift', `mode was ${status.mode}: ${status.error ?? ''}`)
  } else {
    assert.equal(status.mode, 'accelerator', `mode was ${status.mode}`)
    assert.match(String(status.error), /Accessibility/, 'the fallback did not say why')
  }
  return `mode=${status.mode} error=${status.error ?? 'none'}`
})

await check('IPC round-trips', async () => {
  const before = await page.evaluate(() => window.coffer.items.list())
  await page.evaluate(() => window.coffer.items.add({ text: 'smoke test' }))
  const after = await page.evaluate(() => window.coffer.items.list())
  assert.equal(after.length, before.length + 1)
  assert.equal(after.at(-1).text, 'smoke test')
  return `${before.length} → ${after.length} items`
})

/* The single most useful headless macOS assertion. Without enableLargerThanScreen
   AppKit shrinks any frame that would cover the menu bar, and the overlay stops
   short of the top of the screen. */
await check('an overlay can cover the whole display, menu bar included', async () => {
  const { asked, got } = await app.evaluate(async ({ BrowserWindow, screen }) => {
    const bounds = screen.getPrimaryDisplay().bounds
    const probe = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      enableLargerThanScreen: true
    })
    const got = probe.getBounds()
    probe.destroy()
    return { asked: bounds, got }
  })
  assert.deepEqual(got, asked, `asked ${JSON.stringify(asked)}, got ${JSON.stringify(got)}`)
  return `${asked.width}×${asked.height} at (${asked.x},${asked.y})`
})

/* Asked rather than registered. Trying to register it is how the first run of
   this test failed: Coffer already held it, so the call correctly returned
   false, which is the opposite of the problem it looked like. */
await check('Coffer holds the macOS clipper accelerator it ships with', async () => {
  const held = await app.evaluate(({ globalShortcut }) => ({
    clip: globalShortcut.isRegistered('Control+Command+R'),
    // Free unless the trigger fell back to it, which depends on the grant.
    stash: globalShortcut.isRegistered('Control+Command+S')
  }))
  assert.equal(held.clip, true, 'Control+Command+R is not registered to anything')
  return `clip=${held.clip} stash=${held.stash}`
})

await check('Accessibility answers without throwing', async () => {
  const trusted = await app.evaluate(({ systemPreferences }) =>
    systemPreferences.isTrustedAccessibilityClient(false)
  )
  assert.equal(typeof trusted, 'boolean')
  return `isTrustedAccessibilityClient(false) = ${trusted}`
})

await check('there is no request API for the screen', async () => {
  const message = await app.evaluate(({ systemPreferences }) =>
    systemPreferences
      .askForMediaAccess('screen')
      .then(() => null)
      .catch((error) => String(error.message ?? error))
  )
  assert.ok(message, 'askForMediaAccess resolved, so the assumption behind the clipper is wrong')
  assert.match(message, /Invalid media type/i, `rejected with: ${message}`)
  return message.trim()
})

await check('desktopCapturer is refused, and refused the way the clipper expects', async () => {
  const outcome = await app.evaluate(({ desktopCapturer }) =>
    desktopCapturer
      .getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
      .then((sources) => ({ ok: true, count: sources.length }))
      .catch((error) => ({ ok: false, message: String(error.message ?? error) }))
  )
  if (outcome.ok) return `runner allowed capture (${outcome.count} sources) — nothing to assert`
  assert.match(outcome.message, /Failed to get sources/i, `rejected with: ${outcome.message}`)
  return outcome.message.trim()
})

/*
 * uiohook is reached through the app rather than poked at directly. Playwright
 * evaluates in a context with no dynamic import callback, so `await
 * import('node:module')` throws there and the main bundle is an ES module with
 * no require to borrow — but going through Coffer's own IPC is the better test
 * anyway, because it runs the real code in the real signed process with the
 * real entitlements.
 *
 * Stash is the whole path: clear the clipboard, synthesise the copy chord
 * through uiohook, poll, restore. On a granted runner that means keyTap really
 * fires; on a denied one the preflight turns it away before the clipboard is
 * touched. Neither may throw, and neither may lose what was on the clipboard.
 */
await check('a stash runs end to end without throwing or eating the clipboard', async () => {
  const marker = `coffer-smoke-${process.pid}`

  const outcome = await page.evaluate(async (text) => {
    await window.coffer.clipboard.write(text)
    const before = (await window.coffer.items.list()).length
    await window.coffer.stash.selection()
    return {
      after: (await window.coffer.items.list()).length,
      before,
      clipboard: await window.coffer.clipboard.read()
    }
  }, marker)

  // Nothing was selected in a text field, so the honest outcomes are "no new
  // item" or "one new item"; what must not happen is a lost clipboard.
  assert.ok(outcome.after >= outcome.before, 'the stash removed items')
  assert.equal(
    outcome.clipboard,
    marker,
    'the clipboard was cleared for the copy and never put back'
  )
  return `items ${outcome.before} → ${outcome.after}, clipboard intact`
})

/* The shell fallback's own error classifying is covered by unit tests that run
   anywhere. What cannot be tested off a Mac is that asking for a permission
   comes back at all rather than hanging or throwing. */
await check('requesting a permission answers', async () => {
  const after = await page.evaluate(() => window.coffer.permissions.request('accessibility'))

  assert.equal(typeof after.accessibility, 'boolean')
  assert.equal(typeof after.needsRestart, 'boolean')
  return `accessibility=${after.accessibility} needsRestart=${after.needsRestart}`
})

await check('userData lands where the store expects it', async () => {
  const paths = await app.evaluate(({ app }) => ({
    userData: app.getPath('userData'),
    name: app.getName()
  }))
  console.log(`\n  userData = ${paths.userData}\n  app.getName() = ${paths.name}\n`)

  /* Pinned, because this is the one value here that cannot be changed once Mac
     users exist — moving it orphans their stash. It resolves from the package
     name rather than from CFBundleName, which is why it is lowercase and why
     adding a productName to package.json would move it on every platform at
     once. If this ever fails, the README's data table is wrong too. */
  assert.match(
    paths.userData,
    /[/\\]Application Support[/\\]coffer$/,
    `userData moved to ${paths.userData}`
  )
  assert.equal(paths.name, 'coffer', `app.getName() became ${paths.name}`)
  return paths.userData
})

await check('activation policy is settable both ways', async () => {
  await app.evaluate(({ app }) => {
    app.setActivationPolicy('accessory')
    app.setActivationPolicy('regular')
  })
  return 'accessory and regular both accepted'
})

await check('the renderer logged no errors', async () => {
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'))
  return 'clean console'
})

await app.close()

console.log('\nmacOS smoke test\n')
console.log(results.join('\n'))
console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
