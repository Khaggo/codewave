import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AuthFrame from '../components/AuthFrame';
import DatePickerField from '../components/DatePickerField';
import FormField from '../components/FormField';
import PasswordChecklist from '../components/PasswordChecklist';
import PasswordField from '../components/PasswordField';
import { colors, radius } from '../theme';
import { ApiError, toDateOnlyString } from '../lib/authClient';
import {
  buildUsername,
  cloneDate,
  formatVehicleDisplayName,
  normalizeEmail,
  normalizeLicensePlate,
  normalizePhoneNumber,
  normalizeVehicleYear,
  validateRegisterForm,
} from '../utils/validation';
import { useEffect, useRef, useState } from 'react';

const REGISTRATION_DRAFT_KEY = '@autocare/registration-draft-v1';
const REGISTRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const accountFieldNames = new Set([
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'birthday',
  'password',
  'confirmPassword',
]);

export default function RegisterPage({ navigation, onRegister }) {
  const { width } = useWindowDimensions();
  const compactLayout = width < 380;
  const [step, setStep] = useState('account');
  const firstNameRef = useRef(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthday: null,
    licensePlate: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleYear: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const shouldShowPasswordChecklist = form.password.length > 0;

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(REGISTRATION_DRAFT_KEY).then((serializedDraft) => {
      if (!mounted || !serializedDraft) return;

      try {
        const draft = JSON.parse(serializedDraft);
        if (Date.now() - Number(draft.savedAt ?? 0) > REGISTRATION_DRAFT_TTL_MS) {
          void AsyncStorage.removeItem(REGISTRATION_DRAFT_KEY);
          return;
        }
        setForm((current) => ({
          ...current,
          ...draft.form,
          birthday: draft.form?.birthday ? new Date(draft.form.birthday) : null,
          password: '',
          confirmPassword: '',
        }));
        setStep(draft.step === 'vehicle' ? 'vehicle' : 'account');
      } catch {
        void AsyncStorage.removeItem(REGISTRATION_DRAFT_KEY);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const draftForm = {
      ...form,
      birthday: form.birthday?.toISOString?.() ?? null,
      password: '',
      confirmPassword: '',
    };
    void AsyncStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({
      savedAt: Date.now(),
      step,
      form: draftForm,
    }));
  }, [form, step]);

  const handleFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'phoneNumber') {
      nextValue = normalizePhoneNumber(value);
    }

    if (key === 'vehicleYear') {
      nextValue = normalizeVehicleYear(value);
    }

    if (key === 'licensePlate') {
      nextValue = normalizeLicensePlate(value);
    }

    setForm((currentForm) => ({
      ...currentForm,
      [key]: nextValue,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
    }));
    setFormError('');
  };

  const handleRegister = () => {
    const nextErrors = validateRegisterForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedAccount = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: normalizeEmail(form.email),
      phoneNumber: normalizePhoneNumber(form.phoneNumber),
        address: '',
        username: buildUsername(form.email, form.firstName, form.lastName),
        birthday: cloneDate(form.birthday),
        licensePlate: normalizeLicensePlate(form.licensePlate).trim(),
        vehicleMake: form.vehicleMake.trim(),
      vehicleModel: form.vehicleModel.trim(),
      vehicleColor: form.vehicleColor.trim(),
      vehicleYear: Number(normalizeVehicleYear(form.vehicleYear)),
      vehicleDisplayName: formatVehicleDisplayName({
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        vehicleYear: form.vehicleYear,
      }),
      password: form.password,
    };

    const submitRegistration = async () => {
      setSubmitting(true);
      setFormError('');

      try {
        const registrationResult = await onRegister(trimmedAccount);
        await AsyncStorage.removeItem(REGISTRATION_DRAFT_KEY);

        if (registrationResult?.mode === 'session') {
          navigation.reset({
            index: 0,
            routes: [{ name: registrationResult.nextRoute || 'Menu' }],
          });
          return;
        }

        const enrollment = registrationResult?.enrollment ?? registrationResult;

        if (!enrollment?.enrollmentId) {
          throw new Error('Registration OTP enrollment is missing. Please try signing up again.');
        }

        navigation.replace('OTP', {
          email: trimmedAccount.email,
          maskedEmail: enrollment.maskedEmail,
          enrollmentId: enrollment.enrollmentId,
          otpExpiresAt: enrollment.otpExpiresAt,
          otpPurpose: 'register',
          accountDraft: {
            ...trimmedAccount,
            birthday: toDateOnlyString(trimmedAccount.birthday),
          },
        });
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to create your account right now. Please try again.';

        if (error instanceof ApiError && error.status === 409) {
          setErrors((currentErrors) => ({
            ...currentErrors,
            email: message,
          }));
          return;
        }

        setFormError(message);
      } finally {
        setSubmitting(false);
      }
    };

    void submitRegistration();
  };

  const handleContinueToVehicle = () => {
    const accountErrors = Object.fromEntries(
      Object.entries(validateRegisterForm(form)).filter(([field]) => accountFieldNames.has(field)),
    );

    if (Object.keys(accountErrors).length > 0) {
      setErrors(accountErrors);
      firstNameRef.current?.focus?.();
      return;
    }

    setErrors({});
    setStep('vehicle');
  };

  return (
    <AuthFrame
      title={step === 'account' ? 'Create your account' : 'Add your first vehicle'}
      subtitle={step === 'account'
        ? 'Enter your account details. Your progress is saved on this device for 24 hours.'
        : 'Add the vehicle you want to book or insure first, then verify your email.'}
      backLabel="Back to Login"
      onBack={() => navigation.replace('Login')}
      contentContainerStyle={styles.content}
      cardStyle={styles.card}
    >
      <View style={styles.stageRail} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 2, now: step === 'account' ? 1 : 2 }}>
        <View style={[styles.stageItem, styles.stageItemActive]}>
          <Text style={styles.stageNumber}>1</Text>
          <Text style={styles.stageLabel}>Account Details</Text>
        </View>
        <View style={[styles.stageDivider, step === 'vehicle' && styles.stageDividerActive]} />
        <View style={[styles.stageItem, step === 'vehicle' && styles.stageItemActive]}>
          <Text style={styles.stageNumber}>2</Text>
          <Text style={styles.stageLabel}>First Vehicle</Text>
        </View>
      </View>

      {step === 'account' ? (
        <>
      <View style={[styles.nameRow, compactLayout && styles.nameRowCompact]}>
        <FormField
          ref={firstNameRef}
          label="First Name"
          value={form.firstName}
          onChangeText={(value) => handleFieldChange('firstName', value)}
          placeholder="Juan"
          autoCapitalize="words"
          error={errors.firstName}
          textContentType="givenName"
          autoComplete="off"
          importantForAutofill="no"
          icon="account-outline"
          containerStyle={[styles.nameField, compactLayout && styles.nameFieldCompact]}
        />

        <FormField
          label="Last Name"
          value={form.lastName}
          onChangeText={(value) => handleFieldChange('lastName', value)}
          placeholder="Dela Cruz"
          autoCapitalize="words"
          error={errors.lastName}
          textContentType="familyName"
          autoComplete="off"
          importantForAutofill="no"
          icon="account-outline"
          containerStyle={[styles.nameField, compactLayout && styles.nameFieldCompact]}
        />
      </View>

      <FormField
        label="Email Address"
        value={form.email}
        onChangeText={(value) => handleFieldChange('email', value)}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        textContentType="emailAddress"
        autoComplete="off"
        importantForAutofill="no"
        icon="email-outline"
      />

      <FormField
        label="Phone Number"
        value={form.phoneNumber}
        onChangeText={(value) => handleFieldChange('phoneNumber', value)}
        placeholder="+63 912-345-6789"
        keyboardType="number-pad"
        autoCapitalize="none"
        error={errors.phoneNumber}
        helperText="Required. Use an 11-digit PH mobile number starting with 09."
        maxLength={11}
        textContentType="telephoneNumber"
        autoComplete="off"
        importantForAutofill="no"
        icon="phone-outline"
      />

      <DatePickerField
        label="Birthday"
        value={form.birthday}
        onChange={(value) => handleFieldChange('birthday', value)}
        placeholder="Select your birthday"
        error={errors.birthday}
        helperText="Choose your actual birthday. It cannot be changed from the customer app later."
      />

      <PasswordField
        label="Password"
        value={form.password}
        onChangeText={(value) => handleFieldChange('password', value)}
        placeholder="Create a strong password"
        error={errors.password}
        hideErrorText
        textContentType="newPassword"
        autoComplete="off"
        importantForAutofill="no"
      />

      <PasswordChecklist password={form.password} visible={shouldShowPasswordChecklist} />

      <PasswordField
        label="Re-enter Password"
        value={form.confirmPassword}
        onChangeText={(value) => handleFieldChange('confirmPassword', value)}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
        textContentType="password"
        autoComplete="off"
        importantForAutofill="no"
      />

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleContinueToVehicle}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Continue to first vehicle"
      >
        <View style={styles.primaryButtonContent}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
        </View>
      </TouchableOpacity>
        </>
      ) : (
        <>

      <FormField
        label="Vehicle Plate"
        value={form.licensePlate}
        onChangeText={(value) => handleFieldChange('licensePlate', value)}
        placeholder="ABC 1234"
        autoCapitalize="characters"
        error={errors.licensePlate}
        textContentType="none"
        autoComplete="off"
        importantForAutofill="no"
        icon="card-text-outline"
      />

      <View style={[styles.nameRow, compactLayout && styles.nameRowCompact]}>
        <FormField
          label="Vehicle Make"
          value={form.vehicleMake}
          onChangeText={(value) => handleFieldChange('vehicleMake', value)}
          placeholder="Toyota"
          autoCapitalize="words"
          error={errors.vehicleMake}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          icon="car-info"
          containerStyle={[styles.nameField, compactLayout && styles.nameFieldCompact]}
        />

        <FormField
          label="Vehicle Year"
          value={form.vehicleYear}
          onChangeText={(value) => handleFieldChange('vehicleYear', value)}
          placeholder="2022"
          keyboardType="number-pad"
          autoCapitalize="none"
          error={errors.vehicleYear}
          maxLength={4}
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
          icon="calendar-range"
          containerStyle={[styles.nameField, compactLayout && styles.nameFieldCompact]}
        />
      </View>

      <FormField
        label="Vehicle Model"
        value={form.vehicleModel}
        onChangeText={(value) => handleFieldChange('vehicleModel', value)}
        placeholder="Vios"
        autoCapitalize="words"
        error={errors.vehicleModel}
        textContentType="none"
        autoComplete="off"
        importantForAutofill="no"
        icon="car-side"
      />

      <FormField
        label="Vehicle Color"
        value={form.vehicleColor}
        onChangeText={(value) => handleFieldChange('vehicleColor', value)}
        placeholder="White"
        autoCapitalize="words"
        textContentType="none"
        autoComplete="off"
        importantForAutofill="no"
        icon="palette-outline"
      />

      <Text style={styles.infoText}>
        Your account will be verified first, then the app will save your birthday and first vehicle automatically.
      </Text>

      <Text style={styles.footerText}>
        By registering, you agree to our{' '}
        <Text
          style={styles.footerLink}
          onPress={() =>
            Alert.alert(
              'Terms of Service',
              'The Terms of Service viewer is not connected in this local build yet.',
            )
          }
        >
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text
          style={styles.footerLink}
          onPress={() =>
            Alert.alert(
              'Privacy Policy',
              'The Privacy Policy viewer is not connected in this local build yet.',
            )
          }
        >
          Privacy Policy
        </Text>
        .
      </Text>

      {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleRegister}
        activeOpacity={0.88}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={submitting ? 'Creating account' : 'Create account'}
        accessibilityState={{ disabled: submitting, busy: submitting }}
      >
        <View style={styles.primaryButtonContent}>
          {submitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Create Account</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
            </>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setStep('account')}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel="Back to account details"
      >
        <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
        <Text style={styles.secondaryButtonText}>Back to account details</Text>
      </TouchableOpacity>

      <View style={styles.signInRow}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <Text style={styles.signInLink} onPress={() => navigation.replace('Login')}>
          Sign In
        </Text>
      </View>
        </>
      )}
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Platform.OS === 'web' ? 24 : 36,
  },
  card: {
    maxWidth: 560,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  nameRowCompact: {
    flexDirection: 'column',
    gap: 0,
  },
  nameField: {
    flex: 1,
  },
  nameFieldCompact: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  stageRail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stageItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.58,
  },
  stageItemActive: {
    opacity: 1,
  },
  stageNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: '800',
  },
  stageLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  stageDivider: {
    flex: 1,
    height: 1,
    minWidth: 12,
    marginHorizontal: 8,
    backgroundColor: colors.border,
  },
  stageDividerActive: {
    backgroundColor: colors.primary,
  },
  footerText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: -2,
    marginBottom: 10,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
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
    minHeight: 44,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  signInRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  signInText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  signInLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  formErrorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 14,
  },
});
