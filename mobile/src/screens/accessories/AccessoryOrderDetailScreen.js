import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, Text, TextInput, View } from 'react-native';

import {
  cancelAccessoryOrder,
  createAccessoryRequestKey,
  formatAccessoryMoney,
  getAccessoryOrder,
  regenerateAccessoryPickupCode,
  retryAccessoryPayment,
} from '../../lib/accessoriesClient';
import { AccessoryPrimaryButton, AccessoryScreenHeader, AccessoryState, AccessoryStatusPill, accessoryStyles } from './AccessoriesComponents';
import {
  canRetryAccessoryPayment,
  isAccessoryOrderCancellable,
  normalizeAccessoryOrderDetail,
} from './accessoriesViewModel.mjs';

export function AccessoryOrderDetailView({ detail, pickupCode, cancelReason, busyAction, error, message, onBack, onCancelReason, onCancel, onRetryPayment, onRegenerate }) {
  const order = detail.order;
  const items = detail.items ?? [];
  const history = detail.history ?? [];
  const refunds = detail.refunds ?? [];
  const cancellable = isAccessoryOrderCancellable(order.status);
  const canRetryPayment = canRetryAccessoryPayment(order);
  const interactionBusy = Boolean(busyAction);
  return (
    <View style={accessoryStyles.screen}>
      <AccessoryScreenHeader title={order.orderReference} subtitle="Accessory pickup order" onBack={onBack} />
      <ScrollView contentContainerStyle={accessoryStyles.content}>
        <View style={accessoryStyles.card}><View style={accessoryStyles.spread}><AccessoryStatusPill status={order.status} /><AccessoryStatusPill status={order.paymentStatus} /></View><Text style={accessoryStyles.sectionTitle}>{formatAccessoryMoney(order.totalCents, order.currencyCode)}</Text><Text style={accessoryStyles.body}>{order.paymentMethod === 'pay_at_shop' ? 'Pay at Cruisers Crib during collection.' : 'PayMongo payment'}</Text>{order.reservationExpiresAt ? <Text style={accessoryStyles.body}>Reservation until {new Date(order.reservationExpiresAt).toLocaleString()}</Text> : null}</View>
        {(pickupCode || order.status === 'ready_for_pickup') ? <View style={accessoryStyles.card}><Text style={accessoryStyles.sectionTitle}>Pickup verification</Text><Text style={accessoryStyles.body}>Bring this order reference and your six-digit code. The code is shown only after checkout or regeneration.</Text><Text selectable style={{ color: '#F58220', fontSize: 28, fontWeight: '900', letterSpacing: 4 }}>{pickupCode || '------'}</Text><AccessoryPrimaryButton label="Generate a new pickup code" secondary disabled={interactionBusy && busyAction !== 'code'} busy={busyAction === 'code'} onPress={onRegenerate} /></View> : null}
        <View style={accessoryStyles.section}><Text style={accessoryStyles.sectionTitle}>Items</Text>{items.length ? items.map((item) => <View key={item.id} style={accessoryStyles.card}><Text style={accessoryStyles.value}>{item.productName}</Text><Text style={accessoryStyles.body}>{item.variantName} - {item.quantity} x {formatAccessoryMoney(item.unitPriceCents)}</Text>{item.fitment?.acknowledgedUnverified ? <Text style={accessoryStyles.body}>Unverified fitment was acknowledged.</Text> : null}</View>) : <Text style={accessoryStyles.body}>Item details are temporarily unavailable. Your order reference remains valid.</Text>}</View>
        <View style={accessoryStyles.section}><Text style={accessoryStyles.sectionTitle}>Updates</Text>{history.length ? history.map((entry) => <View key={entry.id} style={accessoryStyles.card}><AccessoryStatusPill status={entry.nextStatus} /><Text style={accessoryStyles.body}>{entry.reason || 'Order status updated.'}</Text><Text style={accessoryStyles.body}>{new Date(entry.createdAt).toLocaleString()}</Text></View>) : <Text style={accessoryStyles.body}>No fulfillment updates yet.</Text>}</View>
        {refunds.length ? <View style={accessoryStyles.section}><Text style={accessoryStyles.sectionTitle}>Refund</Text>{refunds.map((refund) => <View key={refund.id} style={accessoryStyles.card}><AccessoryStatusPill status={refund.status} /><Text style={accessoryStyles.value}>{formatAccessoryMoney(refund.amountCents, order.currencyCode)}</Text><Text style={accessoryStyles.body}>{refund.reason || 'Full-refund request'}</Text></View>)}</View> : null}
        {order.status === 'payment_exception' ? <View style={accessoryStyles.card}><Text style={accessoryStyles.sectionTitle}>Payment needs staff review</Text><Text style={accessoryStyles.body}>Payment arrived after the reservation could be fulfilled. Do not pay again; the shop is reviewing the automatic full refund.</Text></View> : null}
        {canRetryPayment ? <AccessoryPrimaryButton label="Retry PayMongo payment" disabled={interactionBusy && busyAction !== 'payment'} busy={busyAction === 'payment'} onPress={onRetryPayment} /> : null}
        {cancellable ? <View style={accessoryStyles.section}><Text style={accessoryStyles.sectionTitle}>Cancel order</Text><TextInput accessibilityLabel="Cancellation reason" editable={!interactionBusy} placeholder="Tell us why you need to cancel" placeholderTextColor="#777" value={cancelReason} onChangeText={onCancelReason} style={accessoryStyles.input} /><AccessoryPrimaryButton label={order.paymentStatus === 'paid' ? 'Request cancellation and full refund' : 'Cancel unpaid order'} secondary disabled={interactionBusy || cancelReason.trim().length < 3} busy={busyAction === 'cancel'} onPress={onCancel} /></View> : null}
        {error ? <Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={accessoryStyles.success}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

export default function AccessoryOrderDetailScreen({ account, navigation, route }) {
  const accessToken = account?.accessToken;
  const orderId = route.params?.orderId;
  const [state, setState] = useState({ status: 'loading', detail: null, error: '' });
  const [pickupCode, setPickupCode] = useState(route.params?.pickupCode || '');
  const [cancelReason, setCancelReason] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState(route.params?.initialMessage || '');
  const actionLockRef = useRef(false);
  const load = useCallback(async () => {
    if (!orderId) {
      setState({ status: 'error', detail: null, error: 'No accessory order was selected.' });
      return;
    }
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const detail = normalizeAccessoryOrderDetail(await getAccessoryOrder({ orderId, accessToken }));
      if (!detail) throw new Error('The order information is incomplete. Refresh from your order list.');
      setState({ status: 'ready', detail, error: '' });
    } catch (error) { setState({ status: 'error', detail: null, error: error?.message || 'The order could not be loaded.' }); }
  }, [orderId, accessToken]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void load();
    });
    return () => subscription.remove();
  }, [load]);
  if (state.status === 'loading') return <AccessoryState status="loading" title="Loading order" />;
  if (state.status === 'error' || !state.detail) return <AccessoryState status="error" title="Order unavailable" message={state.error} actionLabel={orderId ? 'Try again' : 'Return to orders'} onAction={() => orderId ? void load() : navigation.replace('AccessoryOrders')} />;

  const run = async (action, operation) => {
    if (actionLockRef.current || busyAction) return;
    actionLockRef.current = true;
    setBusyAction(action); setMessage(''); setState((current) => ({ ...current, error: '' }));
    try {
      const result = await operation();
      if (action === 'code') setPickupCode(result.pickupCode);
      if (action === 'payment' && result.checkoutUrl) {
        try { await Linking.openURL(result.checkoutUrl); }
        catch { setMessage('A new payment link is ready, but it could not open. Your order remains unchanged; try again when your browser is available.'); }
      }
      if (action === 'cancel') setMessage(state.detail.order.paymentStatus === 'paid' ? 'Your full-refund request is pending staff review.' : 'Your order was cancelled and reserved stock was released.');
      await load();
    } catch (error) { setState((current) => ({ ...current, error: error?.message || 'The action could not be completed.' })); }
    finally { actionLockRef.current = false; setBusyAction(''); }
  };
  return <AccessoryOrderDetailView detail={state.detail} pickupCode={pickupCode} cancelReason={cancelReason} busyAction={busyAction} error={state.error} message={message} onBack={() => navigation.goBack()} onCancelReason={setCancelReason} onCancel={() => void run('cancel', () => cancelAccessoryOrder({ orderId, reason: cancelReason, accessToken, idempotencyKey: createAccessoryRequestKey() }))} onRetryPayment={() => void run('payment', () => retryAccessoryPayment({ orderId, accessToken, idempotencyKey: createAccessoryRequestKey() }))} onRegenerate={() => void run('code', () => regenerateAccessoryPickupCode({ orderId, accessToken }))} />;
}
