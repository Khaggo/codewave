import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius } from '../../theme';

const SORT_OPTIONS = ['Newest', 'Price: Low to High', 'Price: High to Low', 'Name A-Z'];

function getProductKey(product) {
  return product.key ?? product.id;
}

function sortProducts(products, sortBy) {
  return [...products].sort((left, right) => {
    if (sortBy === 'Price: Low to High') {
      return left.price - right.price;
    }

    if (sortBy === 'Price: High to Low') {
      return right.price - left.price;
    }

    if (sortBy === 'Name A-Z') {
      return left.name.localeCompare(right.name);
    }

    return new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime();
  });
}

function getAvailabilityLabel(product) {
  if (product.stock === 0) {
    return 'Out of Stock';
  }

  if (product.stock < 10) {
    return 'Low Stock';
  }

  return `${product.stock} in stock`;
}

export default function ShopCatalogSection({
  products,
  cartItems = {},
  onAddToCart,
  onOpenCart,
  onOpenProduct,
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);

  const categories = useMemo(
    () => ['All', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleProducts = products
      .filter((product) => activeCategory === 'All' || product.category === activeCategory)
      .filter((product) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          product.name.toLowerCase().includes(normalizedQuery) ||
          String(product.brand || '').toLowerCase().includes(normalizedQuery)
        );
      });

    return sortProducts(visibleProducts, sortBy);
  }, [activeCategory, products, query, sortBy]);

  const cartCount = Object.values(cartItems).reduce(
    (sum, item) => sum + Number(item?.quantity || 0),
    0,
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CRUISERS CRIB</Text>
          <Text style={styles.title}>Auto Shop</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.86}
          onPress={onOpenCart}
          style={styles.cartButton}
        >
          <MaterialCommunityIcons name="cart-outline" size={22} color={colors.labelText} />
          {cartCount > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedText} />
        <TextInput
          accessibilityLabel="Search products"
          onChangeText={setQuery}
          placeholder="Search products"
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
        {categories.map((category) => (
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

      <View style={styles.toolbar}>
        <Text style={styles.productCount}>
          {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => setIsSortMenuVisible((current) => !current)}
          style={styles.sortButton}
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

      <View style={styles.grid}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const productKey = getProductKey(product);
            const quantity = cartItems[productKey]?.quantity || 0;
            const isOutOfStock = product.stock === 0;
            const availabilityLabel = getAvailabilityLabel(product);

            return (
              <View key={productKey} style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => onOpenProduct?.(product)}
                  style={styles.cardPressable}
                >
                  <View style={styles.imageWrap}>
                    {product.image ? (
                      <Image source={{ uri: product.image }} style={styles.image} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialCommunityIcons name="package-variant-closed" size={28} color={colors.mutedText} />
                      </View>
                    )}
                  </View>

                  <Text style={styles.brand}>{product.brand || product.category}</Text>
                  <Text style={styles.name} testID="mobile-shop-title">
                    {product.name}
                  </Text>
                  <Text style={styles.meta}>{product.category}</Text>
                  <Text
                    style={[
                      styles.availability,
                      isOutOfStock && styles.availabilityOutOfStock,
                    ]}
                  >
                    {availabilityLabel}
                  </Text>
                  <Text style={styles.price}>PHP {product.price.toLocaleString()}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.88}
                  disabled={isOutOfStock}
                  onPress={() => onAddToCart?.(product)}
                  style={[
                    styles.addButton,
                    isOutOfStock && styles.addButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.addButtonText,
                      isOutOfStock && styles.addButtonTextDisabled,
                    ]}
                  >
                    {isOutOfStock
                      ? 'Out of Stock'
                      : quantity > 0
                        ? `Add Another (${quantity})`
                        : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={34} color={colors.border} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try a different search or switch categories.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  cartButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
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
  card: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardPressable: {
    padding: 14,
  },
  imageWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 168,
    marginBottom: 14,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  brand: {
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
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 6,
  },
  availability: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  availabilityOutOfStock: {
    color: '#FF8D8D',
  },
  price: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  addButtonDisabled: {
    backgroundColor: colors.surface,
  },
  addButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  addButtonTextDisabled: {
    color: colors.mutedText,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
  },
});
