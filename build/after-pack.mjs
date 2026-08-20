import { rm, stat } from 'node:fs/promises'
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
export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const freed = await remove(join(context.appOutDir, 'dxcompiler.dll'))
  console.log(`  • trimmed unused Electron payload  freed=${(freed / 1024 / 1024).toFixed(1)}MB`)
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
