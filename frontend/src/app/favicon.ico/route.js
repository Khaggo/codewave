import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BRAND_ASSET_PATHS = [
  resolve(process.cwd(), 'assets', 'CruiserCriblogo.png'),
  resolve(process.cwd(), 'frontend', 'assets', 'CruiserCriblogo.png'),
]

export async function GET() {
  for (const assetPath of BRAND_ASSET_PATHS) {
    try {
      const asset = await readFile(assetPath)
      return new Response(asset, {
        headers: {
          'Cache-Control': 'public, max-age=86400',
          'Content-Type': 'image/png',
        },
      })
    } catch {
      // Try the other repository-supported asset location.
    }
  }

  return new Response('Not found', { status: 404 })
}
