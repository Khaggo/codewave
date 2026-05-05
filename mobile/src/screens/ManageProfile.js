import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FormField from '../components/FormField';
import ScreenShell from '../components/ScreenShell';
import { colors, radius } from '../theme';
import {
  calculateAge,
  formatVehicleDisplayName,
  formatDate,
  normalizePhoneNumber,
  normalizeVehicleYear,
  validateProfileForm,
} from '../utils/validation';

export default function ManageProfile({ navigation, account, onSaveProfile }) {
  const createProfileForm = (profile) => ({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    username: profile?.username || '',
    birthday: profile?.birthday || null,
    phoneNumber: profile?.phoneNumber || '',
    address: profile?.address || '',
    licensePlate: profile?.licensePlate || '',
    vehicleMake: profile?.vehicleMake || '',
    vehicleModel: profile?.vehicleModel || '',
    vehicleColor: profile?.vehicleColor || '',
    vehicleYear:
      profile?.vehicleYear !== null && profile?.vehicleYear !== undefined
        ? String(profile.vehicleYear)
        : '',
  });

  const [form, setForm] = useState(createProfileForm(account));
  const [isEditing, setIsEditing] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [errors, setErrors] = useState({});
  const selectedAge = calculateAge(form.birthday);

  useEffect(() => {
    setForm(createProfileForm(account));
  }, [account]);

  const handleFieldChange = (key, value) => {
    let nextValue = value;

    if (key === 'phoneNumber') {
      nextValue = normalizePhoneNumber(value);
    }

    if (key === 'licensePlate') {
      nextValue = value.toUpperCase();
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
  };

  const handleSave = () => {
    const nextErrors = validateProfileForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSaveProfile({
      phoneNumber: normalizePhoneNumber(form.phoneNumber),
      address: form.address.trim(),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      vehicleMake: form.vehicleMake.trim(),
      vehicleModel: form.vehicleModel.trim(),
      vehicleColor: form.vehicleColor.trim(),
      vehicleYear: Number(normalizeVehicleYear(form.vehicleYear)),
      vehicleDisplayName: formatVehicleDisplayName({
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        vehicleYear: form.vehicleYear,
      }),
    });

    setIsEditing(false);
    Alert.alert('Profile Updated', 'Your profile details were saved successfully.');
  };

  return (
    <ScreenShell contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PROFILE DETAILS</Text>
          <Text style={styles.title}>Manage your account</Text>
          <Text style={styles.subtitle}>
            Review your stored details and update your contact or vehicle information when needed.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.editButton, isEditing && styles.editButtonActive]}
          onPress={() => {
            if (isEditing) {
              setForm(createProfileForm(account));
              setErrors({});
              setIsEditing(false);
              return;
            }

            setIsEditing(true);
          }}
        >
          <Text style={[styles.editButtonText, isEditing && styles.editButtonTextActive]}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <FormField
        label="First Name"
        value={form.firstName}
        onChangeText={() => null}
        placeholder=""
        editable={false}
        helperText="Name is shown for reference only."
      />

      <FormField
        label="Last Name"
        value={form.lastName}
        onChangeText={() => null}
        placeholder=""
        editable={false}
      />

      <FormField
        label="Email Address"
        value={form.email}
        onChangeText={() => null}
        placeholder=""
        editable={false}
      />

      <FormField
        label="Username"
        value={form.username}
        onChangeText={() => null}
        placeholder=""
        editable={false}
        helperText="Username is fixed in this prototype."
      />

      <FormField
        label="Birthday"
        value={formatDate(form.birthday)}
        onChangeText={() => null}
        placeholder=""
        editable={false}
        helperText={
          selectedAge !== null
            ? `Birthday is locked after registration. Current age: ${selectedAge}.`
            : 'Birthday is locked after registration.'
        }
      />

      <FormField
        label="Phone Number"
        value={form.phoneNumber}
        onChangeText={(value) => handleFieldChange('phoneNumber', value)}
        placeholder="09XXXXXXXXX"
        keyboardType="number-pad"
        autoCapitalize="none"
        error={errors.phoneNumber}
        isFocused={focusedField === 'phoneNumber'}
        onFocus={() => setFocusedField('phoneNumber')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
        maxLength={11}
        helperText={isEditing ? 'Editable in PH mobile format.' : ''}
      />

      <FormField
        label="Address"
        value={form.address}
        onChangeText={(value) => handleFieldChange('address', value)}
        placeholder="Street, City, Province"
        autoCapitalize="words"
        error={errors.address}
        isFocused={focusedField === 'address'}
        onFocus={() => setFocusedField('address')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
      />

      <FormField
        label="Vehicle Plate"
        value={form.licensePlate}
        onChangeText={(value) => handleFieldChange('licensePlate', value)}
        placeholder="ABC 1234"
        autoCapitalize="characters"
        error={errors.licensePlate}
        isFocused={focusedField === 'licensePlate'}
        onFocus={() => setFocusedField('licensePlate')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
      />

      <FormField
        label="Vehicle Make"
        value={form.vehicleMake}
        onChangeText={(value) => handleFieldChange('vehicleMake', value)}
        placeholder="Toyota"
        autoCapitalize="words"
        error={errors.vehicleMake}
        isFocused={focusedField === 'vehicleMake'}
        onFocus={() => setFocusedField('vehicleMake')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
      />

      <FormField
        label="Vehicle Model"
        value={form.vehicleModel}
        onChangeText={(value) => handleFieldChange('vehicleModel', value)}
        placeholder="Vios"
        autoCapitalize="words"
        error={errors.vehicleModel}
        isFocused={focusedField === 'vehicleModel'}
        onFocus={() => setFocusedField('vehicleModel')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
      />

      <FormField
        label="Vehicle Color"
        value={form.vehicleColor}
        onChangeText={(value) => handleFieldChange('vehicleColor', value)}
        placeholder="Silver"
        autoCapitalize="words"
        error={errors.vehicleColor}
        isFocused={focusedField === 'vehicleColor'}
        onFocus={() => setFocusedField('vehicleColor')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
      />

      <FormField
        label="Vehicle Year"
        value={form.vehicleYear}
        onChangeText={(value) => handleFieldChange('vehicleYear', value)}
        placeholder="2022"
        keyboardType="number-pad"
        autoCapitalize="none"
        error={errors.vehicleYear}
        isFocused={focusedField === 'vehicleYear'}
        onFocus={() => setFocusedField('vehicleYear')}
        onBlur={() => setFocusedField('')}
        editable={isEditing}
        maxLength={4}
      />

      {isEditing ? (
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
          <Text style={styles.primaryButtonText}>Save Changes</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ChangePassword')}>
        <Text style={styles.secondaryButtonText}>Change Password</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingBottom: 36,
  },
  headerRow: {
    marginBottom: 22,
  },
  headerCopy: {
    marginBottom: 16,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  editButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.medium,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonActive: {
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  editButtonTextActive: {
    color: colors.text,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
