import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { ApiError, requestChangePasswordOtp } from '../../lib/authClient';
import {
  normalizePhoneNumber,
  validateChangePasswordForm,
} from '../../utils/validation';
import {
  buildDashboardProfileSavePlan,
  createDashboardProfileForm,
} from './dashboardAccountModel.mjs';

const createSecurityForm = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const createPasswordVisibility = () => ({
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
});

export default function useDashboardAccountController({
  account,
  navigation,
  onCloseProfileTooltip,
  onProfileSaved,
  onSaveProfile,
  onStartDeleteAccountOtp,
}) {
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(() =>
    createDashboardProfileForm(account),
  );
  const [profileErrors, setProfileErrors] = useState({});
  const [securityForm, setSecurityForm] = useState(createSecurityForm);
  const [securityErrors, setSecurityErrors] = useState({});
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState(
    createPasswordVisibility,
  );

  useEffect(() => {
    setProfileForm(createDashboardProfileForm(account));
  }, [account]);

  const selectProfileImage = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert(
        'Profile Photo',
        'Profile photo upload is currently available on web only.',
      );
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onCloseProfileTooltip?.();
          Alert.alert(
            'Profile Photo',
            'Profile photo upload is not connected to your live customer profile yet.',
          );
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const openDeleteAccount = () => {
    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteModalVisible(true);
  };

  const cancelDeleteAccount = () => {
    if (deleteSubmitting) {
      return;
    }

    setDeletePassword('');
    setDeletePasswordError('');
    setIsDeleteModalVisible(false);
  };

  const changeDeletePassword = (value) => {
    setDeletePassword(value);
    if (deletePasswordError) {
      setDeletePasswordError('');
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeletePasswordError('Enter your current password to continue.');
      return;
    }
    if (!onStartDeleteAccountOtp) {
      setDeletePasswordError(
        'Delete account is unavailable right now. Please try again later.',
      );
      return;
    }

    setDeleteSubmitting(true);
    setDeletePasswordError('');

    try {
      const enrollment = await onStartDeleteAccountOtp({
        currentPassword: deletePassword,
      });
      setIsDeleteModalVisible(false);
      setDeletePassword('');
      setDeletePasswordError('');
      navigation.navigate('OTP', {
        email: account?.email,
        maskedEmail: enrollment?.maskedEmail ?? account?.email,
        enrollmentId: enrollment?.enrollmentId,
        otpExpiresAt: enrollment?.otpExpiresAt,
        otpPurpose: 'deleteAccount',
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We could not start account deletion right now. Please try again.';
      setDeletePasswordError(message);
      Alert.alert('Delete Account', message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const changeProfileField = (key, value) => {
    const nextValue =
      key === 'phoneNumber'
        ? normalizePhoneNumber(value)
        : key === 'email'
          ? value.trimStart()
          : value;
    setProfileForm((currentForm) => ({
      ...currentForm,
      [key]: nextValue,
    }));
    setProfileErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
    }));
  };

  const startProfileEdit = () => {
    setIsProfileEditing(true);
  };

  const cancelProfileEdit = () => {
    setProfileForm(createDashboardProfileForm(account));
    setProfileErrors({});
    setIsProfileEditing(false);
  };

  const saveProfile = async () => {
    const plan = buildDashboardProfileSavePlan({ account, profileForm });
    if (Object.keys(plan.errors).length) {
      setProfileErrors(plan.errors);
      return;
    }
    if (plan.unsupportedChanges.length) {
      Alert.alert(
        'Profile Fields Locked',
        `The ${plan.unsupportedChanges.join(', ')} field${
          plan.unsupportedChanges.length > 1 ? 's are' : ' is'
        } still read-only in this build. Save your supported profile changes without editing those fields.`,
      );
      return;
    }

    try {
      await onSaveProfile?.(plan.payload);
      Alert.alert(
        'Profile Saved',
        'Your personal information has been updated.',
      );
      setIsProfileEditing(false);
      onProfileSaved?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not save your profile changes right now.';
      Alert.alert('Profile Save Failed', message);
    }
  };

  const changeSecurityField = (key, value) => {
    const nextForm = {
      ...securityForm,
      [key]: value,
    };
    setSecurityForm(nextForm);
    setSecurityErrors((currentErrors) => ({
      ...currentErrors,
      [key]: '',
      ...(key === 'newPassword' || key === 'confirmPassword'
        ? {
            confirmPassword:
              nextForm.confirmPassword &&
              nextForm.newPassword !== nextForm.confirmPassword
                ? 'Passwords do not match.'
                : '',
          }
        : {}),
    }));
  };

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const savePassword = async () => {
    const nextErrors = validateChangePasswordForm(securityForm);
    if (Object.keys(nextErrors).length) {
      setSecurityErrors(nextErrors);
      return;
    }

    setSecuritySubmitting(true);
    try {
      const enrollment = await requestChangePasswordOtp({
        currentPassword: securityForm.currentPassword,
        accessToken: account?.accessToken,
      });
      navigation.navigate('OTP', {
        email: account?.email ?? null,
        maskedEmail: enrollment?.maskedEmail ?? account?.email ?? null,
        enrollmentId: enrollment?.enrollmentId ?? null,
        otpExpiresAt: enrollment?.otpExpiresAt ?? null,
        otpPurpose: 'passwordChange',
        currentPassword: securityForm.currentPassword,
        pendingPassword: securityForm.newPassword,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not start password change verification right now.';
      setSecurityErrors((currentErrors) => ({
        ...currentErrors,
        currentPassword: message,
      }));
      Alert.alert('Password Change Failed', message);
    } finally {
      setSecuritySubmitting(false);
    }
  };

  return {
    cancelDeleteAccount,
    cancelProfileEdit,
    changeDeletePassword,
    changeProfileField,
    changeSecurityField,
    confirmDeleteAccount,
    deletePassword,
    deletePasswordError,
    deleteSubmitting,
    isDeleteModalVisible,
    isProfileEditing,
    openDeleteAccount,
    passwordVisibility,
    profileErrors,
    profileForm,
    savePassword,
    saveProfile,
    securityErrors,
    securityForm,
    securitySubmitting,
    selectProfileImage,
    startProfileEdit,
    togglePasswordVisibility,
  };
}
