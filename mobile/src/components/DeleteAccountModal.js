import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Warning</Text>
          </View>

          <Text style={styles.title}>Delete Account?</Text>
          <Text style={styles.description}>
            This archives your account instead of hard-deleting the record. Enter your current
            password and we'll email a verification code before the archive is finalized. The
            same email can be used again later.
          </Text>

          <PasswordField
            label="Current Password"
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Enter your current password"
            error={error}
            icon="lock-outline"
            containerStyle={styles.passwordField}
          />

          <View style={styles.buttonRow}>
            <Pressable style={[styles.cancelButton, submitting && styles.buttonDisabled]} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.confirmButton, submitting && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.confirmButtonText}>Send Verification Code</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
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
    backgroundColor: 'rgba(17, 24, 39, 0.56)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    marginHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: 14,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
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
    minHeight: 52,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
