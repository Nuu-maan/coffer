import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

/*
 * Two things Electron ships that this app cannot reach.
 *
 * The locale packs are Chromium's own strings — its context menus, its error
 * pages — in fifty-five languages. Coffer has no translations, so fifty-four
 * of them describe a UI nobody will ever be shown.
 *
 * dxcompiler.dll is the DirectX shader compiler Dawn uses for WebGPU. The
 * renderer is React and CSS; nothing here asks for a GPU context that needs
 * it. ANGLE, which does the actual drawing, is libGLESv2 and d3dcompiler_47,
 * and both stay.
 *
 * Both were verified by stripping a packaged build and running it: the window,
 * the list, settings, and a full clipper capture, with no errors.
 */
const KEEP_LOCALE = 'en-US.pak'
const DROP = ['dxcompiler.dll']

export default async function afterPack(context) {
  const dir = context.appOutDir
  let freed = 0

  freed += await pruneLocales(join(dir, 'locales'))

  for (const name of DROP) {
    freed += await remove(join(dir, name))
  }

  console.log(`  • trimmed unused Electron payload  freed=${(freed / 1024 / 1024).toFixed(1)}MB`)
}

async function pruneLocales(dir) {
  let entries
  try {
    entries = await readdir(dir)
  } catch {
    return 0
  }

  let freed = 0
  for (const entry of entries) {
    if (entry === KEEP_LOCALE) continue
    if (!entry.endsWith('.pak')) continue
    freed += await remove(join(dir, entry))
  }
  return freed
}

async function remove(path) {
  try {
    const { size } = await stat(path)
    await rm(path, { force: true })
    return size
  } catch {
    return 0
  }
}
