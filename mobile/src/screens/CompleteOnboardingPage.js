import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AuthFrame from '../components/AuthFrame';
import DatePickerField from '../components/DatePickerField';
import FormField from '../components/FormField';
import { ApiError } from '../lib/authClient';
import { colors, radius } from '../theme';
import {
  cloneDate,
  formatVehicleDisplayName,
  normalizeVehicleYear,
  validateBirthday,
  validateVehicleYear,
} from '../utils/validation';

const createInitialForm = (draft) => ({
  birthday: cloneDate(draft?.birthday),
  licensePlate: String(draft?.licensePlate ?? ''),
  vehicleMake: String(draft?.vehicleMake ?? ''),
  vehicleModel: String(draft?.vehicleModel ?? ''),
  vehicleYear:
    draft?.vehicleYear !== null && draft?.vehicleYear !== undefined
      ? String(draft.vehicleYear)
      : '',
});

export default function CompleteOnboardingPage({
  navigation,
  onboardingDraft,
  onboardingMessage,
  onComplete,
}) {
  const [form, setForm] = useState(() => createInitialForm(onboardingDraft));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(onboardingMessage ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(createInitialForm(onboardingDraft));
    setErrors({});
    setFormError(onboardingMessage ?? '');
  }, [onboardingDraft, onboardingMessage]);

  const handleFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'licensePlate') {
      nextValue = String(value ?? '').toUpperCase();
    }

    if (key === 'vehicleYear') {
      nextValue = normalizeVehicleYear(value);
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

  const handleSave = () => {
    const nextErrors = {};
    const birthdayError = validateBirthday(form.birthday);
    const vehicleYearError = validateVehicleYear(form.vehicleYear);

    if (birthdayError) {
      nextErrors.birthday = birthdayError;
    }

    if (!form.licensePlate.trim()) {
      nextErrors.licensePlate = 'Enter your vehicle plate.';
    }

    if (!form.vehicleMake.trim()) {
      nextErrors.vehicleMake = 'Enter your vehicle make.';
    }

    if (!form.vehicleModel.trim()) {
      nextErrors.vehicleModel = 'Enter your vehicle model.';
    }

    if (vehicleYearError) {
      nextErrors.vehicleYear = vehicleYearError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const submitCompletion = async () => {
      setSubmitting(true);
      setFormError('');

      try {
        await onComplete({
          ...onboardingDraft,
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
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Menu' }],
        });
      } catch (error) {
        setFormError(
          error instanceof ApiError
            ? error.message
            : 'Unable to finish saving your profile right now. Please try again.',
        );
      } finally {
        setSubmitting(false);
      }
    };

    void submitCompletion();
  };

  return (
    <AuthFrame
      title="Complete Your Profile"
      subtitle="Your account is already verified. We just need to finish saving your birthday and first vehicle before you continue."
      centerContent
    >
      {formError ? (
        <View style={styles.notice}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.noticeText}>{formError}</Text>
        </View>
      ) : null}

      <DatePickerField
        label="Birthday"
        value={form.birthday}
        onChange={(value) => handleFieldChange('birthday', value)}
        placeholder="Select your birthday"
        error={errors.birthday}
      />

      <FormField
        label="Vehicle Plate"
        value={form.licensePlate}
        onChangeText={(value) => handleFieldChange('licensePlate', value)}
        placeholder="ABC 1234"
        autoCapitalize="characters"
        error={errors.licensePlate}
        icon="card-text-outline"
        textContentType="none"
        autoComplete="off"
        importantForAutofill="no"
      />

      <View style={styles.nameRow}>
        <FormField
          label="Vehicle Make"
          value={form.vehicleMake}
          onChangeText={(value) => handleFieldChange('vehicleMake', value)}
          placeholder="Toyota"
          autoCapitalize="words"
          error={errors.vehicleMake}
          icon="car-info"
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
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
          icon="calendar-range"
          textContentType="none"
          autoComplete="off"
          importantForAutofill="no"
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
        icon="car-side"
        textContentType="none"
        autoComplete="off"
        importantForAutofill="no"
      />

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
        onPress={handleSave}
        activeOpacity={0.88}
        disabled={submitting}
      >
        <View style={styles.primaryButtonContent}>
          {submitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Finish Setup</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
            </>
          )}
        </View>
      </TouchableOpacity>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  nameField: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
});
