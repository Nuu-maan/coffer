import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { chromium } from 'playwright-core'

/*
 * Renders the product demo: a staged desktop (scene.html) with the real
 * renderer running in an iframe, stepped frame by frame on a fake clock so
 * every run produces the same file, then encoded with ffmpeg.
 *
 * npm run build first — the panel is served out of out/renderer.
 */
const FPS = 30
const DURATION = 37.5
const OUT = 'docs/media'
const FRAMES = process.env['DEMO_FRAMES'] ?? '.demo-frames'

const at = (h, m) => new Date(2026, 8, 3, h, m).getTime()

const TERM_TEXT =
  "src/billing/invoice.ts:118:31 - error TS2769: No overload matches this call.\n  Argument of type 'string' is not assignable to parameter of type 'number'."

const DOCS_TEXT =
  'If initialValue is provided, the accumulator starts as initialValue and is never coerced — whatever type you seed it with is the type every call receives.'

const CLIP_CAPTION = 'CI: typecheck failed on #482'
const SECTION = 'Invoice totals #482'

const item1 = {
  id: 'i1',
  kind: 'text',
  done: false,
  order: 1000,
  createdAt: at(14, 36),
  text: TERM_TEXT,
  source: { app: 'Terminal', title: 'numan@atlas — zsh' }
}

const item2 = {
  id: 'i2',
  kind: 'text',
  done: false,
  order: 2000,
  createdAt: at(14, 37),
  text: DOCS_TEXT,
  source: { app: 'Firefox', title: 'Array.prototype.reduce()' }
}

const item3 = {
  id: 'i3',
  kind: 'image',
  done: false,
  order: 3000,
  createdAt: at(14, 38),
  file: 'clip.png',
  width: 946,
  height: 372,
  bytes: 84000,
  caption: CLIP_CAPTION
}

const tagged = (item) => ({ ...item, tag: SECTION })

/* [time, snapshot] — pushed at the listener the renderer subscribes with. */
const SNAPSHOTS = [
  [0, { items: [], sections: [] }],
  [6.6, { items: [item1], sections: [] }],
  [11.6, { items: [item1, item2], sections: [] }],
  [17.95, { items: [item1, item2, item3], sections: [] }],
  [
    19.8,
    {
      items: [item1, item2, item3].map(tagged),
      sections: [{ name: SECTION, order: 1000 }]
    }
  ],
  [
    31.6,
    {
      items: [tagged({ ...item1, done: true }), tagged(item2), tagged(item3)],
      sections: [{ name: SECTION, order: 1000 }]
    }
  ]
]

/* [time, what] — real input into the real panel, at the measured targets, so
   the UI answers for itself rather than being drawn answering. */
const CUES = [
  [25.0, { click: 'row' }],
  [26.0, { key: 'Enter' }],
  [31.4, { click: 'check' }]
]

const SETTINGS = {
  hotkeyMode: 'double-shift',
  accelerator: 'Control+Alt+Space',
  clipperAccelerator: 'Control+Shift+Space',
  doubleTapWindowMs: 350,
  launchOnLogin: true,
  alwaysOnTop: false,
  theme: 'dark'
}

const PLATFORM = {
  platform: 'linux',
  session: 'wayland',
  desktop: 'Hyprland',
  executable: '/usr/bin/coffer',
  supportsDoubleShift: true,
  supportsAccelerators: false,
  supportsLoginItem: true,
  supportsSourceCapture: true,
  hyprlandLua: true
}

function bridge({ settings, platform }) {
  if (window.top === window.self) return

  const listeners = {}
  let snapshot = { items: [], sections: [] }
  const reply = (value) => () => Promise.resolve(value)
  const on = new Proxy(
    {},
    {
      get: (_target, name) => (callback) => {
        listeners[name] = callback
        return () => delete listeners[name]
      }
    }
  )
  const section = (answers) =>
    new Proxy({}, { get: (_t, name) => answers[name] ?? (() => Promise.resolve(snapshot)) })

  window.__push = (next) => {
    snapshot = next
    listeners.itemsChanged?.(next)
  }

  window.coffer = {
    items: section({ list: () => Promise.resolve(snapshot) }),
    sections: section({}),
    clipboard: section({ read: reply(''), write: reply(undefined), writeImage: reply(undefined) }),
    stash: section({}),
    clipper: section({ draft: reply(null) }),
    platform: { info: reply(platform) },
    permissions: section({
      status: reply({ accessibility: true, screen: 'granted', needsRestart: false })
    }),
    hotkeys: {
      status: reply({
        mode: 'double-shift',
        error: null,
        portalShortcuts: [
          { id: 'com.coffer.app:stash', trigger: 'SUPER+s', activated: true },
          { id: 'com.coffer.app:clip', trigger: 'SUPER+SHIFT+s', activated: true }
        ],
        activated: ['com.coffer.app:stash', 'com.coffer.app:clip']
      })
    },
    settings: {
      get: reply(settings),
      set: (patch) => Promise.resolve(Object.assign(settings, patch))
    },
    window: { openMain() {}, minimize() {}, hideMain() {} },
    app: { relaunch() {} },
    on
  }

  /* The renderer asks the coffer: scheme for a clip it has no main process to
     answer with. Whatever the stage put in __images stands in for it. */
  const swap = () => {
    for (const img of document.querySelectorAll('img[src^="coffer:"]')) {
      const file = img.src.split('/').pop()
      const data = window.__images?.[file]
      if (data) img.src = data
    }
  }
  new MutationObserver(swap).observe(document, { childList: true, subtree: true })
  window.__swap = swap
}

const renderer = join(process.cwd(), 'out/renderer')
const stage = join(process.cwd(), 'scripts/demo')
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}

