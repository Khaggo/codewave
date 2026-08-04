import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import {
  COMPILED_SERVICE_DEFINITIONS,
  getCompiledServiceDefinition,
} from './compiled-service-runtime.mjs'

test('resolves the compiled main-service entry beneath its isolated output root', () => {
  const definition = getCompiledServiceDefinition('main-service')

  assert.equal(path.basename(definition.entry), 'main.js')
  assert.equal(definition.entry.startsWith(`${definition.baseUrl}${path.sep}`), true)
})

test('rejects unknown compiled service names with the supported choices', () => {
  assert.throws(
    () => getCompiledServiceDefinition('unknown'),
    /Expected one of: main-service/,
  )
  assert.equal(Object.isFrozen(COMPILED_SERVICE_DEFINITIONS), true)
})
