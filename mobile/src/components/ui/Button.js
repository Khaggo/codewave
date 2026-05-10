import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const sizeMap = {
  sm: { minHeight: 36, paddingHorizontal: 14, fontSize: 13, iconSize: 16, gap: 6 },
  md: { minHeight: 44, paddingHorizontal: 18, fontSize: 14, iconSize: 18, gap: 8 },
  lg: { minHeight: 52, paddingHorizontal: 22, fontSize: 15, iconSize: 20, gap: 10 },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}) {
  const { colors, radius, type } = useTheme();
  const dim = sizeMap[size] ?? sizeMap.md;

  const bg = (() => {
    if (variant === 'primary') return colors.brand.orange;
    if (variant === 'danger') return colors.semantic.danger;
    if (variant === 'ghost') return 'transparent';
    if (variant === 'subtle') return colors.surface.raised;
    if (variant === 'link') return 'transparent';
    return colors.brand.orange;
  })();

  const borderColor = (() => {
    if (variant === 'ghost') return colors.surface.border;
    if (variant === 'subtle') return colors.surface.border;
    return 'transparent';
  })();

  const fg = (() => {
    if (variant === 'primary') return colors.ink.onBrand;
    if (variant === 'danger') return colors.ink.onBrand;
    if (variant === 'ghost') return colors.ink.primary;
    if (variant === 'subtle') return colors.ink.primary;
    if (variant === 'link') return colors.brand.orange;
    return colors.ink.onBrand;
  })();

  return (
    <Pressable
      testID={testID}
      onPress={loading || disabled ? undefined : onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: radius.md,
          minHeight: dim.minHeight,
          paddingHorizontal: variant === 'link' ? 0 : dim.paddingHorizontal,
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={[styles.row, { gap: dim.gap }]}>
          {leftIcon ? <Feather name={leftIcon} size={dim.iconSize} color={fg} /> : null}
          {label ? (
            <Text
              style={[
                type.button,
                { color: fg, fontSize: dim.fontSize },
                variant === 'link' && styles.linkText,
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ) : null}
          {rightIcon ? <Feather name={rightIcon} size={dim.iconSize} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
