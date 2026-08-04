import { Text, View } from 'react-native';

import Button from './Button';
import Sheet from './Sheet';

const meta = {
  title: 'Mobile/Overlays/Sheet',
  component: Sheet,
  args: {
    visible: true,
    onClose: () => {},
    variant: 'bottom',
  },
};

export default meta;

export const VehiclePicker = {
  render: (args) => (
    <Sheet {...args}>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: '#f7f7f8', fontSize: 20, fontWeight: '700' }}>
          Choose a vehicle
        </Text>
        <Text style={{ color: '#b2b4ba', lineHeight: 20 }}>
          Search by plate number, make, model, or vehicle reference.
        </Text>
        <Button label="Use 2019 Toyota Vios" onPress={() => {}} fullWidth />
        <Button label="Cancel" onPress={args.onClose} variant="secondary" fullWidth />
      </View>
    </Sheet>
  ),
};
