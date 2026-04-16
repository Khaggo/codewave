import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthFrame from '../components/AuthFrame';
import DatePickerField from '../components/DatePickerField';
import FormField from '../components/FormField';
import PasswordChecklist from '../components/PasswordChecklist';
import PasswordField from '../components/PasswordField';
import { colors, radius } from '../theme';
import {
  buildUsername,
  calculateAge,
  cloneDate,
  normalizeEmail,
  normalizePhoneNumber,
  validateRegisterForm,
} from '../utils/validation';
import { useRef, useState } from 'react';
import { ApiError } from '../lib/authClient';

export default function RegisterPage({ navigation, onRegister }) {
  const lastNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const licensePlateInputRef = useRef(null);
  const vehicleModelInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthday: null,
    licensePlate: '',
    vehicleModel: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedAge = calculateAge(form.birthday);
  const shouldShowPasswordChecklist = focusedField === 'password' || form.password.length > 0;

  const handleFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'phoneNumber') {
      nextValue = normalizePhoneNumber(value);
    }

    if (key === 'licensePlate') {
      nextValue = value.toUpperCase();
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
      birthday: cloneDate(form.birthday),
      address: '',
      username: buildUsername(form.email, form.firstName, form.lastName),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      vehicleModel: form.vehicleModel.trim(),
      password: form.password,
    };

    const submitRegistration = async () => {
      setSubmitting(true);
      setFormError('');

      try {
        const enrollment = await onRegister(trimmedAccount);

        navigation.navigate('OTP', {
          email: trimmedAccount.email,
          maskedEmail: enrollment.maskedEmail,
          enrollmentId: enrollment.enrollmentId,
          otpExpiresAt: enrollment.otpExpiresAt,
          otpPurpose: 'register',
          accountDraft: trimmedAccount,
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

  return (
    <AuthFrame
      title="Create Account"
      subtitle="Create your account, then confirm the email verification code before the first session starts."
      backLabel="Back to Login"
      onBack={() => navigation.navigate('Login')}
      contentContainerStyle={styles.content}
      cardStyle={styles.card}
    >
      <View style={styles.nameRow}>
        <FormField
          label="First Name"
          value={form.firstName}
          onChangeText={(value) => handleFieldChange('firstName', value)}
          placeholder="Juan"
          autoCapitalize="words"
          error={errors.firstName}
          isFocused={focusedField === 'firstName'}
          onFocus={() => setFocusedField('firstName')}
          onBlur={() => setFocusedField('')}
          textContentType="givenName"
          autoComplete="off"
          importantForAutofill="no"
          icon="account-outline"
          containerStyle={styles.nameField}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => lastNameInputRef.current?.focus()}
        />

        <FormField
          label="Last Name"
          ref={lastNameInputRef}
          value={form.lastName}
          onChangeText={(value) => handleFieldChange('lastName', value)}
          placeholder="Dela Cruz"
          autoCapitalize="words"
          error={errors.lastName}
          isFocused={focusedField === 'lastName'}
          onFocus={() => setFocusedField('lastName')}
          onBlur={() => setFocusedField('')}
          textContentType="familyName"
          autoComplete="off"
          importantForAutofill="no"
          icon="account-outline"
          containerStyle={styles.nameField}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => emailInputRef.current?.focus()}
        />
      </View>

      <FormField
        label="Email Address"
        ref={emailInputRef}
        value={form.email}
        onChangeText={(value) => handleFieldChange('email', value)}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        isFocused={focusedField === 'email'}
        onFocus={() => setFocusedField('email')}
        onBlur={() => setFocusedField('')}
        textContentType="emailAddress"
        autoComplete="off"
        importantForAutofill="no"
        icon="email-outline"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => phoneInputRef.current?.focus()}
      />

      <FormField
        label="Phone Number"
        ref={phoneInputRef}
        value={form.phoneNumber}
        onChangeText={(value) => handleFieldChange('phoneNumber', value)}
        placeholder="+63 912-345-6789"
        keyboardType="number-pad"
        autoCapitalize="none"
        error={errors.phoneNumber}
        helperText="Use an 11-digit PH mobile number."
        isFocused={focusedField === 'phoneNumber'}
        onFocus={() => setFocusedField('phoneNumber')}
        onBlur={() => setFocusedField('')}
        maxLength={11}
        textContentType="telephoneNumber"
        autoComplete="off"
        importantForAutofill="no"
        icon="phone-outline"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => licensePlateInputRef.current?.focus()}
      />

      <DatePickerField
        label="Birthday"
        value={form.birthday}
        onChange={(value) => {
          setForm((currentForm) => ({
            ...currentForm,
            birthday: value,
          }));
          setErrors((currentErrors) => ({
            ...currentErrors,
            birthday: '',
          }));
        }}
        placeholder="Select your birthday"
        error={errors.birthday}
        helperText={
          selectedAge !== null
            ? `Age: ${selectedAge} years old.`
            : 'Use the quick Year -> Month -> Day picker.'
        }
      />

      <FormField
        label="License Plate"
        ref={licensePlateInputRef}
        value={form.licensePlate}
        onChangeText={(value) => handleFieldChange('licensePlate', value)}
        placeholder="ABC 1234"
        autoCapitalize="characters"
        error={errors.licensePlate}
        isFocused={focusedField === 'licensePlate'}
        onFocus={() => setFocusedField('licensePlate')}
        onBlur={() => setFocusedField('')}
        autoComplete="off"
        importantForAutofill="no"
        icon="card-text-outline"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => vehicleModelInputRef.current?.focus()}
      />

      <FormField
        label="Vehicle Make/Model"
        ref={vehicleModelInputRef}
        value={form.vehicleModel}
        onChangeText={(value) => handleFieldChange('vehicleModel', value)}
        placeholder="Toyota Vios"
        autoCapitalize="words"
        error={errors.vehicleModel}
        isFocused={focusedField === 'vehicleModel'}
        onFocus={() => setFocusedField('vehicleModel')}
        onBlur={() => setFocusedField('')}
        autoComplete="off"
        importantForAutofill="no"
        icon="car-outline"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordInputRef.current?.focus()}
      />

      <PasswordField
        label="Password"
        ref={passwordInputRef}
        value={form.password}
        onChangeText={(value) => handleFieldChange('password', value)}
        placeholder="Create a strong password"
        error={errors.password}
        hideErrorText
        isFocused={focusedField === 'password'}
        onFocus={() => setFocusedField('password')}
        onBlur={() => setFocusedField('')}
        textContentType="newPassword"
        autoComplete="off"
        importantForAutofill="no"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
      />

      <PasswordChecklist password={form.password} visible={shouldShowPasswordChecklist} />

      <PasswordField
        label="Re-enter Password"
        value={form.confirmPassword}
        onChangeText={(value) => handleFieldChange('confirmPassword', value)}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
        isFocused={focusedField === 'confirmPassword'}
        onFocus={() => setFocusedField('confirmPassword')}
        onBlur={() => setFocusedField('')}
        textContentType="password"
        autoComplete="off"
        importantForAutofill="no"
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      <Text style={styles.footerText}>
        By registering, you agree to our{' '}
        <Text style={styles.footerLink} onPress={() => Alert.alert('Terms of Service', 'Prototype link opened.')}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={styles.footerLink} onPress={() => Alert.alert('Privacy Policy', 'Prototype link opened.')}>
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

      <View style={styles.signInRow}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <Text style={styles.signInLink} onPress={() => navigation.navigate('Login')}>
          Sign In
        </Text>
      </View>
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
  nameField: {
    flex: 1,
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
  footerLink: {
    color: colors.primary,
    fontWeight: '800',
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
  signInRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  signInText: {
    color: colors.mutedText,
    fontSize: 15,
  },
  signInLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  formErrorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
});
