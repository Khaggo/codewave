# Storybook, Component Tests, and MCP

Storybook documents and tests staff-web and customer-mobile UI components in isolation.

## Commands

```text
npm run dev:storybook
npm --workspace mobile run storybook:generate
npm run dev:storybook:mobile
npm run runtime:status
npm run runtime:logs -- storybook-web
npm run runtime:logs -- storybook-mobile
npm run runtime:stop -- storybook-web
npm run runtime:stop -- storybook-mobile
npm run test:storybook
npm run test:storybook:mcp
npm run build:storybook
npm run qa:storybook
npm run check:storybook
npm run ui:check
```

The managed development server runs at `http://127.0.0.1:6006`.
Its MCP endpoint is `http://127.0.0.1:6006/mcp`.
The on-device React Native catalog uses managed Metro on port `8085` and is included
only when `STORYBOOK_ENABLED` and `EXPO_PUBLIC_STORYBOOK_ENABLED` are true. Generate
its registry before startup after adding or renaming a mobile story. Normal Expo builds
stub Storybook imports and do not include the catalog.

`test:storybook` runs story interaction and accessibility checks in headless
Chromium through Vitest. `qa:storybook` runs Playwright smoke tests against the
catalog and MCP endpoint. `test:storybook:mcp` connects through the official MCP
transport and invokes `run-story-tests` with accessibility enabled.

Storybook 10.5.5's native MCP-to-Vitest child bridge can lose its UniversalStore
handshake on Windows and terminate the development server. The repository
postinstall script applies a version-checked compatibility bridge to
`@storybook/addon-mcp` 0.7.0. Only `run-story-tests` is redirected to a bounded,
focused Playwright and Axe runner; Storybook's official documentation, preview,
change-detection, and component tools remain unchanged. A dependency upgrade
fails the patch with an explicit review message instead of applying it to an
unknown package layout.

## Adding Stories

Place `*.stories.js` next to the component. Prefer stories for meaningful
states such as loading, empty, error, permission-limited, and destructive
confirmation. Use interaction tests for behavior the user can observe.

The accessibility addon runs against every web story and treats violations as test
failures. React Native stories cover touch targets and important visual states on-device;
the normal Expo export remains the production-bundle guard.
