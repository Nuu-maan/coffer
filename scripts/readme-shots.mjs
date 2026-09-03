import { readFileSync, unlinkSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { chromium } from 'playwright-core'

/*
 * Renders the README hero images — panel beside settings, light and dark —
 * into docs/media/ from a built renderer
 * (npm run build), in headless Chromium with the main-process bridge mocked.
 * No display, no window manager, and the exact viewport every time.
 */
const OUT = 'docs/media'
/* MAIN_WIDTH and MAIN_HEIGHT from src/shared/constants.ts. Not imported —
   this is plain node and that file is TypeScript — so it is kept in step by
   hand, and a shot at the wrong size is obvious the moment you look at it. */
const W = 360
const H = 510
const at = (h, m) => Date.UTC(2026, 8, 2, h - 5, m)

const SNAPSHOT = {
  sections: [{ name: 'Release 0.4', order: 1000 }],
  items: [
    { id: 'b1', kind: 'text', done: false, order: 1000, createdAt: at(14, 10), tag: 'Release 0.4',
      text: 'Draft the release notes from the merged PR titles, grouped by area, one line each.' },
    { id: 'b2', kind: 'image', done: false, order: 2000, createdAt: at(14, 15), tag: 'Release 0.4',
      images: [{ file: 'clip-build.png', width: 760, height: 200, bytes: 9000 }],
      caption: 'Build failure on main after the store migration' },
    { id: 'b3', kind: 'text', done: true, order: 3000, createdAt: at(14, 20), tag: 'Release 0.4',
      text: 'Why does the migration run twice on a cold start?' },
    { id: 'a1', kind: 'text', done: false, order: 4000, createdAt: at(14, 0), source: { app: 'Terminal', title: '' },
      text: "TypeError: Cannot read properties of undefined (reading 'sections')\n    at migrate (src/main/store/migrations.ts:41:7)" }
  ]
}

const SETTINGS = {
  hotkeyMode: 'double-shift', accelerator: 'Control+Alt+Space', clipperAccelerator: 'Control+Shift+Space',
  doubleTapWindowMs: 350, launchOnLogin: true, alwaysOnTop: false, theme: 'light'
}

const PLATFORM = {
  platform: 'linux', session: 'x11', desktop: '', executable: '/usr/bin/coffer',
  supportsDoubleShift: true, supportsAccelerators: true, supportsLoginItem: true, supportsSourceCapture: true
}

function bridge({ snapshot, settings, platform }) {
  const listeners = {}
  const reply = (value) => () => Promise.resolve(value)
  const on = new Proxy({}, {
    get: (_target, name) => (callback) => {
      listeners[name] = callback
      return () => delete listeners[name]
    }
  })
  const section = (answers) => new Proxy({}, { get: (_t, name) => answers[name] ?? reply(snapshot) })
  window.__listeners = listeners
  window.coffer = {
    items: section({ list: reply(snapshot) }),
    sections: section({}),
    clipboard: section({ read: reply(''), write: reply(undefined) }),
    stash: section({}),
    clipper: section({ draft: reply(null) }),
    platform: { info: reply(platform) },
    permissions: section({
      status: reply({ accessibility: true, screen: 'granted', needsRestart: false })
    }),
    hotkeys: { status: reply({ mode: 'double-shift', error: null, portalShortcuts: [] }) },
    settings: { get: reply(settings), set: (patch) => Promise.resolve(Object.assign(settings, patch)) },
    window: { openMain() {}, minimize() {}, hideMain() {} },
    app: { relaunch() {} },
    on
  }
}

const root = join(process.cwd(), 'out/renderer')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer((req, res) => {
  const path = join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0])
  /* Read before the header goes out. Writing 200 first and then discovering the
     file is missing leaves the 404 with nowhere to go — writeHead throws
     ERR_HTTP_HEADERS_SENT out of the handler and takes the whole run with it,
     which is a confusing way to be told about one absent asset. */
  let body
  try {
    body = readFileSync(path)
  } catch {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
  res.end(body)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
const clip = `data:image/png;base64,${readFileSync('docs/media/seed-clip.png').toString('base64')}`

const browser = await chromium.launch()
const settle = (ms) => new Promise((r) => setTimeout(r, ms))

async function render(theme, view) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.addInitScript(bridge, { snapshot: SNAPSHOT, settings: { ...SETTINGS, theme }, platform: PLATFORM })
  await page.goto(`${origin}/index.html`)
  await page.waitForFunction(() => document.body.innerText.length > 0)
  /* The sheet is translucent so it can sample the desktop; these shots have no
     desktop behind them and are saved with omitBackground, so it is pinned to
     the opaque equivalent of --sheet in each theme. Keep in step with the two
     --sheet declarations in src/renderer/src/styles/global.css. */
  await page.addStyleTag({ content: ':root{--sheet:#f5f5f7 !important} .dark{--sheet:#111111 !important}' })
  await page.evaluate((clip) => {
    for (const img of document.querySelectorAll('img[src^="coffer:"]')) img.src = clip
  }, clip)
  if (view === 'settings') await page.evaluate(() => window.__listeners.showSettings?.())
  await settle(1200)
  const path = `${OUT}/.${view}-${theme}.png`
  await page.screenshot({ path, omitBackground: true })
  await context.close()
  return path
}

async function hero(theme, left, right) {
  const context = await browser.newContext({ viewport: { width: W * 2 + 40, height: H }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  const src = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`
  await page.setContent(
    `<body style="margin:0;background:none;display:flex;gap:40px">` +
      `<img src="${src(left)}" width="${W}" height="${H}"><img src="${src(right)}" width="${W}" height="${H}"></body>`
  )
  await page.screenshot({ path: `${OUT}/hero-${theme}.png`, omitBackground: true })
  console.log(`wrote ${OUT}/hero-${theme}.png`)
  await context.close()
  unlinkSync(left)
  unlinkSync(right)
}

for (const theme of ['light', 'dark']) {
  const list = await render(theme, 'list')
  const settings = await render(theme, 'settings')
  await hero(theme, list, settings)
}

await browser.close()
server.close()
