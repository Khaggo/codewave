import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AuthFrame from '../components/AuthFrame';
import FormField from '../components/FormField';
import { colors, radius } from '../theme';
import { normalizeEmail, validateEmail } from '../utils/validation';

export default function ForgotPasswordEmail({ navigation, registeredAccount }) {
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [error, setError] = useState('');

  const handleSendOtp = () => {
    const emailError = validateEmail(email);

    if (emailError) {
      setError(emailError);
      return;
    }

    if (!registeredAccount || registeredAccount.email !== normalizeEmail(email)) {
      setError('We could not find an account with that email address.');
      return;
    }

    navigation.replace('ForgotPasswordOTP', {
      email: normalizeEmail(email),
    });
  };

  return (
    <AuthFrame
      title="Forgot password?"
      subtitle="Enter the registered email address and we'll move you to the 6-digit OTP reset flow."
      backLabel="Back to login"
      onBack={() => navigation.replace('Login')}
      centerContent
    >
      <FormField
        label="Email address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError('');
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
        isFocused={focusedField === 'email'}
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField('')}
        textContentType="emailAddress"
        icon="email-outline"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} activeOpacity={0.9}>
        <View style={styles.primaryButtonContent}>
          <Text style={styles.primaryButtonText}>Send OTP</Text>
          <Feather name="arrow-right" size={16} color={colors.onPrimary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Back</Text>
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
  secondaryButton: {
    marginTop: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
