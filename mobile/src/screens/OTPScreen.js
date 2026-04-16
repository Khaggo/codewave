import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import OtpInputGroup from '../components/OtpInputGroup';
import ScreenShell from '../components/ScreenShell';
import { colors, radius } from '../theme';
import { ApiError } from '../lib/authClient';

const RESEND_SECONDS = 17;

const getScreenCopy = (otpPurpose) => {
  if (otpPurpose === 'passwordChange') {
    return {
      title: 'Verify Your Email',
      icon: 'shield-check-outline',
      codeLabel: 'Enter 6-digit code',
      buttonLabel: 'Verify & Change Password',
      buttonIcon: 'shield-check-outline',
      successToast: 'Password updated successfully.',
      successTitle: 'Password Updated',
      successMessage: 'Your new password has been verified and saved.',
    };
  }

  if (otpPurpose === 'register') {
    return {
      title: 'Verify Your Email',
      icon: 'email-outline',
      codeLabel: 'Enter 6-digit code',
      buttonLabel: 'Verify & Create Account',
      buttonIcon: 'account-check-outline',
      successToast: 'Registration verified successfully.',
      successTitle: 'Registration Verified',
      successMessage: 'Your verification code was accepted.',
    };
  }

  if (otpPurpose === 'deleteAccount') {
    return {
      title: 'Confirm Account Deletion',
      icon: 'shield-alert-outline',
      codeLabel: 'Enter 6-digit code',
      buttonLabel: 'Verify & Delete Account',
      buttonIcon: 'delete-outline',
      successToast: 'Account deletion verified.',
      successTitle: 'Account Deleted',
      successMessage: 'Your account has been verified for deletion and removed.',
    };
  }

  return {
    title: 'Verify Your Email',
    icon: 'email-outline',
    codeLabel: 'Enter 6-digit code',
    buttonLabel: 'Verify & Sign In',
    buttonIcon: 'login',
    successToast: 'Login verified successfully.',
    successTitle: 'Login Successful',
    successMessage: 'OTP verified. Welcome back to your AutoCare account.',
  };
};

