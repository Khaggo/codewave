import { View } from 'react-native';

import { AccessoryPrimaryButton, AccessoryProductRow, AccessoryScreenHeader, AccessoryState, AccessoryStatusPill } from './AccessoriesComponents';

const meta = {
  title: 'Mobile/Accessories/Primitives',
  component: AccessoryProductRow,
  decorators: [(Story) => <View style={{ flex: 1, minHeight: 500 }}><Story /></View>],
};

export default meta;

export const ProductRow = { args: { row: { product: { name: 'LED fog light pair', startingPriceCents: 189900 }, category: { name: 'Lighting' } }, onPress: () => {} } };
export const Loading = { render: () => <AccessoryState status="loading" /> };
export const RecoverableError = { render: () => <AccessoryState status="error" title="Catalog unavailable" message="Check your connection and try again." actionLabel="Retry" onAction={() => {}} /> };
export const HeaderAndActions = { render: () => <AccessoryScreenHeader title="Accessories" subtitle="Pickup at Cruisers Crib" actions={[{ label: 'Open cart', icon: 'cart-outline', badge: 2, onPress: () => {} }]} /> };
export const Controls = { render: () => <View style={{ gap: 12 }}><AccessoryStatusPill status="ready_for_pickup" /><AccessoryPrimaryButton label="Continue to checkout" onPress={() => {}} /><AccessoryPrimaryButton label="Try again" secondary onPress={() => {}} /></View> };
