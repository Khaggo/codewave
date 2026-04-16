import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthFrame from '../components/AuthFrame';
import PasswordChecklist from '../components/PasswordChecklist';
import PasswordField from '../components/PasswordField';
import { colors, radius } from '../theme';
import { validateResetPasswordForm } from '../utils/validation';

export default function ResetPassword({ navigation, route, onResetPassword }) {
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
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

  const handleSubmit = () => {
    const nextErrors = validateResetPasswordForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onResetPassword(form.newPassword);
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

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} activeOpacity={0.88}>
        <View style={styles.primaryButtonContent}>
          <Text style={styles.primaryButtonText}>Save Password</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
        </View>
      </TouchableOpacity>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 5,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
});
