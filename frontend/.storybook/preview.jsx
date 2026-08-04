import '../src/app/globals.css'

export const globalTypes = {
  theme: {
    description: 'Application theme',
    defaultValue: 'dark',
    toolbar: {
      icon: 'paintbrush',
      items: [
        { value: 'dark', title: 'Dark' },
        { value: 'light', title: 'Light' },
      ],
      dynamicTitle: true,
    },
  },
  density: {
    description: 'Workspace density',
    defaultValue: 'comfortable',
    toolbar: {
      icon: 'component',
      items: [
        { value: 'comfortable', title: 'Comfortable' },
        { value: 'compact', title: 'Compact' },
      ],
      dynamicTitle: true,
    },
  },
  motion: {
    description: 'Motion preference',
    defaultValue: 'full',
    toolbar: {
      icon: 'lightning',
      items: [
        { value: 'full', title: 'Full motion' },
        { value: 'reduced', title: 'Reduced motion' },
      ],
      dynamicTitle: true,
    },
  },
}

const preview = {
  decorators: [
    (Story, context) => (
      <div
        data-theme={context.globals.theme || 'dark'}
        data-density={context.globals.density || 'comfortable'}
        data-reduced-motion={context.globals.motion === 'reduced' ? 'true' : 'false'}
        style={{
          minHeight: '100vh',
          padding: context.parameters.layout === 'fullscreen' ? 0 : '16px',
          background: 'rgb(var(--surface-bg))',
        }}
      >
        {context.globals.motion === 'reduced' ? (
          <style>{`*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }`}</style>
        ) : null}
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        compactMobile: {
          name: 'Compact mobile (320 x 640)',
          styles: { width: '320px', height: '640px' },
          type: 'mobile',
        },
        mobile: {
          name: 'Mobile (390 x 844)',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (1024 x 768)',
          styles: { width: '1024px', height: '768px' },
          type: 'tablet',
        },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
  },
}

export default preview
