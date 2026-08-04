import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { formatAccessoryMoney, listAccessoryOrders } from '../../lib/accessoriesClient';
import { AccessoryPrimaryButton, AccessoryScreenHeader, AccessoryState, AccessoryStatusPill, accessoryStyles } from './AccessoriesComponents';
import { normalizeAccessoryPage } from './accessoriesViewModel.mjs';

export function AccessoryOrdersView({ orders, status, error, loadingMore, hasMore, onBack, onRetry, onOpen, onLoadMore }) {
  if (status === 'loading') return <AccessoryState status="loading" title="Loading your orders" />;
  if (status === 'error') return <AccessoryState status="error" title="Orders unavailable" message={error} actionLabel="Try again" onAction={onRetry} />;
  return (
    <View style={accessoryStyles.screen}>
      <AccessoryScreenHeader title="Accessory orders" subtitle="Pickup, payment, cancellation, and refund status" onBack={onBack} />
      <FlatList
        data={orders}
        keyExtractor={(order) => order.id}
        contentContainerStyle={accessoryStyles.content}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open order ${item.orderReference}`} onPress={() => onOpen(item.id)} style={accessoryStyles.card}><View style={accessoryStyles.spread}><Text style={accessoryStyles.value}>{item.orderReference}</Text><AccessoryStatusPill status={item.status} /></View><Text style={accessoryStyles.body}>{formatAccessoryMoney(item.totalCents, item.currencyCode)} - {item.paymentMethod === 'pay_at_shop' ? 'Pay at shop' : 'PayMongo'}</Text><Text style={accessoryStyles.body}>{new Date(item.createdAt).toLocaleDateString()}</Text></Pressable>}
        ListEmptyComponent={<AccessoryState status="empty" title="No accessory orders yet" message="Orders you place will appear here and remain available after you sign in again." />}
        ListFooterComponent={loadingMore ? <AccessoryState status="loading" title="Loading more orders" message="" /> : error ? <View style={accessoryStyles.section}><Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{error}</Text><AccessoryPrimaryButton label="Retry loading more orders" secondary onPress={onLoadMore} /></View> : null}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.35}
      />
    </View>
  );
}

export default function AccessoryOrdersScreen({ account, navigation }) {
  const [state, setState] = useState({ status: 'loading', orders: [], nextCursor: null, error: '', loadingMore: false });
  const accessToken = account?.accessToken;
  const load = async (append = false) => {
    setState((current) => ({ ...current, ...(append ? { loadingMore: true } : { status: 'loading' }), error: '' }));
    try {
      const page = await listAccessoryOrders({ accessToken, cursor: append ? state.nextCursor : null });
      const normalizedPage = normalizeAccessoryPage(
        page,
        20,
        (order) => Boolean(order?.id && order?.orderReference),
      );
      setState((current) => ({ status: 'ready', orders: append ? [...current.orders, ...normalizedPage.items] : normalizedPage.items, nextCursor: normalizedPage.nextCursor, error: '', loadingMore: false }));
    } catch (error) { setState((current) => ({ ...current, status: append ? 'ready' : 'error', error: error?.message || 'Your accessory orders could not be loaded.', loadingMore: false })); }
  };
  useEffect(() => { void load(); }, [accessToken]);
  return <AccessoryOrdersView orders={state.orders} status={state.status} error={state.error} loadingMore={state.loadingMore} hasMore={Boolean(state.nextCursor)} onBack={() => navigation.goBack()} onRetry={() => void load()} onOpen={(orderId) => navigation.navigate('AccessoryOrderDetail', { orderId })} onLoadMore={() => !state.loadingMore && state.nextCursor && void load(true)} />;
}
