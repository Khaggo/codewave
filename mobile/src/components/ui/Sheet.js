import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';

export default function Sheet({
  visible,
  onClose,
  children,
  variant = 'center', // 'center' | 'bottom'
  contentStyle,
  closeOnBackdrop = true,
  maxWidth = 480,
}) {
  const { colors, radius, spacing, elevation } = useTheme();

  const isBottom = variant === 'bottom';

  return (
    <Modal
      visible={visible}
      animationType={isBottom ? 'slide' : 'fade'}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: colors.overlay },
          isBottom ? styles.overlayBottom : styles.overlayCenter,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnBackdrop ? onClose : undefined}
        />
        <View
          style={[
            styles.card,
            isBottom
              ? {
                  width: '100%',
                  borderTopLeftRadius: radius.xl,
                  borderTopRightRadius: radius.xl,
                  paddingTop: spacing[3],
                }
              : {
                  width: '100%',
                  maxWidth,
                  borderRadius: radius.lg,
                  marginHorizontal: spacing[5],
                },
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.surface.border,
              padding: spacing[5],
            },
            elevation.raised,
            contentStyle,
          ]}
        >
          {isBottom ? (
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.surface.border, marginBottom: spacing[3] },
              ]}
            />
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  card: {
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'auto',
      },
    }),
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
  },
});
