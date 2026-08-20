import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

/*
 * dxcompiler.dll is the DirectX shader compiler Dawn uses for WebGPU. The
 * renderer is React and CSS; nothing here asks for a GPU context that needs it.
 * ANGLE, which does the actual drawing, is libGLESv2 and d3dcompiler_47, and
 * both stay. Verified by stripping a packaged build and running it: the window,
 * the list, settings, and a full clipper capture, with no errors.
 *
 * The locale packs used to be pruned here too. They are handled by
 * electronLanguages in electron-builder.yml now, which does the same job on
 * every platform and — unlike a hook — runs before signing, so the macOS bundle
 * seal still matches what is inside it. This hook could not have done that job
 * on macOS anyway: the entries there are .lproj directories rather than .pak
 * files, so the readdir threw, the catch swallowed it, and the build reported
 * freeing nothing while shipping all of them.
 */
/* electron-builder's own Arch enum, which is what arrives on the context. */
const ARCH = ['ia32', 'x64', 'armv7l', 'arm64', 'universal']

export default async function afterPack(context) {
  if (context.electronPlatformName === 'darwin') return dropForeignSlice(context)
  if (context.electronPlatformName !== 'win32') return

  const freed = await remove(join(context.appOutDir, 'dxcompiler.dll'))
  console.log(`  • trimmed unused Electron payload  freed=${(freed / 1024 / 1024).toFixed(1)}MB`)
}

/*
 * uiohook-napi ships a prebuild per platform and architecture, and the config
 * can only exclude by platform — so both darwin slices land in both builds and
 * the arm64 app carries an x86_64 binary it will never load.
 *
 * Here rather than in `files` because this is the only hook that knows which
 * architecture it is packing, and it runs before signing, so the slice is gone
 * before anything seals the bundle around it.
 */
async function dropForeignSlice(context) {
  const arch = ARCH[context.arch]
  if (!arch || arch === 'universal') return

  const prebuilds = join(
    context.appOutDir,
    'Coffer.app/Contents/Resources/app.asar.unpacked/node_modules/uiohook-napi/prebuilds'
  )

  let entries
  try {
    entries = await readdir(prebuilds)
  } catch {
    return
  }

  let freed = 0
  for (const entry of entries) {
    if (!entry.startsWith('darwin-') || entry === `darwin-${arch}`) continue
    freed += await removeTree(join(prebuilds, entry))
  }

  console.log(`  • dropped the non-${arch} prebuild  freed=${(freed / 1024).toFixed(0)}KB`)
}

async function removeTree(path) {
  let freed = 0
  try {
    for (const entry of await readdir(path)) freed += await remove(join(path, entry))
    await rm(path, { recursive: true, force: true })
  } catch {
    return freed
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
