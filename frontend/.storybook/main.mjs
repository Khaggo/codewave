import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryDirectory = path.resolve(configDirectory, '..', '..')
const materialCommunityIconsStub = path
  .join(configDirectory, 'MaterialCommunityIconsStub.jsx')
  .replaceAll('\\', '/')

const getAbsolutePath = (packageName) =>
  path.dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)))

const config = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../mobile/src/screens/dashboard/BookingTab.stories.@(js|jsx|mjs|ts|tsx)',
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
    define: {
      ...viteConfig.define,
      __DEV__: true,
    },
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...viteConfig.resolve?.alias,
        '@': path.join(repositoryDirectory, 'frontend', 'src'),
        'react-native': 'react-native-web',
        '@expo/vector-icons/MaterialCommunityIcons': materialCommunityIconsStub,
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
      include: [
        ...(viteConfig.optimizeDeps?.include ?? []),
        '@radix-ui/react-select',
      ],
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
