import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthFrame from '../components/AuthFrame';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { colors, radius } from '../theme';
import { normalizeEmail, validateEmail, validateLoginForm } from '../utils/validation';
import { ApiError } from '../lib/authClient';

export default function LoginPage({ navigation, route, onLogin }) {
  const passwordInputRef = useRef(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (route.params?.prefilledEmail) {
      setForm((currentForm) => ({
        ...currentForm,
        email: route.params.prefilledEmail,
      }));
    }
  }, [route.params?.prefilledEmail]);

  const handleFieldChange = (key, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
    }));
  };

  const handleLogin = () => {
    const nextErrors = validateLoginForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const submitLogin = async () => {
      setSubmitting(true);
      try {
        await onLogin({
          email: normalizeEmail(form.email),
          password: form.password,
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Menu' }],
        });
      } catch (error) {
        setErrors({
          email: '',
          password:
            error instanceof ApiError
              ? error.message
              : 'Unable to sign in right now. Please try again.',
        });
      } finally {
        setSubmitting(false);
      }
    };

    void submitLogin();
  };

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in with your email and password. OTP is only required when creating a new account."
      backLabel="Back to Home"
      onBack={() => navigation.navigate('Landing')}
      centerContent
    >
      <FormField
        label="Email Address"
        value={form.email}
        onChangeText={(value) => handleFieldChange('email', value)}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        isFocused={focusedField === 'email'}
        onFocus={() => setFocusedField('email')}
        onBlur={() => {
          setFocusedField('');
          const emailError = validateEmail(form.email);

          if (emailError) {
            setErrors((currentErrors) => ({
              ...currentErrors,
              email: emailError,
            }));
          }
        }}
        textContentType="emailAddress"
        autoComplete="off"
        importantForAutofill="no"
        icon="email-outline"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordInputRef.current?.focus()}
      />

      <PasswordField
        ref={passwordInputRef}
        label="Password"
        value={form.password}
        onChangeText={(value) => handleFieldChange('password', value)}
        placeholder="Enter your password"
        error={errors.password}
        isFocused={focusedField === 'password'}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField('')}
        textContentType="password"
        autoComplete="off"
        importantForAutofill="no"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity
        style={styles.forgotPasswordLink}
        onPress={() => navigation.navigate('ForgotPasswordEmail')}
        disabled={submitting}
      >
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleLogin}
        activeOpacity={0.88}
        disabled={submitting}
      >
        <View style={styles.primaryButtonContent}>
          {submitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Sign In</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
            </>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
          Sign Up
        </Text>
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 22,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
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
    opacity: 0.72,
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
  footerRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    color: colors.mutedText,
    fontSize: 15,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
