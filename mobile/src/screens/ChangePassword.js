import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PasswordChecklist from '../components/PasswordChecklist';
import PasswordField from '../components/PasswordField';
import ScreenShell from '../components/ScreenShell';
import { ApiError, requestChangePasswordOtp } from '../lib/authClient';
import { colors, radius } from '../theme';
import { validateChangePasswordForm } from '../utils/validation';

export default function ChangePassword({ navigation, account }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const shouldShowPasswordChecklist =
    focusedField === 'newPassword' || form.newPassword.length > 0 || Boolean(errors.newPassword);

  const handleFieldChange = (key, value) => {
    const nextForm = {
      ...form,
      [key]: value,
    };

    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
      ...(key === 'newPassword' || key === 'confirmPassword'
        ? {
            confirmPassword:
              nextForm.confirmPassword && nextForm.newPassword !== nextForm.confirmPassword
                ? 'Passwords do not match.'
                : '',
          }
        : {}),
    }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateChangePasswordForm({
      ...form,
      savedPassword: '',
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!account?.accessToken) {
      Alert.alert(
        'Session Expired',
        'Sign in again before requesting a password change code.',
      );
      return;
    }

    setSubmitting(true);

    try {
      const enrollment = await requestChangePasswordOtp({
        currentPassword: form.currentPassword,
        accessToken: account.accessToken,
      });

      navigation.navigate('OTP', {
        email: account?.email,
        maskedEmail: enrollment.maskedEmail,
        otpPurpose: 'passwordChange',
        enrollmentId: enrollment.enrollmentId,
        currentPassword: form.currentPassword,
        pendingPassword: form.newPassword,
      });
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to request a password change code right now.';
      setErrors((currentErrors) => ({
        ...currentErrors,
        currentPassword: message,
      }));
      Alert.alert('Password Change Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>SECURITY</Text>
        <Text style={styles.title}>Change your password</Text>
        <Text style={styles.subtitle}>
          Confirm your current password, then choose a stronger replacement.
        </Text>
      </View>

      <PasswordField
        label="Current Password"
        value={form.currentPassword}
        onChangeText={(value) => handleFieldChange('currentPassword', value)}
        placeholder="Enter your current password"
        error={errors.currentPassword}
        isFocused={focusedField === 'currentPassword'}
        onFocus={() => setFocusedField('currentPassword')}
        onBlur={() => setFocusedField('')}
        textContentType="password"
      />

      <PasswordField
        label="New Password"
        value={form.newPassword}
        onChangeText={(value) => handleFieldChange('newPassword', value)}
        placeholder="Create a new password"
        error={errors.newPassword}
        hideErrorText
        isFocused={focusedField === 'newPassword'}
        onFocus={() => setFocusedField('newPassword')}
        onBlur={() => setFocusedField('')}
        textContentType="newPassword"
      />

      <PasswordChecklist password={form.newPassword} visible={shouldShowPasswordChecklist} />

      <PasswordField
        label="Confirm New Password"
        value={form.confirmPassword}
        onChangeText={(value) => handleFieldChange('confirmPassword', value)}
        placeholder="Re-enter your new password"
        error={errors.confirmPassword}
        isFocused={focusedField === 'confirmPassword'}
        onFocus={() => setFocusedField('confirmPassword')}
        onBlur={() => setFocusedField('')}
        textContentType="password"
      />

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? 'Sending Code...' : 'Send Verification Code'}
        </Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingBottom: 36,
  },
  headerBlock: {
    marginBottom: 24,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
