import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export default function SegmentedControl({
  segments = [],
  value,
  onChange,
  style,
}) {
  const { colors, radius, spacing, type } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface.raised,
          borderColor: colors.surface.border,
          borderRadius: radius.md,
          padding: 4,
        },
        style,
      ]}
    >
      {segments.map((segment) => {
        const segValue = typeof segment === 'string' ? segment : segment.value;
        const segLabel = typeof segment === 'string' ? segment : segment.label;
        const isActive = value === segValue;

        return (
          <Pressable
            key={segValue}
            onPress={() => onChange?.(segValue)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: isActive ? colors.surface.card : 'transparent',
                borderRadius: radius.sm,
                paddingHorizontal: spacing[3],
                paddingVertical: 8,
                opacity: pressed && !isActive ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                type.bodyStrong,
                {
                  color: isActive ? colors.ink.primary : colors.ink.secondary,
                  fontSize: 13,
                },
              ]}
              numberOfLines={1}
            >
              {segLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
