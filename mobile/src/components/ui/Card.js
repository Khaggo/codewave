import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';

export default function Card({
  children,
  variant = 'default',
  padding = 4,
  onPress,
  style,
  borderless = false,
}) {
  const { colors, radius, spacing, elevation } = useTheme();

  const bg =
    variant === 'raised'
      ? colors.surface.raised
      : variant === 'input'
      ? colors.surface.input
      : colors.surface.card;

  const containerStyle = [
    styles.base,
    {
      backgroundColor: bg,
      borderRadius: radius.lg,
      borderColor: colors.surface.border,
      borderWidth: borderless ? 0 : StyleSheet.hairlineWidth * 2,
      padding: spacing[padding] ?? padding,
    },
    variant === 'raised' && elevation.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [containerStyle, pressed && { opacity: 0.9 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
