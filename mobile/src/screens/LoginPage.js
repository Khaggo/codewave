import { useEffect, useRef, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenShell from '../components/ScreenShell';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { colors, radius } from '../theme';
import { normalizeEmail, validateEmail, validateLoginForm } from '../utils/validation';
import { ApiError } from '../lib/authClient';

const protectedReturnRoutes = new Set([
  'Menu',
  'ManageProfile',
  'ChangePassword',
  'BookingScreen',
  'VehicleLifecycleScreen',
  'InsuranceInquiryScreen',
  'ChatbotScreen',
]);

export default function LoginPage({ navigation, route, onLogin }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (route.params?.prefilledEmail) {
      setForm((currentForm) => ({
        ...currentForm,
        email: route.params.prefilledEmail,
      }));
    }
  }, [route.params?.prefilledEmail]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideIn, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, slideIn]);

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
      if (nextErrors.email) {
        emailRef.current?.focus?.();
      } else if (nextErrors.password) {
        passwordRef.current?.focus?.();
      }
      return;
    }

    const submitLogin = async () => {
      setSubmitting(true);
      try {
        await onLogin({
          email: normalizeEmail(form.email),
          password: form.password,
        });

        const requestedRoute = protectedReturnRoutes.has(route.params?.returnTo)
          ? route.params.returnTo
          : 'Menu';
        const routes = requestedRoute === 'Menu'
          ? [{ name: 'Menu', params: route.params?.returnParams }]
          : [
              { name: 'Menu' },
              { name: requestedRoute, params: route.params?.returnParams },
            ];

        navigation.reset({ index: routes.length - 1, routes });
      } catch (error) {
        const message = error instanceof ApiError
          ? error.status === 401
            ? 'The email or password is incorrect.'
            : error.status >= 500
              ? 'AutoCare is temporarily unavailable. Try again in a moment.'
              : error.message
          : 'Unable to sign in right now. Please try again.';
        setErrors({
          email: '',
          password: message,
        });
        passwordRef.current?.focus?.();
      } finally {
        setSubmitting(false);
      }
    };

    void submitLogin();
  };

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.replace('Landing')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.body,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideIn }],
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Feather name="settings" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandEyebrow}>Auto Care Center</Text>
            <Text style={styles.brandTitle}>CRUISERS CRIB</Text>
          </View>
        </View>

        <Text style={styles.title}>Sign in</Text>

        {route.params?.sessionMessage ? (
          <Text
            style={styles.sessionMessage}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {route.params.sessionMessage}
          </Text>
        ) : null}

        <View style={styles.form}>
          <FormField
            ref={emailRef}
            label=""
            value={form.email}
            onChangeText={(value) => handleFieldChange('email', value)}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            onBlur={() => {
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
            nativeID="customer-login-email"
            name="email"
            accessibilityLabel="Email"
          />

          <PasswordField
            ref={passwordRef}
            label=""
            value={form.password}
            onChangeText={(value) => handleFieldChange('password', value)}
            placeholder="Password"
            error={errors.password}
            textContentType="password"
            autoComplete="off"
            importantForAutofill="no"
            nativeID="customer-login-password"
            name="password"
            accessibilityLabel="Password"
          />

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={() => navigation.replace('ForgotPasswordEmail')}
            disabled={submitting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            accessibilityState={{ disabled: submitting }}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.9}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={submitting ? 'Signing in' : 'Sign in'}
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <TouchableOpacity
          style={styles.footerLinkTarget}
          onPress={() => navigation.replace('Register')}
          accessibilityRole="link"
          accessibilityLabel="Sign up"
        >
          <Text style={styles.footerLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  body: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  sessionMessage: {
    marginTop: 12,
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandText: {
    flexShrink: 1,
  },
  brandEyebrow: {
    color: colors.labelText,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  form: {
    width: '100%',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
  },
  footerLinkTarget: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  footerText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