const inter = readdirSync(join(renderer, 'assets')).find((name) => name.startsWith('inter-latin-o'))

const server = createServer((req, res) => {
  const url = req.url.split('?')[0]
  const path =
    url === '/inter.woff2'
      ? join(renderer, 'assets', inter)
      : url.startsWith('/app/')
        ? join(renderer, url.slice(5) || 'index.html')
        : join(stage, url === '/' ? 'scene.html' : url)
  try {
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
    res.end(readFileSync(path))
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none']
})
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
  colorScheme: 'dark'
})
const page = await context.newPage()
/* Installed and then paused: an installed clock still advances with the wall
   clock, which runs the panel's own animations at whatever rate the frames
   happen to render. Paused, only runFor moves time, so a frame is a frame. */
const START = new Date('2026-09-03T14:38:00Z')
await page.clock.install({ time: START })
await page.clock.pauseAt(START)
await page.addInitScript(bridge, { settings: SETTINGS, platform: PLATFORM })
await page.goto(`${origin}/`)
await page.waitForFunction(() => window.__scene && window.frames[0]?.__push)
await page.clock.runFor(2500)

/* The clip in the panel is the region the clipper draws over, taken from the
   stage itself so the thumbnail and the screen agree. */
await page.evaluate(() => window.__scene.frame(13.4))
await page.clock.runFor(120)
const region = await page.locator('#clip-target').boundingBox()
item3.width = Math.round(region.width)
item3.height = Math.round(region.height)
const clip = `data:image/png;base64,${(await page.locator('#clip-target').screenshot()).toString('base64')}`
await page.evaluate(
  ({ data, box }) => {
    document.getElementById('paste-shot').src = data
    window.frames[0].__images = { 'clip.png': data }
    window.__scene.setClip({
      x: Math.round(box.x) - 8,
      y: Math.round(box.y) - 8,
      w: Math.round(box.width) + 16,
      h: Math.round(box.height) + 16
    })
  },
  { data: clip, box: region }
)

/* The rows are only as tall as their text makes them, so where the pointer has
   to land is measured off the real list rather than guessed at. */
const PANEL = { x: 1338, y: 214 }
await page.evaluate((next) => window.frames[0].__push(next), SNAPSHOTS[4][1])
await page.clock.runFor(400)
const targets = await page.evaluate((panel) => {
  const doc = window.frames[0].document
  const row = doc.querySelector('[data-slot=item-row]').getBoundingClientRect()
  const check = doc.querySelector('[data-slot=item-row] button[aria-label^="Mark as"]')
  const box = check.getBoundingClientRect()
  return {
    row: { x: panel.x + row.x + row.width * 0.62, y: panel.y + row.y + row.height / 2 },
    check: { x: panel.x + box.x + box.width / 2, y: panel.y + box.y + box.height / 2 }
  }
}, PANEL)
await page.evaluate((next) => window.__scene.setTargets(next), targets)
await page.evaluate((next) => window.frames[0].__push(next), SNAPSHOTS[0][1])
await page.clock.runFor(200)

rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
mkdirSync(OUT, { recursive: true })

const total = Math.round(DURATION * FPS)
const pending = [...SNAPSHOTS]
const cues = [...CUES]

for (let n = 0; n < total; n += 1) {
  const t = n / FPS

  while (pending.length && pending[0][0] <= t) {
    const [, snapshot] = pending.shift()
    await page.evaluate((next) => window.frames[0].__push(next), snapshot)
    await page.clock.runFor(1)
    await page.evaluate(() => window.frames[0].__swap())
  }

  const { x, y } = await page.evaluate((now) => {
    window.frames[0].__swap?.()
    return window.__scene.frame(now)
  }, t)
  await page.mouse.move(x, y)

  while (cues.length && cues[0][0] <= t) {
    const [, cue] = cues.shift()
    if (cue.click) await page.mouse.click(targets[cue.click].x, targets[cue.click].y)
    if (cue.key) await page.keyboard.press(cue.key)
  }

  await page.clock.runFor(Math.round(1000 / FPS))
  await page.screenshot({
    path: join(FRAMES, `f-${String(n).padStart(5, '0')}.jpg`),
    type: 'jpeg',
    quality: 94,
    animations: 'allow'
  })

  if (n % 60 === 0) process.stdout.write(`\r  ${n}/${total} frames`)
}
process.stdout.write(`\r  ${total}/${total} frames\n`)

await browser.close()
server.close()

const mp4 = `${OUT}/demo.mp4`
execFileSync(
  'ffmpeg',
  ['-y', '-framerate', String(FPS), '-i', join(FRAMES, 'f-%05d.jpg'),
   '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
   '-movflags', '+faststart', mp4],
  { stdio: 'inherit' }
)

/* A GIF as well: a README cannot play the mp4 from the repository. */
const GIF = 'fps=12,scale=800:-1:flags=lanczos'
const palette = join(FRAMES, 'palette.png')
execFileSync('ffmpeg', ['-y', '-i', mp4, '-vf', `${GIF},palettegen=stats_mode=diff`, palette], {
  stdio: 'ignore'
})
execFileSync(
  'ffmpeg',
  ['-y', '-i', mp4, '-i', palette, '-lavfi',
   `${GIF}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=3`,
   `${OUT}/demo.gif`],
  { stdio: 'ignore' }
)

if (!process.env['DEMO_KEEP_FRAMES']) rmSync(FRAMES, { recursive: true, force: true })

const size = (file) => `${(readFileSync(file).length / 1e6).toFixed(1)} MB`
console.log(`wrote ${mp4} (${size(mp4)}) and ${OUT}/demo.gif (${size(`${OUT}/demo.gif`)})`)
