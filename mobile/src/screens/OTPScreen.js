import { useEffect, useRef, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import OtpInputGroup from '../components/OtpInputGroup';
import ScreenShell from '../components/ScreenShell';
import { colors } from '../theme';
import {
  executeOtpVerification,
  getOtpScreenCopy,
  OTP_RESEND_SECONDS,
} from './otpScreenModel.mjs';
import styles from './otpScreenStyles';

export default function OTPScreen({ navigation, route, onVerified, onVerifyRegistrationOtp, onResend }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [resendCountdown, setResendCountdown] = useState(OTP_RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-8)).current;
  const navigationTimeoutRef = useRef(null);
  const otpPurpose = route.params?.otpPurpose || 'login';
  const screenCopy = getOtpScreenCopy(otpPurpose);
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
          const execution = await executeOtpVerification({
            otp,
            otpPurpose,
            routeParams: route.params,
            verifyOtp: onVerified,
            verifyRegistrationOtp: onVerifyRegistrationOtp,
          });
          if (!execution.ok) {
            throw new Error(execution.message);
          }
          const verificationResult = execution.result;

          showInlineToast(screenCopy.successToast, 'success');

          if (Platform.OS === 'web') {
            navigationTimeoutRef.current = setTimeout(() => {
              navigateAfterVerification(
                verificationResult ?? {
                  status: 'success',
                  nextRoute: 'Menu',
                  resetStack: true,
                },
              );
            }, 1500);
            return;
          }

          Alert.alert(screenCopy.successTitle, screenCopy.successMessage, [
            {
              text: 'Continue',
              onPress: () =>
                navigateAfterVerification(
                  verificationResult ?? {
                    status: 'success',
                    nextRoute: 'Menu',
                    resetStack: true,
                  },
                ),
            },
          ]);
        } catch (verificationError) {
          const message =
            verificationError instanceof Error
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

    const submitVerification = async () => {
      setSubmitting(true);
      try {
        const execution = await executeOtpVerification({
          otp,
          otpPurpose,
          routeParams: route.params,
          verifyOtp: onVerified,
          verifyRegistrationOtp: onVerifyRegistrationOtp,
        });
        if (!execution.ok) {
          setError(execution.message);
          showInlineToast(execution.message);
          Alert.alert('Verification Failed', execution.message);
          return;
        }
        const verificationResult = execution.result;

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
      } catch (verificationError) {
        const message =
          verificationError instanceof Error
            ? verificationError.message
            : 'Unable to complete OTP verification right now.';
        setError(message);
        showInlineToast(message);
        Alert.alert('Verification Failed', message);
      } finally {
        setSubmitting(false);
      }
    };

    void submitVerification();
  };

  const handleResend = () => {
    if (resendCountdown > 0) {
      return;
    }

    const requestResend = async () => {
      try {
        if (!onResend) {
          throw new Error('This verification code cannot be resent from this screen. Go back and request a new code.');
        }

        const resendResult = await onResend({
          ...route.params,
          otpPurpose,
        });

        if (resendResult) {
          navigation.setParams({
            ...route.params,
            ...resendResult,
          });
        }

        setOtp('');
        setError('');
        setResendCountdown(OTP_RESEND_SECONDS);
        showInlineToast('A fresh verification code was sent.', 'success');
      } catch (resendError) {
        const message =
          resendError instanceof Error
            ? resendError.message
            : 'We could not resend the verification code right now.';
        setError(message);
        showInlineToast(message);
        Alert.alert('Resend Failed', message);
      }
    };

    void requestResend();
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

      </View>
    </ScreenShell>
  );
}
