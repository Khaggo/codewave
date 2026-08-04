import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../src/theme/ThemeProvider';

const preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={{ flex: 1, minHeight: 640, padding: 16 }}>
            <Story />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
