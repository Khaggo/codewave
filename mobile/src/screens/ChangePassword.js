import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PasswordChecklist from '../components/PasswordChecklist';
import PasswordField from '../components/PasswordField';
import ScreenShell from '../components/ScreenShell';
import { colors, radius } from '../theme';
import { validateChangePasswordForm } from '../utils/validation';

export default function ChangePassword({ navigation, account, onChangePassword }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
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

  const handleSubmit = () => {
    const nextErrors = validateChangePasswordForm({
      ...form,
      savedPassword: account?.password || '',
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onChangePassword(form.newPassword);
    Alert.alert('Password Updated', 'Your password has been changed successfully.');
    navigation.goBack();
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

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>Save Password</Text>
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
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