export default function OTPScreen({ navigation, route, onVerified, onVerifyRegistrationOtp }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-8)).current;
  const navigationTimeoutRef = useRef(null);
  const otpPurpose = route.params?.otpPurpose || 'login';
  const screenCopy = getScreenCopy(otpPurpose);
  const verificationTarget = route.params?.maskedEmail || route.params?.email || 'your email address';

  useEffect(() => {
    if (resendCountdown <= 0) {
      return undefined;
    }

    const countdownTimer = setInterval(() => {
      setResendCountdown((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [resendCountdown]);

  useEffect(
    () => () => {
      toastOpacity.stopAnimation();
      toastTranslateY.stopAnimation();
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    },
    [toastOpacity, toastTranslateY],
  );

  const showInlineToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-8);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1400),
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        setToastMessage('');
      }
    });
  };

  const navigateAfterVerification = (verificationResult) => {
    const nextRoute = verificationResult?.nextRoute || 'Menu';

    if (verificationResult?.resetStack) {
      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute }],
      });
      return;
    }

    navigation.navigate(nextRoute);
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setError('Enter the full 6-digit OTP.');
      Alert.alert('Incomplete Code', 'Please enter the full 6-digit OTP before verifying.');
      return;
    }

    if (otpPurpose === 'register') {
      const submitVerification = async () => {
        setSubmitting(true);
        try {
          await onVerifyRegistrationOtp({
            enrollmentId: route.params?.enrollmentId,
            otp,
            accountDraft: route.params?.accountDraft,
          });

          showInlineToast(screenCopy.successToast, 'success');

          if (Platform.OS === 'web') {
            navigationTimeoutRef.current = setTimeout(() => {
              navigateAfterVerification({
                status: 'success',
                nextRoute: 'Menu',
                resetStack: true,
              });
            }, 1500);
            return;
          }

          Alert.alert(screenCopy.successTitle, screenCopy.successMessage, [
            {
              text: 'Continue',
              onPress: () =>
                navigateAfterVerification({
                  status: 'success',
                  nextRoute: 'Menu',
                  resetStack: true,
                }),
            },
          ]);
        } catch (verificationError) {
          const message =
            verificationError instanceof ApiError
              ? verificationError.message
              : 'Unable to verify your registration code right now.';

          setError(message);
          showInlineToast(message);
          Alert.alert('Verification Failed', message);
        } finally {
          setSubmitting(false);
        }
      };

      void submitVerification();
      return;
    }

    if (otp !== '123456') {
      setError('Incorrect OTP. Use 123456 for this prototype.');
      showInlineToast('Invalid code. Please try again.');
      Alert.alert('Invalid Code', 'The OTP you entered is invalid. Please try again.');
      return;
    }

    const verificationResult = onVerified?.(route.params) || { status: 'success' };

    if (verificationResult.status === 'error') {
      setError(verificationResult.message || 'OTP verification failed.');
      showInlineToast(verificationResult.title || 'Verification failed.');
      Alert.alert(
        verificationResult.title || 'Verification Failed',
        verificationResult.message || 'Unable to complete OTP verification.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (verificationResult.nextRoute) {
                navigateAfterVerification(verificationResult);
              }
            },
          },
        ],
      );
      return;
    }

    showInlineToast(screenCopy.successToast, 'success');

    if (Platform.OS === 'web') {
      navigationTimeoutRef.current = setTimeout(() => {
        navigateAfterVerification(verificationResult);
      }, 1500);
      return;
    }

    Alert.alert(screenCopy.successTitle, screenCopy.successMessage, [
      {
        text: 'Continue',
        onPress: () => navigateAfterVerification(verificationResult),
      },
    ]);
  };

  const handleResend = () => {
    if (resendCountdown > 0) {
      return;
    }

    if (otpPurpose === 'register') {
      showInlineToast('Resend is not available yet. Start registration again to request a new code.');
      return;
    }

    setOtp('');
    setError('');
    setResendCountdown(RESEND_SECONDS);
    showInlineToast('A fresh verification code was sent.', 'success');
  };

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.mutedText} />
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name={screenCopy.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.title}>{screenCopy.title}</Text>
        </View>

        <View style={styles.divider} />

        {toastMessage ? (
          <Animated.View
            style={[
              styles.toastBanner,
              toastType === 'success' ? styles.toastBannerSuccess : styles.toastBannerError,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <Text style={[styles.toastText, toastType === 'success' && styles.toastTextSuccess]}>
              {toastMessage}
            </Text>
          </Animated.View>
        ) : null}

        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>
            We sent a <Text style={styles.messageStrong}>6-digit verification code</Text> to
          </Text>
          <Text style={styles.emailText}>{verificationTarget}</Text>
          <Text style={styles.messageSubtitle}>Check your inbox and spam folder</Text>
        </View>

        <Text style={styles.codeLabel}>{screenCopy.codeLabel}</Text>

        <OtpInputGroup
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setError('');
          }}
          error={error}
          hideHelperText
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (otp.length !== 6 || submitting) && styles.primaryButtonDisabled,
          ]}
          onPress={handleVerifyOtp}
          activeOpacity={0.88}
          disabled={submitting}
        >
          <View style={styles.primaryButtonContent}>
            {submitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={screenCopy.buttonIcon}
                  size={18}
                  color={colors.onPrimary}
                />
                <Text style={styles.primaryButtonText}>{screenCopy.buttonLabel}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Didn't receive it? </Text>
          {resendCountdown > 0 ? (
            <Text style={styles.resendCountdown}>Resend in {resendCountdown}s</Text>
          ) : (
            <Text style={styles.resendAction} onPress={handleResend}>
              Resend now
            </Text>
          )}
        </View>

        {otpPurpose === 'register' ? (
          <View style={styles.demoCard}>
            <Text style={styles.demoText}>
              Use the verification code sent to your email. This screen is now backed by the real registration flow.
            </Text>
          </View>
        ) : (
          <View style={styles.demoCard}>
            <Text style={styles.demoText}>
              Demo code: <Text style={styles.demoCode}>1 2 3 4 5 6</Text>
            </Text>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 32,
  },
  page: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingTop: 18,
    paddingBottom: 24,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backLinkText: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 22,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginBottom: 18,
  },
  toastBanner: {
    marginHorizontal: 24,
    marginBottom: 14,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastBannerError: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  toastBannerSuccess: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  toastText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  toastTextSuccess: {
    color: colors.success,
  },
  messageCard: {
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 28,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  messageTitle: {
    color: colors.labelText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  messageStrong: {
    color: colors.text,
    fontWeight: '800',
  },
  emailText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 6,
  },
  messageSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  codeLabel: {
    color: colors.labelText,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.26,
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
    fontSize: 16,
    fontWeight: '800',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 24,
  },
  resendHint: {
    color: colors.mutedText,
    fontSize: 15,
  },
  resendCountdown: {
    color: colors.labelText,
    fontSize: 15,
    fontWeight: '700',
  },
  resendAction: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  demoCard: {
    marginHorizontal: 24,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: '#20406A',
    backgroundColor: '#0D1A31',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  demoText: {
    color: '#6FB1FF',
    fontSize: 14,
  },
  demoCode: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
