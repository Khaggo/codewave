import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveApiBaseUrl } from './apiBaseUrl.mjs'

test('deriveApiBaseUrl keeps explicit non-localhost API hosts unchanged', () => {
  assert.equal(
    deriveApiBaseUrl({
      configuredBaseUrl: 'https://api.autocare-cc.com/',
      browserHostname: '192.168.100.119',
    }),
    'https://api.autocare-cc.com',
  )
})

test('deriveApiBaseUrl rewrites localhost API hosts to the current LAN hostname', () => {
  assert.equal(
    deriveApiBaseUrl({
      configuredBaseUrl: 'http://127.0.0.1:3000',
      browserHostname: '192.168.100.119',
    }),
    'http://192.168.100.119:3000',
  )

  assert.equal(
    deriveApiBaseUrl({
      configuredBaseUrl: 'http://localhost:3000/',
      browserHostname: '192.168.100.119',
    }),
    'http://192.168.100.119:3000',
  )
})

test('deriveApiBaseUrl preserves localhost when the browser is also on localhost', () => {
  assert.equal(
    deriveApiBaseUrl({
      configuredBaseUrl: 'http://127.0.0.1:3000/',
      browserHostname: '127.0.0.1',
    }),
    'http://127.0.0.1:3000',
  )
})
