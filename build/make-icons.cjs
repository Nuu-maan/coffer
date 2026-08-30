const { readFile, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const { app, BrowserWindow } = require('electron')

/*
 * Rasterises the vector marks in resources/ into the bitmaps macOS insists on.
 * Run with `npm run icons`, which is rarely — the output is committed, because
 * a build should not depend on being able to launch a browser.
 *
 * The menu bar wants a template image: black, with the shape carried entirely
 * by the alpha channel, which macOS then inverts or tints to match its own
 * state. Colour in one is discarded, so tray.png — the same mark in the brand
 * hue, for the Windows and Linux trays — cannot simply be reused.
 *
 * The Dock wants the artwork inset. macOS does not mask app icons the way iOS
 * does, so the 512px full-bleed square Coffer ships for Windows and Linux would
 * stand proud of every neighbour. Apple's grid puts a rounded-square icon in
 * 824 of its 1024 points, which is the box the tile is drawn into here.
 *
 * CommonJS on purpose: an ES module main process finishes evaluating after the
 * ready event has already fired, so a top-level await on whenReady() never
 * resolves and Electron exits having done nothing.
 */
const ROOT = join(__dirname, '..', 'resources')
const ICON_BOX = 824
const ICON_CANVAS = 1024

const JOBS = [
  { svg: 'logo-mark.svg', out: 'trayTemplate.png', size: 16 },
  { svg: 'logo-mark.svg', out: 'trayTemplate@2x.png', size: 32 },
  /* Monochrome like the macOS template, but white rather than black. Windows
     and Linux take this one as-is — nothing recolours it the way the macOS
     menu bar recolours a template — and the bars it lands in are dark by
     default, where a black mark is a black mark on black. White reads on a
     dark bar and still reads on a light one against the shadow bars draw
     under their icons; black reads on neither. */
  { svg: 'logo-mark.svg', out: 'tray.png', size: 32, color: '#ffffff' },
  { svg: 'logo.svg', out: 'icon.png', size: 512 },
  { svg: 'logo.svg', out: 'icon-mac.png', size: ICON_CANVAS, inset: true }
]

app.disableHardwareAcceleration()
app.whenReady().then(main).catch(fail)

async function main() {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
  await window.loadURL('data:text/html,%3Cmeta%20charset%3D%22utf-8%22%3E')

  for (const job of JOBS) {
    const file = await readFile(join(ROOT, job.svg), 'utf8')
    const svg = job.color ? file.replace('<svg ', `<svg style="color:${job.color}" `) : file
    const box = job.inset ? Math.round((ICON_BOX / ICON_CANVAS) * job.size) : job.size
    const bytes = await render(window, svg, job.size, box)

    await writeFile(join(ROOT, job.out), bytes)
    console.log(`  • ${job.out}  ${job.size}×${job.size}  ${bytes.length} bytes`)
  }

  window.destroy()
  app.exit(0)
}

/*
 * Drawn to a canvas in the page rather than captured from the window.
 * capturePage goes through the compositor, which answers a transparent window
 * with UnknownVizError on some machines; a canvas never leaves the renderer and
 * keeps its alpha regardless.
 *
 * currentColor inside an <img> resolves against the SVG's own document, where
 * it defaults to black — which is exactly what a template image asks for. A
 * job that wants the mark in the brand hue instead says so with `color`, set
 * on the SVG's own root for the same reason: nothing outside the image gets to
 * cascade into it.
 */
async function render(window, svg, size, box) {
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  const dataUrl = await window.webContents.executeJavaScript(
    `new Promise((resolve, reject) => {
       const image = new Image()
       image.onerror = () => reject(new Error('the mark would not decode'))
       image.onload = () => {
         const canvas = document.createElement('canvas')
         canvas.width = ${size}
         canvas.height = ${size}
         const offset = (${size} - ${box}) / 2
         canvas.getContext('2d').drawImage(image, offset, offset, ${box}, ${box})
         resolve(canvas.toDataURL('image/png'))
       }
       image.src = ${JSON.stringify(source)}
     })`
  )

  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
}

function fail(error) {
  console.error(error)
  app.exit(1)
}
