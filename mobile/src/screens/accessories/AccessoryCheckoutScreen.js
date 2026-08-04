import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  createAccessoryCheckout,
  createAccessoryRequestKey,
  formatAccessoryMoney,
  getAccessoryCapabilities,
  getAccessoryCart,
  getAccessoryFitment,
  previewAccessoryCheckout,
} from '../../lib/accessoriesClient';
import { AccessoryPrimaryButton, AccessoryScreenHeader, AccessoryState, accessoryStyles } from './AccessoriesComponents';
import {
  getUnacknowledgedFitments,
  isAccessoryOrderingEnabled,
  normalizeAccessoryCart,
  normalizeCheckoutFitments,
  validateAccessoryCheckoutContact,
} from './accessoriesViewModel.mjs';

const contactFromAccount = (account) => ({
  name: [account?.firstName ?? account?.profile?.firstName, account?.lastName ?? account?.profile?.lastName].filter(Boolean).join(' ') || 'Customer',
  phone: account?.phoneNumber ?? account?.profile?.phone ?? '',
  email: account?.email ?? '',
});

export function AccessoryCheckoutView({ cart, preview, previewStatus = preview ? 'ready' : 'idle', previewError = '', fitments = [], contact, contactErrors = {}, paymentMethod, acknowledgements = [], busy, error, onBack, onContactChange, onPaymentMethod, onAcknowledgement, onRetryPreview, onSubmit }) {
  const unverified = fitments.filter((entry) => entry.status === 'unverified');
  const missingAcknowledgements = getUnacknowledgedFitments(fitments, acknowledgements);
  const hasContactErrors = Object.keys(contactErrors).length > 0;
  return (
    <View style={accessoryStyles.screen}>
      <AccessoryScreenHeader title="Checkout" subtitle="Single-shop pickup only" onBack={onBack} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={accessoryStyles.content}>
        <View style={accessoryStyles.section}>
          <Text style={accessoryStyles.sectionTitle}>Pickup contact</Text>
          {['name', 'phone', 'email'].map((field) => <View key={field} style={{ gap: 5 }}><Text style={accessoryStyles.label}>{field === 'name' ? 'Full name' : field.charAt(0).toUpperCase() + field.slice(1)}</Text><TextInput accessibilityLabel={`Pickup ${field}`} accessibilityHint={contactErrors[field] || undefined} autoCapitalize={field === 'email' ? 'none' : 'words'} keyboardType={field === 'phone' ? 'phone-pad' : field === 'email' ? 'email-address' : 'default'} value={contact[field]} onChangeText={(value) => onContactChange(field, value)} style={[accessoryStyles.input, contactErrors[field] && { borderColor: '#DC2626' }]} />{contactErrors[field] ? <Text accessibilityLiveRegion="polite" style={accessoryStyles.error}>{contactErrors[field]}</Text> : null}</View>)}
        </View>

        <View style={accessoryStyles.section}>
          <Text style={accessoryStyles.sectionTitle}>Payment</Text>
          {[['paymongo', 'Pay securely with PayMongo', 'Stock is reserved for 15 minutes.'], ['pay_at_shop', 'Pay at the shop', 'Stock is reserved for 24 hours until preparation starts.']].map(([value, label, hint]) => {
            const selected = paymentMethod === value;
            return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onPaymentMethod(value)} style={[accessoryStyles.card, selected && { borderColor: '#F58220' }]}><Text style={accessoryStyles.value}>{label}</Text><Text style={accessoryStyles.body}>{hint}</Text></Pressable>;
          })}
        </View>

        {unverified.length ? <View style={accessoryStyles.section}><Text style={accessoryStyles.sectionTitle}>Fitment acknowledgement</Text>{unverified.map((entry) => { const checked = acknowledgements.includes(entry.variantId); return <Pressable key={entry.variantId} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onAcknowledgement(entry.variantId)} style={accessoryStyles.card}><Text style={accessoryStyles.value}>{checked ? '[x]' : '[ ]'} Fitment is unverified</Text><Text style={accessoryStyles.body}>I understand this accessory has not been verified for my selected vehicle and I will confirm fit before use.</Text></Pressable>; })}</View> : null}

        <View style={accessoryStyles.card}>
          <View style={accessoryStyles.spread}><Text style={accessoryStyles.label}>Items</Text><Text style={accessoryStyles.value}>{cart.items.length}</Text></View>
          <View style={accessoryStyles.spread}><Text style={accessoryStyles.sectionTitle}>Verified total</Text><Text style={accessoryStyles.sectionTitle}>{preview ? formatAccessoryMoney(preview.totalCents) : 'Checking...'}</Text></View>
          <Text style={accessoryStyles.body}>Pickup at Cruisers Crib. Bring your order reference and six-digit pickup code.</Text>
        </View>
        {previewError ? <View style={accessoryStyles.section}><Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{previewError}</Text><AccessoryPrimaryButton label="Retry price and stock check" secondary onPress={onRetryPreview} /></View> : null}
        {error ? <Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{error}</Text> : null}
        <AccessoryPrimaryButton label={previewStatus === 'loading' ? 'Checking current price and stock' : paymentMethod === 'paymongo' ? 'Place order and continue to payment' : 'Place pay-at-shop order'} onPress={onSubmit} busy={busy} disabled={missingAcknowledgements.length > 0 || hasContactErrors || previewStatus !== 'ready' || !preview} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function AccessoryCheckoutScreen({ account, navigation }) {
  const accessToken = account?.accessToken;
  const [state, setState] = useState({ status: 'loading', cart: null, fitments: [], error: '' });
  const [previewState, setPreviewState] = useState({ status: 'idle', data: null, error: '' });
  const [previewRequest, setPreviewRequest] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('paymongo');
  const [contact, setContact] = useState(() => contactFromAccount(account));
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [busy, setBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createAccessoryRequestKey);
  const submitLockRef = useRef(false);
  const payload = useMemo(() => ({ paymentMethod, contact, fitmentAcknowledgements: acknowledgements.map((variantId) => ({ variantId, acknowledgedUnverified: true })) }), [paymentMethod, contact, acknowledgements]);
  const contactErrors = useMemo(() => validateAccessoryCheckoutContact(contact), [contact]);

  const load = async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const [rawCart, capabilities] = await Promise.all([
        getAccessoryCart({ accessToken }),
        getAccessoryCapabilities({ accessToken }),
      ]);
      if (!isAccessoryOrderingEnabled(capabilities)) {
        throw new Error('Accessories ordering is not available yet. Your cart remains saved for later.');
      }
      const cart = normalizeAccessoryCart(rawCart);
      if (!cart) throw new Error('The cart information is incomplete. Return to your cart and refresh it.');
      if (!cart.items?.length) throw new Error('Your cart is empty.');
      const loadedFitments = cart.selectedVehicleId ? await Promise.all(cart.items.map(async (row) => ({ variantId: row.item.variantId, ...(await getAccessoryFitment({ variantId: row.item.variantId, vehicleId: cart.selectedVehicleId, accessToken })) }))) : [];
      setState({ status: 'ready', cart, fitments: normalizeCheckoutFitments(cart, loadedFitments), error: '' });
    } catch (error) { setState({ status: 'error', cart: null, fitments: [], error: error?.message || 'Checkout could not be prepared.' }); }
  };
  useEffect(() => { void load(); }, [accessToken]);

  useEffect(() => {
    if (!state.cart || Object.keys(contactErrors).length) {
      setPreviewState({ status: 'idle', data: null, error: '' });
      return;
    }
    let active = true;
    setPreviewState({ status: 'loading', data: null, error: '' });
    const timer = setTimeout(() => {
      previewAccessoryCheckout({ accessToken, payload })
        .then((preview) => { if (active) setPreviewState({ status: 'ready', data: preview, error: '' }); })
        .catch(() => { if (active) setPreviewState({ status: 'error', data: null, error: 'Current price and stock could not be verified. Try the check again before placing your order.' }); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [accessToken, contactErrors, payload, previewRequest, state.cart?.version]);

  useEffect(() => { setIdempotencyKey(createAccessoryRequestKey()); }, [paymentMethod, contact.name, contact.phone, contact.email, acknowledgements.join(',')]);

  if (state.status === 'loading') return <AccessoryState status="loading" title="Preparing checkout" />;
  if (state.status === 'error' || !state.cart) return <AccessoryState status="error" title="Checkout unavailable" message={state.error} actionLabel="Return to cart" onAction={() => navigation.replace('AccessoryCart')} />;

  const submit = async () => {
    if (submitLockRef.current || busy || previewState.status !== 'ready' || !previewState.data || Object.keys(contactErrors).length) return;
    submitLockRef.current = true;
    setBusy(true); setState((current) => ({ ...current, error: '' }));
    let result;
    try {
      result = await createAccessoryCheckout({ accessToken, idempotencyKey, payload });
    } catch (error) {
      setState((current) => ({ ...current, error: error?.message || 'The order could not be placed. Refresh the checkout and try again.' }));
      setBusy(false);
      submitLockRef.current = false;
      return;
    }
    const orderId = result.order?.order?.id ?? result.order?.id;
    let initialMessage = '';
    if (result.payment?.checkoutUrl) {
      try { await Linking.openURL(result.payment.checkoutUrl); }
      catch { initialMessage = 'Your order was placed, but the PayMongo page could not open. Use Retry PayMongo payment from this order.'; }
    }
    setBusy(false);
    submitLockRef.current = false;
    navigation.replace(orderId ? 'AccessoryOrderDetail' : 'AccessoryOrders', orderId ? { orderId, pickupCode: result.pickupCode ?? null, initialMessage } : undefined);
  };

  return <AccessoryCheckoutView cart={state.cart} preview={previewState.data} previewStatus={previewState.status} previewError={previewState.error} fitments={state.fitments} contact={contact} contactErrors={contactErrors} paymentMethod={paymentMethod} acknowledgements={acknowledgements} busy={busy} error={state.error} onBack={() => navigation.goBack()} onContactChange={(field, value) => setContact((current) => ({ ...current, [field]: value }))} onPaymentMethod={setPaymentMethod} onAcknowledgement={(variantId) => setAcknowledgements((current) => current.includes(variantId) ? current.filter((id) => id !== variantId) : [...current, variantId])} onRetryPreview={() => setPreviewRequest((current) => current + 1)} onSubmit={() => void submit()} />;
}
