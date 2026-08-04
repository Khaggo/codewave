import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';
import { formatAccessoryMoney, getAccessoryMediaSource } from '../../lib/accessoriesClient';

export function AccessoryScreenHeader({ title, subtitle, onBack, actions = [] }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.iconButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions.map((action) => (
          <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={styles.iconButton}>
            <MaterialCommunityIcons name={action.icon} size={21} color={colors.text} />
            {action.badge > 0 ? <Text style={styles.badge}>{action.badge}</Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AccessoryState({ status, title, message, actionLabel, onAction }) {
  if (status === 'loading') {
    return (
      <View style={styles.state} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateTitle}>{title || 'Loading accessories'}</Text>
        <Text style={styles.stateMessage}>{message || 'Please wait a moment.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.state} accessibilityLiveRegion={status === 'error' ? 'assertive' : 'polite'}>
      <MaterialCommunityIcons name={status === 'error' ? 'alert-circle-outline' : 'shopping-outline'} size={34} color={status === 'error' ? colors.danger : colors.primary} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel ? <AccessoryPrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function AccessoryProductRow({ row, accessToken, onPress }) {
  const product = row?.product ?? row;
  const category = row?.category;
  const media = row?.media?.[0] ?? product?.media?.[0] ?? null;
  const startingPrice = row?.startingPriceCents ?? product?.startingPriceCents;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${product?.name ?? 'accessory'}`} onPress={onPress} style={({ pressed }) => [styles.productRow, pressed && styles.pressed]}>
      {media?.id ? (
        <Image source={getAccessoryMediaSource(media.id, accessToken)} style={styles.productImage} accessibilityLabel={media.altText || product?.name || 'Accessory product'} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <MaterialCommunityIcons name="car-light-high" size={28} color={colors.mutedText} />
        </View>
      )}
      <View style={styles.productCopy}>
        <Text numberOfLines={1} style={styles.productName}>{product?.name || 'Accessory'}</Text>
        <Text numberOfLines={1} style={styles.productMeta}>{category?.name || 'Vehicle accessory'}</Text>
        {startingPrice != null ? <Text style={styles.productPrice}>{formatAccessoryMoney(startingPrice)}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mutedText} />
    </Pressable>
  );
}

export function AccessoryStatusPill({ status }) {
  const normalized = String(status || 'pending').replaceAll('_', ' ');
  const positive = ['paid', 'ready for pickup', 'collected', 'active'].includes(normalized);
  const negative = ['cancelled', 'expired', 'payment exception', 'refunded'].includes(normalized);
  return (
    <View style={[styles.pill, positive && styles.pillPositive, negative && styles.pillNegative]}>
      <Text style={styles.pillText}>{normalized}</Text>
    </View>
  );
}

export function AccessoryPrimaryButton({ label, accessibilityLabel, accessibilityHint, onPress, disabled, busy, secondary = false }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.primaryButton, secondary && styles.secondaryButton, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator size="small" color={secondary ? colors.text : '#FFFFFF'} /> : null}
      <Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

export const accessoryStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  section: { gap: 10, paddingVertical: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  body: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.text, paddingHorizontal: 14, backgroundColor: colors.surface },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 14, gap: 8, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { color: colors.mutedText, fontSize: 13, fontWeight: '700' },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  success: { color: colors.success ?? '#34D399', fontSize: 14, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: colors.background },
  headerTop: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.mutedText, fontSize: 13, marginTop: 2 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', right: 1, top: 1, minWidth: 18, height: 18, borderRadius: 9, color: '#FFFFFF', backgroundColor: colors.primary, fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
  state: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  stateTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateMessage: { color: colors.mutedText, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  productRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  productImage: { width: 72, height: 72, borderRadius: 6, backgroundColor: colors.surface },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productCopy: { flex: 1, minWidth: 0, gap: 4 },
  productName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  productMeta: { color: colors.mutedText, fontSize: 13 },
  productPrice: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  primaryButton: { minHeight: 48, borderRadius: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.text },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.78 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface },
  pillPositive: { backgroundColor: 'rgba(16, 185, 129, 0.18)' },
  pillNegative: { backgroundColor: 'rgba(239, 68, 68, 0.18)' },
  pillText: { color: colors.text, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
});
