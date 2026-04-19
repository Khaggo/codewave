import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  normalizePhoneNumber,
  normalizeVehicleYear,
  validateRegisterForm,
} from '../utils/validation';
import { useState } from 'react';

export default function RegisterPage({ navigation, onRegister }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthday: null,
    licensePlate: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const shouldShowPasswordChecklist = form.password.length > 0;

  const handleFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'phoneNumber') {
      nextValue = normalizePhoneNumber(value);
    }

    if (key === 'vehicleYear') {
      nextValue = normalizeVehicleYear(value);
    }

    if (key === 'licensePlate') {
      nextValue = String(value ?? '').toUpperCase();
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
      licensePlate: form.licensePlate.trim().toUpperCase(),
      vehicleMake: form.vehicleMake.trim(),
      vehicleModel: form.vehicleModel.trim(),
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
        const enrollment = await onRegister(trimmedAccount);

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

  return (
    <AuthFrame
      title="Create Account"
      subtitle="Create your account, then confirm the email verification code before the first session starts."
      backLabel="Back to Login"
      onBack={() => navigation.replace('Login')}
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
          textContentType="givenName"
          autoComplete="off"
          importantForAutofill="no"
          icon="account-outline"
          containerStyle={styles.nameField}
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
          containerStyle={styles.nameField}
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

      <View style={styles.nameRow}>
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
          containerStyle={styles.nameField}
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
          containerStyle={styles.nameField}
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

      <Text style={styles.infoText}>
        Your account will be verified first, then the app will save your birthday and first vehicle automatically.
      </Text>

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
        <Text style={styles.signInLink} onPress={() => navigation.replace('Login')}>
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
