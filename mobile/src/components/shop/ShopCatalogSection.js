import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, radius } from '../../theme';

const SORT_OPTIONS = ['Newest', 'Price: Low to High', 'Price: High to Low', 'Name A-Z'];

function sortProducts(products, sortBy) {
  return [...products].sort((left, right) => {
    if (sortBy === 'Price: Low to High') {
      return left.priceCents - right.priceCents;
    }

    if (sortBy === 'Price: High to Low') {
      return right.priceCents - left.priceCents;
    }

    if (sortBy === 'Name A-Z') {
      return left.name.localeCompare(right.name);
    }

    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}

function ProductCard({ product, onOpenProduct, isWideLayout = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onOpenProduct?.(product)}
      style={[styles.card, isWideLayout && styles.cardWide]}
    >
      <View style={styles.imageWrap}>
        <View style={styles.imagePlaceholder}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={34}
            color={colors.primary}
          />
        </View>
      </View>

      <Text style={styles.categoryLabel}>{product.categoryName}</Text>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.meta}>SKU {product.sku}</Text>
      <Text numberOfLines={2} style={styles.description}>
        {product.descriptionPreview}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.priceWrap}>
          <Text style={styles.price}>{product.priceLabel}</Text>
          <Text style={styles.updatedLabel}>Updated {product.updatedLabel}</Text>
        </View>

        <View style={styles.detailBadge}>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.labelText} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ShopCatalogSection({
  status = 'idle',
  categories = [],
  products = [],
  errorMessage = '',
  cartCount = 0,
  onOpenProduct,
  onOpenCart,
  onRefresh,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isCompactLayout = windowWidth < 390;
  const isWideLayout = windowWidth >= 430;
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);

  const categoryOptions = useMemo(() => {
    const labels = categories
      .map((category) => String(category?.name ?? category?.label ?? '').trim())
      .filter(Boolean);

    return ['All', ...new Set(labels)];
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleProducts = products
      .filter((product) => activeCategory === 'All' || product.categoryName === activeCategory)
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.sku.toLowerCase().includes(normalizedQuery) ||
          product.categoryName.toLowerCase().includes(normalizedQuery)
        );
      });

    return sortProducts(visibleProducts, sortBy);
  }, [activeCategory, products, query, sortBy]);

  const showLoadingState = (status === 'loading' || status === 'idle') && products.length === 0;
  const showServiceErrorState = status === 'error';
  const showCatalogEmptyState = status === 'empty';
  const showFilterEmptyState =
    !showLoadingState &&
    !showServiceErrorState &&
    !showCatalogEmptyState &&
    filteredProducts.length === 0;

  return (
    <View style={styles.section}>
      <View style={[styles.header, isCompactLayout && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CRUISERS CRIB</Text>
          <Text style={styles.title}>Auto Shop</Text>
          <Text style={[styles.subtitle, isCompactLayout && styles.subtitleCompact]}>
            Browse the live catalog, then open your cart to review invoice checkout.
          </Text>
        </View>

        <View style={[styles.headerActions, isCompactLayout && styles.headerActionsCompact]}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <MaterialCommunityIcons
              name={status === 'loading' ? 'timer-sand' : 'refresh'}
              size={20}
              color={colors.labelText}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={onOpenCart}
            style={styles.cartButton}
          >
            <MaterialCommunityIcons name="cart-outline" size={20} color={colors.labelText} />
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedText} />
        <TextInput
          accessibilityLabel="Search catalog products"
          onChangeText={setQuery}
          placeholder="Search products, SKU, or category"
          placeholderTextColor={colors.mutedText}
          selectionColor={colors.primary}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.categoryRow}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroller}
      >
        {categoryOptions.map((category) => (
          <TouchableOpacity
            key={category}
            activeOpacity={0.86}
            onPress={() => setActiveCategory(category)}
            style={[
              styles.categoryChip,
              activeCategory === category && styles.categoryChipActive,
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.toolbar, isCompactLayout && styles.toolbarCompact]}>
        <Text style={styles.productCount}>
          {products.length} live product{products.length === 1 ? '' : 's'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => setIsSortMenuVisible((current) => !current)}
          style={[styles.sortButton, isCompactLayout && styles.sortButtonCompact]}
        >
          <MaterialCommunityIcons name="swap-vertical" size={16} color={colors.labelText} />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {isSortMenuVisible ? (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              activeOpacity={0.86}
              onPress={() => {
                setSortBy(option);
                setIsSortMenuVisible(false);
              }}
              style={styles.sortOption}
            >
              <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {showLoadingState ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateTitle}>Loading catalog</Text>
          <Text style={styles.stateText}>
            Pulling categories and active products from ecommerce-service.
          </Text>
        </View>
      ) : null}

      {showServiceErrorState ? (
        <View style={styles.stateCard}>
          <MaterialCommunityIcons name="server-network-off" size={34} color="#FFB86B" />
          <Text style={styles.stateTitle}>Catalog service unavailable</Text>
          <Text style={styles.stateText}>
            {errorMessage || 'Start ecommerce-service on port 3001, then refresh the catalog.'}
          </Text>
          <TouchableOpacity activeOpacity={0.86} onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry catalog</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showCatalogEmptyState ? (
        <View style={styles.stateCard}>
          <MaterialCommunityIcons name="package-variant-closed" size={34} color={colors.border} />
          <Text style={styles.stateTitle}>Catalog is empty</Text>
          <Text style={styles.stateText}>
            Staff have not published any active ecommerce products yet.
          </Text>
        </View>
      ) : null}

      {!showLoadingState && !showServiceErrorState && !showCatalogEmptyState ? (
        <View style={[styles.grid, isWideLayout && styles.gridWide]}>
          {showFilterEmptyState ? (
            <View style={styles.stateCard}>
              <MaterialCommunityIcons name="magnify-close" size={34} color={colors.border} />
              <Text style={styles.stateTitle}>No matching products</Text>
              <Text style={styles.stateText}>
                Try a different search term or switch to another category.
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWideLayout={isWideLayout}
                onOpenProduct={onOpenProduct}
              />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerCompact: {
    flexWrap: 'wrap',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerActionsCompact: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  eyebrow: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 240,
  },
  subtitleCompact: {
    maxWidth: '100%',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  cartButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  cartBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  cartBadgeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
  },
  categoryScroller: {
    marginHorizontal: -4,
  },
  categoryRow: {
    gap: 10,
    paddingHorizontal: 4,
  },
  categoryChip: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.onPrimary,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolbarCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCount: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  sortButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButtonCompact: {
    alignSelf: 'flex-start',
  },
  sortButtonText: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
  },
  sortMenu: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sortOptionText: {
    color: colors.labelText,
    fontSize: 14,
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: colors.primary,
  },
  grid: {
    gap: 14,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexShrink: 1,
    overflow: 'hidden',
    padding: 14,
  },
  cardWide: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  imageWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 148,
    marginBottom: 14,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  categoryLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: colors.labelText,
    fontSize: 13,
    marginTop: 6,
  },
  description: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  priceWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  price: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  updatedLabel: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 4,
  },
  detailBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
});
