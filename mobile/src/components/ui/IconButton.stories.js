import { View } from 'react-native';

import IconButton from './IconButton';

const meta = {
  title: 'Mobile/Controls/IconButton',
  component: IconButton,
  args: {
    icon: 'refresh-cw',
    accessibilityLabel: 'Refresh current work',
    onPress: () => {},
  },
};

export default meta;

export const States = {
  render: (args) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <IconButton {...args} variant="primary" />
      <IconButton {...args} variant="subtle" icon="search" accessibilityLabel="Search" />
      <IconButton {...args} loading accessibilityLabel="Refreshing" />
      <IconButton {...args} disabled icon="trash-2" accessibilityLabel="Delete unavailable" />
    </View>
  ),
};
