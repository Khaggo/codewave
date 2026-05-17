import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthFrame from '../components/AuthFrame';
import PasswordChecklist from '../components/PasswordChecklist';
import PasswordField from '../components/PasswordField';
import { resetPasswordWithOtp } from '../lib/authClient';
import { colors, radius } from '../theme';
import { validateResetPasswordForm } from '../utils/validation';

export default function ResetPassword({ navigation, route }) {
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const shouldShowPasswordChecklist =
    focusedField === 'newPassword' || form.newPassword.length > 0 || Boolean(errors.newPassword);

  const handleFieldChange = (key, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
      ...(key === 'newPassword' ? { confirmPassword: '' } : {}),
    }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateResetPasswordForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      await resetPasswordWithOtp({
        enrollmentId: route.params?.enrollmentId,
        otp: route.params?.otp,
        newPassword: form.newPassword,
      });

      Alert.alert('Password Updated', 'You can now log in with your new password.');
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: { prefilledEmail: route.params?.email },
          },
        ],
      });
    } catch (resetError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        newPassword:
          resetError instanceof Error
            ? resetError.message
            : 'We could not reset your password right now.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      title="Create a new password"
      subtitle={`Set a secure password for ${route.params?.email || 'your account'}.`}
      backLabel="Back"
      onBack={() => navigation.goBack()}
      centerContent
    >
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
        onPress={() => {
          void handleSubmit();
        }}
        activeOpacity={0.88}
        disabled={submitting}
      >
        <View style={styles.primaryButtonContent}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Saving...' : 'Save password'}</Text>
          <Feather name="arrow-right" size={16} color={colors.onPrimary} />
        </View>
      </TouchableOpacity>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
