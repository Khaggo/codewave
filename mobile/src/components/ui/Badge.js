import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export default function Badge({
  label,
  tone = 'gray',
  icon,
  size = 'md',
  style,
}) {
  const { colors, radius, type } = useTheme();
  const palette = colors.badge[tone] ?? colors.badge.gray;

  const padX = size === 'sm' ? 8 : 10;
  const padY = size === 'sm' ? 3 : 5;
  const fontSize = size === 'sm' ? 10 : 11;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.pill,
          paddingHorizontal: padX,
          paddingVertical: padY,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={fontSize + 2} color={palette.fg} style={styles.icon} /> : null}
      <Text
        style={[
          type.smallStrong,
          { color: palette.fg, fontSize, letterSpacing: 0.4 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
});
