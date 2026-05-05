import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OtpInputGroup from '../components/OtpInputGroup';
import ScreenShell from '../components/ScreenShell';
import { ApiError, requestForgotPasswordOtp } from '../lib/authClient';
import { colors, radius } from '../theme';

const RESEND_SECONDS = 17;

export default function ForgotPasswordOTP({ navigation, route }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState(route.params?.enrollmentId ?? null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-8)).current;

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

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setError('Enter the full 6-digit OTP.');
      Alert.alert('Incomplete Code', 'Please enter the full 6-digit OTP before verifying.');
      return;
    }

    if (!enrollmentId) {
      setError('The password reset session expired. Request a new code and try again.');
      showInlineToast('Password reset session expired.');
      return;
    }

    showInlineToast('OTP verified. Proceed to password reset.', 'success');
    Alert.alert(
      'OTP Verified',
      'Your code is correct. You can now create a new password for this account.',
      [
        {
          text: 'Continue',
          onPress: () =>
            navigation.navigate('ResetPassword', {
              email: route.params?.email,
              enrollmentId,
              otp,
            }),
        },
      ],
    );
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const enrollment = await requestForgotPasswordOtp({
        email: route.params?.email,
      });

      setEnrollmentId(enrollment.enrollmentId);
      setOtp('');
      setError('');
      setResendCountdown(RESEND_SECONDS);
      showInlineToast('A fresh verification code was sent.', 'success');
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : 'We could not resend the verification code right now.';
      setError(message);
      showInlineToast(message);
    } finally {
      setSubmitting(false);
    }
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
            <MaterialCommunityIcons name="email-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
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
          <Text style={styles.emailText}>
            {route.params?.maskedEmail || route.params?.email || 'your email address'}
          </Text>
          <Text style={styles.messageSubtitle}>Check your inbox and spam folder</Text>
        </View>

        <Text style={styles.codeLabel}>Enter 6-digit code</Text>

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
            (otp.length !== 6 || submitting || !enrollmentId) && styles.primaryButtonDisabled,
          ]}
          onPress={handleVerifyOtp}
          activeOpacity={0.88}
          disabled={otp.length !== 6 || submitting || !enrollmentId}
        >
          <View style={styles.primaryButtonContent}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Verify & Change Password</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Didn't receive it? </Text>
          {resendCountdown > 0 ? (
            <Text style={styles.resendCountdown}>Resend in {resendCountdown}s</Text>
          ) : (
            <Text style={styles.resendAction} onPress={() => void handleResend()}>
              {submitting ? 'Sending...' : 'Resend now'}
            </Text>
          )}
        </View>
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
});
