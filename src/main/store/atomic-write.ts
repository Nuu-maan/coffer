import { randomBytes } from 'node:crypto'
import { rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const tempPath = join(dirname(filePath), `.${randomBytes(6).toString('hex')}.tmp`)
  const payload = JSON.stringify(data, null, 2)

  try {
    await writeFile(tempPath, payload, 'utf8')
    await rename(tempPath, filePath)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}
