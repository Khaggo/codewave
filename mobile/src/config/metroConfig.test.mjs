import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const workspaceRoot = path.resolve(mobileRoot, '..')
const config = require('../../metro.config.js')
const normalizedWatchFolders = config.watchFolders.map((folder) => (
  path.resolve(folder).toLowerCase()
))

test('mobile Metro watches only mobile dependencies and shared packages', () => {
  assert.ok(normalizedWatchFolders.includes(mobileRoot.toLowerCase()))
  assert.ok(normalizedWatchFolders.includes(path.join(workspaceRoot, 'node_modules').toLowerCase()))
  assert.ok(
    normalizedWatchFolders.includes(
      path.join(workspaceRoot, 'packages', 'contracts').toLowerCase(),
    ),
  )
  assert.ok(
    normalizedWatchFolders.includes(
      path.join(workspaceRoot, 'packages', 'domain-utils').toLowerCase(),
    ),
  )
  assert.equal(
    normalizedWatchFolders.some((folder) => (
      folder.startsWith(path.join(workspaceRoot, 'backend').toLowerCase())
    )),
    false,
  )
  assert.equal(
    normalizedWatchFolders.some((folder) => (
      folder.startsWith(path.join(workspaceRoot, 'frontend').toLowerCase())
    )),
    false,
  )
})
