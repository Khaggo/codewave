import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import IconButton from './IconButton';

export default function Header({
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  align = 'left',
  style,
}) {
  const { colors, type, spacing } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: spacing[4],
          paddingTop: Platform.OS === 'ios' ? spacing[2] : spacing[4],
          paddingBottom: spacing[3],
          borderBottomColor: colors.surface.borderSoft,
        },
        style,
      ]}
    >
      <View style={styles.left}>
        {onBack ? (
          <IconButton
            icon="arrow-left"
            onPress={onBack}
            accessibilityLabel={backLabel || 'Go back'}
            variant="ghost"
            size="md"
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <View style={[styles.center, align === 'left' && styles.centerLeft]}>
        {title ? (
          <Text style={[type.h2, { color: colors.ink.primary }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[type.small, { color: colors.ink.secondary, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  centerLeft: {
    alignItems: 'flex-start',
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
