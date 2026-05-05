import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthFrame from '../components/AuthFrame';
import FormField from '../components/FormField';
import { ApiError, requestForgotPasswordOtp } from '../lib/authClient';
import { colors, radius } from '../theme';
import { normalizeEmail, validateEmail } from '../utils/validation';

export default function ForgotPasswordEmail({ navigation }) {
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async () => {
    const emailError = validateEmail(email);

    if (emailError) {
      setError(emailError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const enrollment = await requestForgotPasswordOtp({
        email: normalizeEmail(email),
      });

      navigation.replace('ForgotPasswordOTP', {
        email: normalizeEmail(email),
        enrollmentId: enrollment.enrollmentId,
        maskedEmail: enrollment.maskedEmail,
        otpExpiresAt: enrollment.otpExpiresAt,
      });
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'We could not start password reset right now. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      title="Forgot password?"
      subtitle="Enter the registered email address and we'll move you to the 6-digit OTP reset flow."
      backLabel="Back to Login"
      onBack={() => navigation.replace('Login')}
      centerContent
    >
      <FormField
        label="Email Address"
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

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={() => void handleSendOtp()}
        activeOpacity={0.88}
        disabled={submitting}
      >
        <View style={styles.primaryButtonContent}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Sending...' : 'Send OTP'}</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
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
  primaryButtonDisabled: {
    opacity: 0.7,
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
  secondaryButton: {
    marginTop: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
