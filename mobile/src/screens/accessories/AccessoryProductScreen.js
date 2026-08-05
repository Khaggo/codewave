import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  formatAccessoryMoney,
  getAccessoryCapabilities,
  getAccessoryCart,
  getAccessoryFitment,
  getAccessoryMediaSource,
  getAccessoryProduct,
  patchAccessoryCartItem,
  replaceAccessoryCart,
} from '../../lib/accessoriesClient';
import { getCustomerVehicleReference } from '../../lib/vehicleReference.mjs';
import { colors } from '../../theme';
import { AccessoryPrimaryButton, AccessoryScreenHeader, AccessoryState, AccessoryStatusPill, accessoryStyles } from './AccessoriesComponents';
import { isAccessoryOrderingEnabled, normalizeAccessoryProductDetail } from './accessoriesViewModel.mjs';

const availableUnits = (row) => Math.max(0, Number(row?.inventory?.availableQuantity ?? 0));

export function AccessoryProductView({ productDetail, orderingEnabled = true, selectedVariantId, selectedVehicleId, vehicles, fitment, fitmentLoading, fitmentError, busy, message, error, accessToken, onBack, onSelectVariant, onSelectVehicle, onRetryFitment, onAddToCart, onOpenCart }) {
  const product = productDetail.product;
  const selectedVariant = productDetail.variants.find((row) => row.variant.id === selectedVariantId) ?? productDetail.variants[0];
  const stock = availableUnits(selectedVariant);
  const blocked = !orderingEnabled || fitment?.status === 'incompatible' || stock < 1 || fitmentLoading || Boolean(fitmentError);
  const media = productDetail.media?.[0];

  return (
    <View style={accessoryStyles.screen}>
      <AccessoryScreenHeader title={product.name} subtitle={productDetail.category?.name} onBack={onBack} actions={[{ label: 'Open cart', icon: 'cart-outline', onPress: onOpenCart }]} />
      <ScrollView contentContainerStyle={accessoryStyles.content}>
        {media?.id ? <Image source={getAccessoryMediaSource(media.id, accessToken)} style={styles.heroImage} accessibilityLabel={media.altText || product.name} /> : <View style={[styles.heroImage, styles.placeholder]}><Text style={styles.placeholderText}>Product image will appear here</Text></View>}
        <Text style={accessoryStyles.body}>{product.description || 'A vehicle accessory available for shop pickup.'}</Text>

        <View style={accessoryStyles.section}>
          <Text style={accessoryStyles.sectionTitle}>Choose a variant</Text>
          {productDetail.variants.map((row) => {
            const selected = row.variant.id === selectedVariant?.variant.id;
            return (
              <Pressable key={row.variant.id} accessibilityRole="radio" accessibilityState={{ selected, disabled: availableUnits(row) < 1 }} disabled={availableUnits(row) < 1} onPress={() => onSelectVariant(row.variant.id)} style={[accessoryStyles.card, selected && styles.selectedCard, availableUnits(row) < 1 && styles.disabledCard]}>
                <View style={accessoryStyles.spread}><Text style={accessoryStyles.value}>{row.variant.name}</Text><Text style={styles.price}>{formatAccessoryMoney(row.variant.priceCents)}</Text></View>
                <Text style={accessoryStyles.body}>{availableUnits(row) > 0 ? `${availableUnits(row)} available` : 'Out of stock'}</Text>
              </Pressable>
            );
          })}
        </View>

        {vehicles.length ? (
          <View style={accessoryStyles.section}>
            <Text style={accessoryStyles.sectionTitle}>Check your vehicle</Text>
            {vehicles.map((vehicle) => {
              const selected = vehicle.id === selectedVehicleId;
              const label = vehicle.displayName || [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
              return <Pressable key={vehicle.id} accessibilityRole="radio" accessibilityLabel={`Select ${label || 'vehicle'}, reference ${getCustomerVehicleReference(vehicle)}`} accessibilityState={{ selected }} onPress={() => onSelectVehicle(vehicle.id)} style={[accessoryStyles.card, selected && styles.selectedCard]}><Text style={accessoryStyles.value}>{label || 'Vehicle'}</Text><Text style={accessoryStyles.body}>{getCustomerVehicleReference(vehicle)} - {vehicle.plateNumber || 'No plate recorded'}</Text></Pressable>;
            })}
            {fitment ? <View style={styles.fitment}><AccessoryStatusPill status={fitment.status} /><Text style={accessoryStyles.body}>{fitment.status === 'incompatible' ? 'This verified combination cannot be ordered.' : fitment.status === 'unverified' ? 'Fitment is not verified. You will acknowledge this before checkout.' : 'This accessory can be ordered for the selected vehicle.'}</Text></View> : null}
            {fitmentLoading ? <Text accessibilityLiveRegion="polite" style={accessoryStyles.body}>Checking compatibility...</Text> : null}
            {fitmentError ? <View style={styles.fitment}><Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{fitmentError}</Text><AccessoryPrimaryButton label="Retry compatibility check" secondary onPress={onRetryFitment} /></View> : null}
          </View>
        ) : null}

        {error ? <Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={accessoryStyles.success}>{message}</Text> : null}
        {!orderingEnabled ? <Text accessibilityLiveRegion="polite" style={accessoryStyles.body}>Accessories are available for browsing. Ordering has not opened yet.</Text> : null}
        <AccessoryPrimaryButton label={!orderingEnabled ? 'Ordering not available yet' : stock < 1 ? 'Out of stock' : fitment?.status === 'incompatible' ? 'Not compatible' : fitmentLoading ? 'Checking compatibility' : fitmentError ? 'Compatibility check required' : 'Add to cart'} onPress={onAddToCart} disabled={blocked} busy={busy} />
      </ScrollView>
    </View>
  );
}

export default function AccessoryProductScreen({ account, navigation, route }) {
  const [state, setState] = useState({ status: 'loading', detail: null, orderingEnabled: false, error: '' });
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const vehicles = useMemo(() => account?.ownedVehicles ?? [], [account?.ownedVehicles]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(route.params?.vehicleId || account?.primaryVehicleId || vehicles[0]?.id || '');
  const [fitment, setFitment] = useState(null);
  const [fitmentLoading, setFitmentLoading] = useState(false);
  const [fitmentError, setFitmentError] = useState('');
  const [fitmentRequest, setFitmentRequest] = useState(0);
  const [action, setAction] = useState({ busy: false, error: '', message: '' });
  const actionLockRef = useRef(false);
  const accessToken = account?.accessToken;

  const load = async () => {
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const [rawDetail, capabilities] = await Promise.all([
        getAccessoryProduct({ slug: route.params?.slug, accessToken }),
        getAccessoryCapabilities({ accessToken }),
      ]);
      const detail = normalizeAccessoryProductDetail(rawDetail);
      if (!detail) throw new Error('The product information is incomplete. Refresh and try again.');
      setState({ status: 'ready', detail, orderingEnabled: isAccessoryOrderingEnabled(capabilities), error: '' });
      setSelectedVariantId((current) => current || detail.variants?.[0]?.variant?.id || '');
    } catch (error) {
      setState({ status: 'error', detail: null, orderingEnabled: false, error: error?.message || 'The product could not be loaded.' });
    }
  };

  useEffect(() => { void load(); }, [route.params?.slug, accessToken]);

  useEffect(() => {
    let active = true;
    if (!selectedVariantId || !selectedVehicleId) {
      setFitment(null);
      setFitmentLoading(false);
      setFitmentError('');
      return () => { active = false; };
    }
    setFitment(null);
    setFitmentLoading(true);
    setFitmentError('');
    getAccessoryFitment({ variantId: selectedVariantId, vehicleId: selectedVehicleId, accessToken })
      .then((result) => { if (active) setFitment(result); })
      .catch(() => { if (active) setFitmentError('Compatibility could not be checked. Try again before adding this item.'); })
      .finally(() => { if (active) setFitmentLoading(false); });
    return () => { active = false; };
  }, [selectedVariantId, selectedVehicleId, accessToken, fitmentRequest]);

  if (state.status === 'loading') return <AccessoryState status="loading" title="Loading product" />;
  if (state.status === 'error' || !state.detail) return <AccessoryState status="error" title="Product unavailable" message={state.error} actionLabel="Try again" onAction={() => void load()} />;

  const addToCart = async () => {
    if (actionLockRef.current) return;
    if (!state.orderingEnabled) {
      setAction({ busy: false, error: 'Ordering is not available yet. You can continue browsing the catalog.', message: '' });
      return;
    }
    actionLockRef.current = true;
    setAction({ busy: true, error: '', message: '' });
    try {
      if (selectedVehicleId && (!fitment || fitmentLoading || fitmentError)) {
        throw new Error('Complete the compatibility check before adding this item.');
      }
      const cart = await getAccessoryCart({ accessToken });
      const existing = cart.items?.find((row) => row.item?.variantId === selectedVariantId);
      const payload = { accessToken, version: cart.version, variantId: selectedVariantId, quantity: Number(existing?.item?.quantity ?? 0) + 1 };
      if (cart.selectedVehicleId !== selectedVehicleId) {
        const items = (cart.items ?? []).filter((row) => row.item?.variantId !== selectedVariantId).map((row) => ({ variantId: row.item.variantId, quantity: row.item.quantity }));
        items.push({ variantId: selectedVariantId, quantity: payload.quantity });
        await replaceAccessoryCart({ accessToken, version: cart.version, selectedVehicleId: selectedVehicleId || null, items });
      } else {
        await patchAccessoryCartItem(payload);
      }
      setAction({ busy: false, error: '', message: 'Added to your cart.' });
    } catch (error) {
      setAction({ busy: false, error: error?.message || 'The item could not be added. Refresh and try again.', message: '' });
    } finally {
      actionLockRef.current = false;
    }
  };

  return <AccessoryProductView productDetail={state.detail} orderingEnabled={state.orderingEnabled} selectedVariantId={selectedVariantId} selectedVehicleId={selectedVehicleId} vehicles={vehicles} fitment={fitment} fitmentLoading={fitmentLoading} fitmentError={fitmentError} busy={action.busy} message={action.message} error={action.error} accessToken={accessToken} onBack={() => navigation.goBack()} onSelectVariant={(id) => { setSelectedVariantId(id); setAction({ busy: false, error: '', message: '' }); }} onSelectVehicle={setSelectedVehicleId} onRetryFitment={() => setFitmentRequest((current) => current + 1)} onAddToCart={() => void addToCart()} onOpenCart={() => navigation.navigate('AccessoryCart')} />;
}

const styles = StyleSheet.create({
  heroImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: colors.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  placeholderText: { color: colors.mutedText, fontWeight: '700' },
  selectedCard: { borderColor: colors.primary },
  disabledCard: { opacity: 0.48 },
  price: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  fitment: { gap: 8, paddingVertical: 4 },
});
