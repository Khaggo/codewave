import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

const sizeMap = { sm: 32, md: 40, lg: 56, xl: 72 };

export default function Avatar({ name = '', uri, size = 'md', style }) {
  const { colors, type } = useTheme();
  const dim = typeof size === 'number' ? size : sizeMap[size] ?? sizeMap.md;
  const initials = String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: colors.brand.orangeSoft,
          borderColor: colors.surface.border,
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
      ) : (
        <Text
          style={[
            type.bodyStrong,
            { color: colors.brand.orange, fontSize: Math.max(11, dim * 0.36) },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
});
