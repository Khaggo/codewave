import { View } from 'react-native';

import Button from './Button';

const meta = {
  title: 'Mobile/Controls/Button',
  component: Button,
  args: {
    label: 'Book service',
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <View style={{ width: '100%', maxWidth: 390 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

export const Default = {};

export const Loading = {
  args: { loading: true, accessibilityLabel: 'Booking service' },
};

export const Disabled = {
  args: { disabled: true },
};

export const LongContent = {
  args: {
    label: 'Continue with selected vehicle and workshop services',
    fullWidth: true,
  },
};
