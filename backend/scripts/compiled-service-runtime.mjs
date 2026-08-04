import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const COMPILED_PATH_ALIASES = Object.freeze({
  '@shared/*': ['shared/*'],
  '@main-modules/*': ['apps/main-service/src/modules/*'],
})

export const COMPILED_SERVICE_DEFINITIONS = Object.freeze({
  'main-service': Object.freeze({
    baseUrl: path.join(backendRoot, 'dist', 'apps', 'main-service'),
    entry: path.join(
      backendRoot,
      'dist',
      'apps',
      'main-service',
      'apps',
      'main-service',
      'src',
      'main.js',
    ),
  }),
})

export function getCompiledServiceDefinition(serviceName) {
  const definition = COMPILED_SERVICE_DEFINITIONS[serviceName]
  if (!definition) {
    const supported = Object.keys(COMPILED_SERVICE_DEFINITIONS).join(', ')
    throw new Error(`Unknown compiled service "${serviceName}". Expected one of: ${supported}.`)
  }
  return definition
}

export function launchCompiledService(serviceName) {
  const definition = getCompiledServiceDefinition(serviceName)
  if (!existsSync(definition.entry)) {
    throw new Error(
      `Compiled entry is missing at ${definition.entry}. Build ${serviceName} before starting it.`,
    )
  }

  const tsconfigPaths = require('tsconfig-paths')
  tsconfigPaths.register({
    baseUrl: definition.baseUrl,
    paths: COMPILED_PATH_ALIASES,
  })
  require(definition.entry)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) {
  try {
    launchCompiledService(process.argv[2])
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
