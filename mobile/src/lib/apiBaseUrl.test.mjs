import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildApiBaseUrlCandidates,
  deriveApiBaseUrlFromSourceScript,
  normalizeApiBaseUrl,
} from './apiBaseUrl.mjs'

test('normalizes supported API URLs and rejects malformed values', () => {
  assert.equal(normalizeApiBaseUrl(' https://api.example.test/// '), 'https://api.example.test')
  assert.equal(normalizeApiBaseUrl('ftp://api.example.test'), '')
  assert.equal(normalizeApiBaseUrl('not-a-url'), '')
})

test('derives a development API URL from the Metro source host', () => {
  assert.equal(
    deriveApiBaseUrlFromSourceScript({
      isDev: true,
      platform: 'ios',
      sourceScriptUrl: 'http://192.168.1.20:8081/index.bundle',
    }),
    'http://192.168.1.20:3000',
  )
  assert.equal(
    deriveApiBaseUrlFromSourceScript({
      isDev: true,
      platform: 'android',
      sourceScriptUrl: 'http://localhost:8081/index.bundle',
    }),
    'http://10.0.2.2:3000',
  )
})

test('production candidates use the canonical API URL unless explicitly configured', () => {
  assert.deepEqual(
    buildApiBaseUrlCandidates({
      isDev: false,
      platform: 'android',
      sourceScriptUrl: 'http://localhost:8081/index.bundle',
    }),
    ['https://api.autocare-cc.com'],
  )
  assert.deepEqual(
    buildApiBaseUrlCandidates({
      isDev: false,
      platform: 'android',
      configuredApiBaseUrl: 'https://api.example.test/',
    }),
    ['https://api.example.test'],
  )
  assert.deepEqual(
    buildApiBaseUrlCandidates({
      isDev: false,
      platform: 'android',
      configuredApiBaseUrl: 'not-a-url',
    }),
    ['https://api.autocare-cc.com'],
  )
})

