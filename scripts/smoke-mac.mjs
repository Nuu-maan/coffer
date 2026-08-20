import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import { _electron as electron } from 'playwright-core'

/*
 * Drives the packaged macOS app on a CI runner and asserts what a machine with
 * no TCC grants can honestly assert.
 *
 * The runner is permanently denied Accessibility and Screen Recording — TCC.db
 * is protected by SIP and SIP cannot be turned off inside a hosted runner — so
 * the denied paths are not a gap here, they are the point. They are what a Mac
 * user hits on first run, and they are the paths that had no code at all before
 * this branch.
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

await check('platformInfo reports darwin and a macos session', async () => {
  const info = await page.evaluate(() => window.coffer.platform.info())
  assert.equal(info.platform, 'darwin')
  assert.equal(info.session, 'macos', `session was ${info.session}`)
  assert.equal(info.supportsAccelerators, true)
  assert.equal(
    info.supportsDoubleShift,
    false,
    'a runner has no Accessibility grant, so this must be false'
  )
  return `session=${info.session} doubleShift=${info.supportsDoubleShift}`
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

await check('the macOS default accelerators are registrable', async () => {
  const registered = await app.evaluate(async ({ globalShortcut }) => {
    const out = {}
    for (const accelerator of ['Control+Command+S', 'Control+Command+R']) {
      out[accelerator] = globalShortcut.register(accelerator, () => {})
      globalShortcut.unregister(accelerator)
    }
    return out
  })
  for (const [accelerator, ok] of Object.entries(registered)) {
    assert.equal(ok, true, `${accelerator} was refused`)
  }
  return Object.keys(registered).join(', ')
})

await check('Accessibility reads as denied without throwing', async () => {
  const trusted = await app.evaluate(({ systemPreferences }) =>
    systemPreferences.isTrustedAccessibilityClient(false)
  )
  assert.equal(trusted, false, 'a hosted runner cannot have been granted this')
  return 'isTrustedAccessibilityClient(false) = false'
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

/* keyTap must not throw and must not crash without the grant — which is exactly
   why selection capture is gated on a preflight rather than on a try/catch.
   The main bundle is an ES module, so there is no ambient require to borrow;
   one is built against the app's own path so it resolves inside app.asar. */
await check('uiohook-napi loads on darwin', async () => {
  const arch = await app.evaluate(async ({ app }) => {
    const { createRequire } = await import('node:module')
    const load = createRequire(`${app.getAppPath()}/`)
    const { UiohookKey } = load('uiohook-napi')
    return { meta: UiohookKey.Meta, ctrl: UiohookKey.Ctrl, arch: process.arch }
  })
  assert.ok(arch.meta > 0, 'UiohookKey.Meta is missing, so the copy chord has no ⌘')
  return `arch=${arch.arch} Meta=${arch.meta} Ctrl=${arch.ctrl}`
})

await check('keyTap without the grant neither throws nor crashes', async () => {
  const threw = await app.evaluate(async ({ app }) => {
    const { createRequire } = await import('node:module')
    const load = createRequire(`${app.getAppPath()}/`)
    const { UiohookKey, uIOhook } = load('uiohook-napi')
    try {
      uIOhook.keyTap(UiohookKey.C, [UiohookKey.Meta])
      return null
    } catch (error) {
      return String(error.message ?? error)
    }
  })
  assert.equal(threw, null, `keyTap threw: ${threw}`)
  return 'returned silently, as documented'
})

await check('starting the hook is refused, and named', async () => {
  const outcome = await app.evaluate(async ({ app }) => {
    const { createRequire } = await import('node:module')
    const load = createRequire(`${app.getAppPath()}/`)
    const { uIOhook } = load('uiohook-napi')
    try {
      uIOhook.start()
      uIOhook.stop()
      return { started: true }
    } catch (error) {
      return { started: false, code: error.code, message: String(error.message ?? error) }
    }
  })
  if (outcome.started) return 'runner allowed the event tap — nothing to assert'
  assert.equal(outcome.code, 'UIOHOOK_ERROR_AXAPI_DISABLED', `code was ${outcome.code}`)
  return outcome.code
})

await check('osascript is reachable, and its refusal is classified', async () => {
  const outcome = await app.evaluate(async () => {
    const { execFile } = await import('node:child_process')
    return new Promise((resolve) => {
      execFile('osascript', ['-e', 'return 1'], (error, stdout) =>
        resolve({ error: error ? String(error.message) : null, stdout: String(stdout).trim() })
      )
    })
  })
  assert.equal(outcome.error, null, `osascript failed: ${outcome.error}`)
  assert.equal(outcome.stdout, '1')
  return 'execFile plumbing works on darwin'
})

await check('userData lands where the store expects it', async () => {
  const paths = await app.evaluate(({ app }) => ({
    userData: app.getPath('userData'),
    name: app.getName()
  }))
  // Recorded rather than pinned to a literal: this is the value that must not
  // change once macOS users exist, so the log is the record of what it is.
  console.log(`\n  userData = ${paths.userData}\n  app.getName() = ${paths.name}\n`)
  assert.ok(paths.userData.includes('Application Support'), paths.userData)
  assert.equal(paths.userData, userDataDir, 'the --user-data-dir override did not take')
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
