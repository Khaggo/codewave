import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const sizeMap = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 18 },
  lg: { box: 48, icon: 22 },
};

export default function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  accessibilityLabel,
  style,
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
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
      <Feather name={icon} size={dim.icon} color={fg} />
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
