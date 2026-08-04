import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../../theme';

const sizeMap = {
  sm: { box: 44, icon: 16 },
  md: { box: 44, icon: 18 },
  lg: { box: 48, icon: 22 },
};

export default function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}) {
  const { colors, radius } = useTheme();
  const dim = sizeMap[size] ?? sizeMap.md;

  const bg =
    variant === 'primary'
      ? colors.brand.orange
      : variant === 'subtle'
      ? colors.surface.raised
      : 'transparent';
  const border =
    variant === 'subtle'
      ? colors.surface.border
      : variant === 'ghost'
      ? colors.surface.borderSoft
      : 'transparent';
  const fg = variant === 'primary' ? colors.ink.onBrand : colors.ink.primary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim.box,
          height: dim.box,
          borderRadius: radius.md,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Feather name={icon} size={dim.icon} color={fg} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
