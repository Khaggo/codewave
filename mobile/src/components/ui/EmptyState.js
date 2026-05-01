import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import Button from './Button';

export default function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
  style,
}) {
  const { colors, spacing, radius, type } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingVertical: spacing[8],
          paddingHorizontal: spacing[5],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.surface.raised,
            borderColor: colors.surface.border,
            borderRadius: radius.pill,
          },
        ]}
      >
        <Feather name={icon} size={28} color={colors.ink.secondary} />
      </View>
      {title ? (
        <Text
          style={[
            type.h2,
            { color: colors.ink.primary, marginTop: spacing[4], textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text
          style={[
            type.body,
            {
              color: colors.ink.secondary,
              marginTop: spacing[2],
              textAlign: 'center',
              maxWidth: 360,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing[5] }}>
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
