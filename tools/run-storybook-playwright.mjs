import { spawn } from 'node:child_process'
import path from 'node:path'

import { startStaticServer } from '../qa/playwright/support/serve-static.mjs'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const STORYBOOK_DIR = path.join(ROOT_DIR, 'frontend', 'storybook-static')
const PLAYWRIGHT_CLI = path.join(ROOT_DIR, 'node_modules', '@playwright', 'test', 'cli.js')
const PORT = 6006
const TIMEOUT_MS = 120_000

async function closeServer(server) {
  server.closeAllConnections?.()
  await new Promise((resolve) => server.close(resolve))
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [PLAYWRIGHT_CLI, 'test', '--config=playwright.storybook.config.mjs'],
      {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          STORYBOOK_QA_EXTERNAL_SERVER: '1',
        },
        stdio: 'inherit',
        windowsHide: true,
      },
    )

    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`Storybook Playwright QA exceeded ${TIMEOUT_MS / 1000} seconds`))
    }, TIMEOUT_MS)

    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Storybook Playwright QA failed (${signal ?? `exit ${code}`})`))
    })
  })
}

let server

try {
  server = await startStaticServer(STORYBOOK_DIR, PORT)
  await runPlaywright()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  if (server) {
    await closeServer(server)
  }
}
