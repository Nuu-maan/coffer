import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

export default function afterSign(context) {
  const identity = process.env.MAC_SIGN_IDENTITY
  if (context.electronPlatformName !== 'darwin' || !identity) return

  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync(
    'codesign',
    [
      '--force',
      '--deep',
      '--sign',
      identity,
      '--options',
      'runtime',
      '--entitlements',
      'build/entitlements.mac.plist',
      app
    ],
    { stdio: 'inherit' }
  )
  console.log(`  • re-signed with "${identity}"`)
}
