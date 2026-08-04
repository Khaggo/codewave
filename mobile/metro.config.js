const path = require('node:path')

const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')
const config = getDefaultConfig(projectRoot)
const mobileWatchRoots = new Set([
  path.join(workspaceRoot, 'node_modules'),
  projectRoot,
  path.join(workspaceRoot, 'packages', 'contracts'),
  path.join(workspaceRoot, 'packages', 'domain-utils'),
].map((folder) => path.resolve(folder).toLowerCase()))

config.watchFolders = config.watchFolders.filter((folder) => (
  mobileWatchRoots.has(path.resolve(folder).toLowerCase())
))

const storybookEnabled = process.env.STORYBOOK_ENABLED === 'true'
const storybookConfigPath = path.resolve(projectRoot, '.rnstorybook')

if (storybookEnabled) {
  const configuredResolveRequest = config.resolver?.resolveRequest

  config.transformer.unstable_allowRequireContext = true
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolveRequest = configuredResolveRequest ?? context.resolveRequest
    const needsImportConditions =
      moduleName.startsWith('storybook') ||
      moduleName.startsWith('@storybook') ||
      moduleName.startsWith('uuid')
    const resolverContext = needsImportConditions
      ? {
          ...context,
          unstable_enablePackageExports: true,
          unstable_conditionNames: ['import'],
        }
      : context

    const result = resolveRequest(resolverContext, moduleName, platform)
    if (result?.filePath?.includes?.('@storybook/react/template/cli')) {
      return { type: 'empty' }
    }
    if (platform !== 'web' && (moduleName === 'tty' || moduleName === 'os')) {
      return { type: 'empty' }
    }
    return result
  }

  module.exports = config
} else {
  const configuredResolveRequest = config.resolver?.resolveRequest

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolveRequest = configuredResolveRequest ?? context.resolveRequest
    if (moduleName.startsWith('storybook') || moduleName.startsWith('@storybook')) {
      return { type: 'empty' }
    }
    if (platform !== 'web' && (moduleName === 'tty' || moduleName === 'os')) {
      return { type: 'empty' }
    }

    const result = resolveRequest(context, moduleName, platform)
    if (result?.filePath?.includes?.(storybookConfigPath)) {
      return { type: 'empty' }
    }
    return result
  }

  module.exports = config
}
