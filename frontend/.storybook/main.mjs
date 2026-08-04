import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryDirectory = path.resolve(configDirectory, '..', '..')

const getAbsolutePath = (packageName) =>
  path.dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)))

const config = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-vitest'),
    {
      name: getAbsolutePath('@storybook/addon-mcp'),
      options: {
        endpoint: '/mcp',
      },
    },
  ],
  framework: {
    name: getAbsolutePath('@storybook/nextjs-vite'),
    options: {},
  },
  core: {
    builder: {
      name: fileURLToPath(import.meta.resolve('@storybook/builder-vite')),
      options: {
        configLoader: 'runner',
      },
    },
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...viteConfig.resolve?.alias,
        '@': path.join(repositoryDirectory, 'frontend', 'src'),
      },
    },
    cacheDir: path.join(
      repositoryDirectory,
      '.managed-runtime',
      'storybook-vite-cache',
    ),
    rolldownOptions: {
      ...viteConfig.rolldownOptions,
      moduleTypes: {
        ...viteConfig.rolldownOptions?.moduleTypes,
        '.js': 'jsx',
      },
    },
    optimizeDeps: {
      ...viteConfig.optimizeDeps,
      rolldownOptions: {
        ...viteConfig.optimizeDeps?.rolldownOptions,
        moduleTypes: {
          ...viteConfig.optimizeDeps?.rolldownOptions?.moduleTypes,
          '.js': 'jsx',
        },
      },
    },
  }),
}

export default config
