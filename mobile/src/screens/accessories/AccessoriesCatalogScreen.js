import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  getAccessoryCapabilities,
  getAccessoryCart,
  listAccessoryCategories,
  listAccessoryProducts,
} from '../../lib/accessoriesClient';
import { colors } from '../../theme';
import {
  AccessoryProductRow,
  AccessoryPrimaryButton,
  AccessoryScreenHeader,
  AccessoryState,
  accessoryStyles,
} from './AccessoriesComponents';
import { normalizeAccessoryPage } from './accessoriesViewModel.mjs';

const errorMessage = (error) => error?.message || 'The catalog could not be loaded. Check your connection and try again.';

export function AccessoriesCatalogView({
  accessToken,
  categories,
  products,
  status,
  error,
  search,
  selectedCategoryId,
  cartCount,
  hasMore,
  loadingMore,
  refreshing,
  onSearchChange,
  onSelectCategory,
  onProductPress,
  onCartPress,
  onOrdersPress,
  onRetry,
  onRefresh,
  onLoadMore,
}) {
  if (status === 'loading') return <AccessoryState status="loading" />;
  if (status === 'error') return <AccessoryState status="error" title="Accessories unavailable" message={error} actionLabel="Try again" onAction={onRetry} />;

  return (
    <View style={accessoryStyles.screen}>
      <AccessoryScreenHeader
        title="Accessories"
        subtitle="Vehicle accessories for pickup at Cruisers Crib"
        actions={[
          { label: 'My accessory orders', icon: 'receipt-text-outline', onPress: onOrdersPress },
          { label: 'Accessory cart', icon: 'cart-outline', badge: cartCount, onPress: onCartPress },
        ]}
      />
      <FlatList
        data={products}
        keyExtractor={(row) => row.product?.id ?? row.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.filters}>
            <TextInput
              accessibilityLabel="Search accessories"
              placeholder="Search lights, decals, interior accessories"
              placeholderTextColor={colors.mutedText}
              value={search}
              onChangeText={onSearchChange}
              style={accessoryStyles.input}
              returnKeyType="search"
            />
            <FlatList
              horizontal
              data={[{ id: '', name: 'All' }, ...categories]}
              keyExtractor={(category) => category.id || 'all'}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item }) => {
                const selected = selectedCategoryId === item.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onSelectCategory(item.id)}
                    style={[styles.categoryButton, selected && styles.categoryButtonSelected]}
                  >
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <AccessoryProductRow row={item} accessToken={accessToken} onPress={() => onProductPress(item.product ?? item)} />
        )}
        ListEmptyComponent={<AccessoryState status="empty" title="No matching accessories" message="Try another search or category." />}
        ListFooterComponent={loadingMore ? <AccessoryState status="loading" title="Loading more" message="" /> : error ? <View style={accessoryStyles.section}><Text accessibilityLiveRegion="assertive" style={accessoryStyles.error}>{error}</Text><AccessoryPrimaryButton label="Retry loading more" secondary onPress={onLoadMore} /></View> : null}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.35}
      />
    </View>
  );
}

export default function AccessoriesCatalogScreen({ account, navigation }) {
  const accessToken = account?.accessToken;
  const [state, setState] = useState({ status: 'loading', error: '', categories: [], products: [], nextCursor: null });
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async ({ append = false, refresh = false } = {}) => {
    const requestId = ++requestRef.current;
    if (append) setLoadingMore(true);
    else if (refresh) setRefreshing(true);
    else setState((current) => ({ ...current, status: 'loading', error: '' }));
    try {
      const [capabilities, categories, page, cart] = await Promise.all([
        getAccessoryCapabilities({ accessToken }),
        listAccessoryCategories({ accessToken }),
        listAccessoryProducts({ accessToken, cursor: append ? state.nextCursor : null, search, categoryId: selectedCategoryId }),
        getAccessoryCart({ accessToken }),
      ]);
      if (requestRef.current !== requestId) return;
      if (!capabilities.catalogVisible) throw new Error('The Accessories catalog is not available yet.');
      const normalizedPage = normalizeAccessoryPage(
        page,
        20,
        (row) => Boolean((row?.product ?? row)?.id && (row?.product ?? row)?.slug),
      );
      setState((current) => ({ status: 'ready', error: '', categories: Array.isArray(categories) ? categories : [], products: append ? [...current.products, ...normalizedPage.items] : normalizedPage.items, nextCursor: normalizedPage.nextCursor }));
      setCartCount((cart?.items ?? []).reduce((total, row) => total + Number(row.item?.quantity ?? 0), 0));
    } catch (error) {
      if (requestRef.current === requestId) {
        setState((current) => ({ ...current, status: append ? 'ready' : 'error', error: errorMessage(error) }));
      }
    } finally {
      if (requestRef.current === requestId) { setRefreshing(false); setLoadingMore(false); }
    }
  }, [accessToken, search, selectedCategoryId, state.nextCursor]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 300);
    return () => { clearTimeout(timer); requestRef.current += 1; };
  }, [search, selectedCategoryId, accessToken]);

  return (
    <AccessoriesCatalogView
      accessToken={accessToken}
      categories={state.categories}
      products={state.products}
      status={state.status}
      error={state.error}
      search={search}
      selectedCategoryId={selectedCategoryId}
      cartCount={cartCount}
      hasMore={Boolean(state.nextCursor)}
      loadingMore={loadingMore}
      refreshing={refreshing}
      onSearchChange={setSearch}
      onSelectCategory={setSelectedCategoryId}
      onProductPress={(product) => navigation.navigate('AccessoryProduct', { slug: product.slug })}
      onCartPress={() => navigation.navigate('AccessoryCart')}
      onOrdersPress={() => navigation.navigate('AccessoryOrders')}
      onRetry={() => void load()}
      onRefresh={() => void load({ refresh: true })}
      onLoadMore={() => !loadingMore && state.nextCursor && void load({ append: true })}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 36, flexGrow: 1 },
  filters: { gap: 10, paddingBottom: 6 },
  categoryList: { gap: 8, paddingVertical: 4 },
  categoryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  categoryText: { color: colors.text, fontWeight: '700' },
  categoryTextSelected: { color: '#FFFFFF' },
});
