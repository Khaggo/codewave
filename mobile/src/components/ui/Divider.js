import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';

export default function Divider({ orientation = 'horizontal', spacing: spaceProp = 0, style }) {
  const { colors, spacing } = useTheme();
  const margin = spacing[spaceProp] ?? 0;

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: colors.surface.borderSoft,
            marginHorizontal: margin,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: colors.surface.borderSoft,
          marginVertical: margin,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
