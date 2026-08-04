import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import {
  deleteAccessoryCartItem,
  formatAccessoryMoney,
  getAccessoryCapabilities,
  getAccessoryCart,
  patchAccessoryCartItem,
} from '../../lib/accessoriesClient';
import { AccessoryPrimaryButton, AccessoryScreenHeader, AccessoryState, accessoryStyles } from './AccessoriesComponents';
import { isAccessoryOrderingEnabled, normalizeAccessoryCart } from './accessoriesViewModel.mjs';

export function AccessoryCartView({ cart, orderingEnabled = true, busyVariantId, error, onBack, onQuantity, onRemove, onRefresh, onCheckout }) {
  const total = (cart.items ?? []).reduce((sum, row) => sum + Number(row.item.quantity) * Number(row.variant.priceCents), 0);
  const busy = Boolean(busyVariantId);
  return (
    <View style={accessoryStyles.screen}>
      <AccessoryScreenHeader title="Your cart" subtitle="Prices and availability are checked again at checkout" onBack={onBack} />
      <FlatList
        data={cart.items ?? []}
        keyExtractor={(row) => row.item.id}
        contentContainerStyle={accessoryStyles.content}
        renderItem={({ item: row }) => (
          <View style={accessoryStyles.card}>
            <View style={accessoryStyles.spread}><View style={{ flex: 1 }}><Text style={accessoryStyles.value}>{row.product.name}</Text><Text style={accessoryStyles.body}>{row.variant.name} - {formatAccessoryMoney(row.variant.priceCents)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${row.product.name}`} accessibilityState={{ disabled: !orderingEnabled || busy }} disabled={!orderingEnabled || busy} onPress={() => onRemove(row.item.variantId)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', opacity: (!orderingEnabled || busy) ? 0.5 : 1 }}><Text style={accessoryStyles.error}>Remove</Text></Pressable></View>
            <View style={accessoryStyles.spread}><Text style={accessoryStyles.label}>Quantity</Text><View style={accessoryStyles.row}><AccessoryPrimaryButton label="-" accessibilityLabel={`Decrease ${row.product.name} quantity`} secondary disabled={!orderingEnabled || busy || row.item.quantity <= 1} busy={busyVariantId === row.item.variantId} onPress={() => onQuantity(row.item.variantId, row.item.quantity - 1)} /><Text style={accessoryStyles.value}>{row.item.quantity}</Text><AccessoryPrimaryButton label="+" accessibilityLabel={`Increase ${row.product.name} quantity`} secondary disabled={!orderingEnabled || busy} busy={busyVariantId === row.item.variantId} onPress={() => onQuantity(row.item.variantId, row.item.quantity + 1)} /></View></View>
          </View>
        )}
        ListEmptyComponent={<AccessoryState status="empty" title="Your cart is empty" message="Browse the catalog and add an accessory to continue." />}
      />
      {(cart.items ?? []).length ? <View style={accessoryStyles.footer}><View style={[accessoryStyles.spread, { marginBottom: 12 }]}><Text style={accessoryStyles.sectionTitle}>Subtotal</Text><Text style={accessoryStyles.sectionTitle}>{formatAccessoryMoney(total)}</Text></View>{!orderingEnabled ? <Text accessibilityLiveRegion="polite" style={[accessoryStyles.body, { marginBottom: 10 }]}>Your saved cart remains visible, but ordering has not opened yet.</Text> : null}{error ? <View style={{ gap: 8, marginBottom: 10 }}><Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{error}</Text><AccessoryPrimaryButton label="Refresh cart" secondary disabled={busy} onPress={onRefresh} /></View> : null}<AccessoryPrimaryButton label={orderingEnabled ? 'Continue to checkout' : 'Ordering not available yet'} disabled={!orderingEnabled || busy || Boolean(error)} onPress={onCheckout} /></View> : null}
    </View>
  );
}

export default function AccessoryCartScreen({ account, navigation }) {
  const [state, setState] = useState({ status: 'loading', cart: null, orderingEnabled: false, error: '', busyVariantId: '' });
  const accessToken = account?.accessToken;
  const updateLockRef = useRef(false);
  const load = async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const [rawCart, capabilities] = await Promise.all([
        getAccessoryCart({ accessToken }),
        getAccessoryCapabilities({ accessToken }),
      ]);
      const cart = normalizeAccessoryCart(rawCart);
      if (!cart) throw new Error('The cart information is incomplete. Refresh and try again.');
      setState({ status: 'ready', cart, orderingEnabled: isAccessoryOrderingEnabled(capabilities), error: '', busyVariantId: '' });
    }
    catch (error) { setState({ status: 'error', cart: null, orderingEnabled: false, error: error?.message || 'Your cart could not be loaded.', busyVariantId: '' }); }
  };
  useEffect(() => { void load(); }, [accessToken]);

  if (state.status === 'loading') return <AccessoryState status="loading" title="Loading your cart" />;
  if (state.status === 'error' || !state.cart) return <AccessoryState status="error" title="Cart unavailable" message={state.error} actionLabel="Try again" onAction={() => void load()} />;

  const update = async (variantId, quantity, remove = false) => {
    if (updateLockRef.current) return;
    if (!state.orderingEnabled) return;
    updateLockRef.current = true;
    setState((current) => ({ ...current, busyVariantId: variantId, error: '' }));
    try {
      const cart = remove
        ? await deleteAccessoryCartItem({ accessToken, version: state.cart.version, variantId })
        : await patchAccessoryCartItem({ accessToken, version: state.cart.version, variantId, quantity });
      const normalizedCart = normalizeAccessoryCart(cart);
      if (!normalizedCart) throw new Error('The updated cart information is incomplete.');
      setState((current) => ({ ...current, status: 'ready', cart: normalizedCart, error: '', busyVariantId: '' }));
    } catch (error) {
      try {
        const freshCart = normalizeAccessoryCart(await getAccessoryCart({ accessToken }));
        if (!freshCart) throw new Error('Cart refresh returned incomplete information.');
        setState((current) => ({ ...current,
          status: 'ready',
          cart: freshCart,
          busyVariantId: '',
          error: error?.status === 409
            ? 'Your cart changed in another request. The latest quantities are shown below; review them before continuing.'
            : error?.message || 'The cart action failed. The latest cart is shown below.',
        }));
      } catch (refreshError) {
        setState({ status: 'error', cart: null, busyVariantId: '', error: refreshError?.message || 'The cart could not be refreshed.' });
      }
    } finally {
      updateLockRef.current = false;
    }
  };

  return <AccessoryCartView cart={state.cart} orderingEnabled={state.orderingEnabled} busyVariantId={state.busyVariantId} error={state.error} onBack={() => navigation.goBack()} onQuantity={(id, quantity) => void update(id, quantity)} onRemove={(id) => void update(id, 0, true)} onRefresh={() => void load()} onCheckout={() => navigation.navigate('AccessoryCheckout')} />;
}
