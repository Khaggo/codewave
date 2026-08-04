import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryDirectory = path.resolve(toolsDirectory, '..')
const frontendDirectory = path.join(repositoryDirectory, 'frontend')
const storybookHomeDirectory = path.join(
  repositoryDirectory,
  '.managed-runtime',
  'storybook-home',
)

const modes = {
  dev: {
    entry: path.join(
      repositoryDirectory,
      'node_modules',
      'storybook',
      'dist',
      'bin',
      'dispatcher.js',
    ),
    arguments: [
      'dev',
      '--port',
      '6006',
      '--host',
      '127.0.0.1',
      '--no-open',
    ],
  },
  build: {
    entry: path.join(
      repositoryDirectory,
      'node_modules',
      'storybook',
      'dist',
      'bin',
      'dispatcher.js',
    ),
    arguments: ['build'],
  },
  test: {
    entry: path.join(
      repositoryDirectory,
      'node_modules',
      'vitest',
      'vitest.mjs',
    ),
    arguments: ['--configLoader=runner', '--project=storybook', '--run'],
  },
}

const modeName = process.argv[2]
const mode = modes[modeName]

if (!mode) {
  console.error('Usage: node tools/run-storybook.mjs <dev|build|test>')
  process.exit(1)
}

const child = spawn(
  process.execPath,
  [mode.entry, ...mode.arguments, ...process.argv.slice(3)],
  {
    cwd: frontendDirectory,
    env: {
      ...process.env,
      CACHE_DIR: path.join(repositoryDirectory, '.managed-runtime', 'cache'),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'safe.directory',
      GIT_CONFIG_VALUE_0: repositoryDirectory.replaceAll('\\', '/'),
      HOME: storybookHomeDirectory,
      STORYBOOK_CONFIG_LOADER: 'runner',
      USERPROFILE: storybookHomeDirectory,
      STORYBOOK_DISABLE_TELEMETRY: '1',
    },
    stdio: 'inherit',
    windowsHide: true,
  },
)

child.once('error', (error) => {
  console.error(`Unable to start Storybook ${modeName}: ${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`Storybook ${modeName} stopped by ${signal}.`)
    process.exitCode = 1
    return
  }

  process.exitCode = code ?? 1
})
