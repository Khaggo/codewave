import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PasswordField from './PasswordField';
import { colors, radius } from '../theme';

export default function DeleteAccountModal({
  visible,
  onCancel,
  onConfirm,
  password,
  submitting = false,
  onPasswordChange,
  error,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Feather name="alert-triangle" size={20} color={colors.danger} />
          </View>

          <Text style={styles.title}>Delete account?</Text>
          <Text style={styles.description}>
            This archives your account instead of hard-deleting the record. Enter your current
            password and we'll email a verification code before the archive is finalized.
          </Text>

          <PasswordField
            label="Current password"
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Enter your current password"
            error={error}
            icon="lock-outline"
            containerStyle={styles.passwordField}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                (submitting || pressed) && styles.buttonDimmed,
              ]}
              onPress={onCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                (submitting || pressed) && styles.buttonDimmed,
              ]}
              onPress={onConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.confirmButtonText}>Send verification code</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    marginHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 22,
    elevation: 8,
  },
  iconBadge: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  passwordField: {
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDimmed: {
    opacity: 0.85,
  },
});
