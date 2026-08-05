import { Image, Text, TouchableOpacity, View } from 'react-native'

import DatePickerField from '../../components/DatePickerField'
import FormField from '../../components/FormField'
import PasswordChecklist from '../../components/PasswordChecklist'
import { notificationPreferenceOptions } from './dashboardNavigationModel.mjs'
import { LoyaltyTransactionRow } from './DashboardActivityComponents'
import {
  MenuRow,
  NotificationPreferenceToggleRow,
  PasswordFieldRow,
  ScreenBackHeader,
} from './DashboardProfileComponents'
import DashboardScrollRegion from './DashboardScrollRegion'
import styles from './dashboardStyles'
import {
  buildCustomerProfileSummary,
  normalizeProfileMenuScreen,
} from './profileMenuPresentationModel.mjs'

function SettingsMenu({ onNavigate }) {
  return (
    <>
      <ScreenBackHeader
        title="Account & Profile Settings"
        subtitle="Manage your profile, security, and rewards."
        onBack={() => onNavigate('root')}
      />
      <MenuRow
        icon="account-outline"
        label="Personal Information"
        onPress={() => onNavigate('personal')}
      />
      <MenuRow
        icon="lock-outline"
        label="Login / Security"
        onPress={() => onNavigate('security')}
      />
      <MenuRow
        icon="gift-outline"
        label="Gift Center"
        onPress={() => onNavigate('gift')}
      />
    </>
  )
}

function PersonalInformation({
  account,
  isProfileEditing,
  profileForm,
  profileErrors,
  onNavigate,
  onChangeProfilePhoto,
  onStartProfileEdit,
  onProfileFieldChange,
  onSaveProfile,
  onCancelProfileEdit,
  onDeleteAccount,
}) {
  const profile = buildCustomerProfileSummary(account)

  return (
    <>
      <ScreenBackHeader
        title="Personal Information"
        subtitle="Update the details connected to your AutoCare account."
        onBack={() => onNavigate('settings')}
      />

      <View style={styles.profileImageSection}>
        <View style={styles.largeAvatarWrap}>
          {account?.profileImage ? (
            <Image
              source={{ uri: account.profileImage }}
              style={styles.largeProfileImage}
              accessible={false}
            />
          ) : (
            <Text style={styles.largeAvatarInitials}>{profile.initials}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onChangeProfilePhoto}
          accessibilityRole="button"
          accessibilityLabel="Change profile image"
        >
          <Text style={styles.changeImageLink}>Change Profile Image</Text>
        </TouchableOpacity>
      </View>

      {!isProfileEditing ? (
        <TouchableOpacity
          style={[styles.secondaryButton, styles.editProfileButton]}
          onPress={onStartProfileEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit personal information"
        >
          <Text style={styles.secondaryButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      ) : null}

      <FormField
        label="Full Name"
        value={profileForm.fullName}
        onChangeText={(value) => onProfileFieldChange('fullName', value)}
        placeholder="Jasper Sanchez"
        autoCapitalize="words"
        error={profileErrors.fullName}
        editable={isProfileEditing}
      />
      <FormField
        label="Email"
        value={profileForm.email}
        onChangeText={(value) => onProfileFieldChange('email', value)}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={profileErrors.email}
        editable={false}
      />
      <FormField
        label="Phone"
        value={profileForm.phoneNumber}
        onChangeText={(value) => onProfileFieldChange('phoneNumber', value)}
        placeholder="09XXXXXXXXX"
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={11}
        error={profileErrors.phoneNumber}
        editable={isProfileEditing}
      />
      <FormField
        label="City"
        value={profileForm.city}
        onChangeText={(value) => onProfileFieldChange('city', value)}
        placeholder="Quezon City"
        autoCapitalize="words"
        error={profileErrors.city}
        editable={false}
      />

      <FormField
        label="Gender"
        value={profileForm.gender}
        onChangeText={() => null}
        placeholder=""
        editable={false}
      />

      <DatePickerField
        label="Birthdate"
        value={profileForm.birthday}
        onChange={(value) => onProfileFieldChange('birthday', value)}
        placeholder="Select your birthdate"
        error={profileErrors.birthday}
        helperText="Use the quick Year -> Month -> Day picker."
        editable={isProfileEditing}
      />

      {isProfileEditing ? (
        <>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onSaveProfile}
            accessibilityRole="button"
            accessibilityLabel="Save personal information"
          >
            <Text style={styles.primaryButtonText}>Save Information</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onCancelProfileEdit}
            accessibilityRole="button"
            accessibilityLabel="Cancel profile editing"
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.deleteSection}>
        <Text style={styles.deleteTitle}>Delete your data and account</Text>
        <Text style={styles.deleteDescription}>
          This archives your account, signs you out, and frees the same email so it can be used
          again later. Workshop history stays preserved on the backend.
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDeleteAccount}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

function SecuritySettings({
  securityForm,
  securityErrors,
  passwordVisibility,
  securitySubmitting,
  onNavigate,
  onSecurityFieldChange,
  onTogglePasswordVisibility,
  onSavePassword,
}) {
  return (
    <>
      <ScreenBackHeader
        title="Login / Security"
        subtitle="Change your password and verify it with OTP before saving."
        onBack={() => onNavigate('settings')}
      />
      <PasswordFieldRow
        label="Current Password"
        value={securityForm.currentPassword}
        onChangeText={(value) => onSecurityFieldChange('currentPassword', value)}
        placeholder="Enter your current password"
        error={securityErrors.currentPassword}
        visible={passwordVisibility.currentPassword}
        onToggleVisibility={() => onTogglePasswordVisibility('currentPassword')}
      />
      <PasswordFieldRow
        label="New Password"
        value={securityForm.newPassword}
        onChangeText={(value) => onSecurityFieldChange('newPassword', value)}
        placeholder="Create a new password"
        error={securityErrors.newPassword}
        visible={passwordVisibility.newPassword}
        onToggleVisibility={() => onTogglePasswordVisibility('newPassword')}
      />
      <PasswordChecklist password={securityForm.newPassword} />
      <PasswordFieldRow
        label="Confirm New Password"
        value={securityForm.confirmPassword}
        onChangeText={(value) => onSecurityFieldChange('confirmPassword', value)}
        placeholder="Re-enter your new password"
        error={securityErrors.confirmPassword}
        visible={passwordVisibility.confirmPassword}
        onToggleVisibility={() => onTogglePasswordVisibility('confirmPassword')}
      />
      <TouchableOpacity
        style={[styles.primaryButton, securitySubmitting && styles.primaryButtonDisabled]}
        onPress={onSavePassword}
        disabled={securitySubmitting}
        accessibilityRole="button"
        accessibilityLabel="Save password"
        accessibilityState={{ disabled: securitySubmitting, busy: securitySubmitting }}
      >
        <Text style={styles.primaryButtonText}>
          {securitySubmitting ? 'Sending verification code...' : 'Save Password'}
        </Text>
      </TouchableOpacity>
    </>
  )
}

function GiftCenter({ loyaltyTransactions, onBack }) {
  return (
    <>
      <ScreenBackHeader
        title="Gift Center"
        subtitle="Rewards and gift redemptions from Cruisers Crib."
        onBack={onBack}
      />
      {loyaltyTransactions.length ? (
        <View style={styles.loyaltyActivityCard}>
          <Text style={styles.loyaltyActivityTitle}>Recent Loyalty Activity</Text>
          <Text style={styles.loyaltyActivitySubtitle}>
            Points earned and redeemed through your customer account.
          </Text>
          {loyaltyTransactions.slice(0, 5).map((item) => (
            <LoyaltyTransactionRow key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>No loyalty activity yet</Text>
          <Text style={styles.infoText}>
            Earn points from qualifying paid services, then return here to review them.
          </Text>
        </View>
      )}
    </>
  )
}

function NotificationPreferences({
  notificationModuleState,
  onNavigate,
  onUpdateNotificationPreference,
}) {
  return (
    <>
      <ScreenBackHeader
        title="Notification Preferences"
        subtitle="Choose which customer updates should reach your account."
        onBack={() => onNavigate('root')}
      />
      {notificationModuleState.errorMessage ? (
        <View style={styles.infoBlock} accessibilityRole="alert">
          <Text style={styles.infoTitle}>Notification sync issue</Text>
          <Text style={styles.infoText}>{notificationModuleState.errorMessage}</Text>
        </View>
      ) : null}
      {notificationModuleState.status === 'loading' &&
      !notificationModuleState.preferences ? (
        <View style={styles.infoBlock} accessibilityLiveRegion="polite">
          <Text style={styles.infoTitle}>Loading preferences</Text>
          <Text style={styles.infoText}>Loading your current notification settings.</Text>
        </View>
      ) : null}
      {notificationModuleState.preferences ? (
        <View style={styles.preferenceCard}>
          {notificationPreferenceOptions.map((item) => (
            <NotificationPreferenceToggleRow
              key={item.key}
              label={item.label}
              description={item.description}
              value={notificationModuleState.preferences?.[item.key]}
              disabled={notificationModuleState.savingKey === item.key}
              onValueChange={(value) => onUpdateNotificationPreference(item.key, value)}
            />
          ))}
        </View>
      ) : null}
    </>
  )
}

function SavedItems({ onNavigate }) {
  return (
    <>
      <ScreenBackHeader
        title="Saved Items"
        subtitle="Saved services and bookmarks will appear here."
        onBack={() => onNavigate('root')}
      />
      <View style={styles.infoBlock}>
        <Text style={styles.infoTitle}>No saved items yet</Text>
        <Text style={styles.infoText}>
          Saved services and offers will appear here when that feature becomes available.
        </Text>
      </View>
    </>
  )
}

export default function DashboardAccountPanel({
  isWeb,
  isVeryCompactPhone,
  screen,
  account,
  isProfileEditing,
  profileForm,
  profileErrors,
  securityForm,
  securityErrors,
  passwordVisibility,
  securitySubmitting,
  loyaltyTransactions,
  notificationModuleState,
  onNavigate,
  onChangeProfilePhoto,
  onStartProfileEdit,
  onProfileFieldChange,
  onSaveProfile,
  onCancelProfileEdit,
  onDeleteAccount,
  onSecurityFieldChange,
  onTogglePasswordVisibility,
  onSavePassword,
  onGiftBack,
  onUpdateNotificationPreference,
}) {
  const normalizedScreen = normalizeProfileMenuScreen(screen)
  let content = <SettingsMenu onNavigate={onNavigate} />

  if (normalizedScreen === 'personal') {
    content = (
      <PersonalInformation
        account={account}
        isProfileEditing={isProfileEditing}
        profileForm={profileForm}
        profileErrors={profileErrors}
        onNavigate={onNavigate}
        onChangeProfilePhoto={onChangeProfilePhoto}
        onStartProfileEdit={onStartProfileEdit}
        onProfileFieldChange={onProfileFieldChange}
        onSaveProfile={onSaveProfile}
        onCancelProfileEdit={onCancelProfileEdit}
        onDeleteAccount={onDeleteAccount}
      />
    )
  } else if (normalizedScreen === 'security') {
    content = (
      <SecuritySettings
        securityForm={securityForm}
        securityErrors={securityErrors}
        passwordVisibility={passwordVisibility}
        securitySubmitting={securitySubmitting}
        onNavigate={onNavigate}
        onSecurityFieldChange={onSecurityFieldChange}
        onTogglePasswordVisibility={onTogglePasswordVisibility}
        onSavePassword={onSavePassword}
      />
    )
  } else if (normalizedScreen === 'gift') {
    content = <GiftCenter loyaltyTransactions={loyaltyTransactions} onBack={onGiftBack} />
  } else if (normalizedScreen === 'notificationPreferences') {
    content = (
      <NotificationPreferences
        notificationModuleState={notificationModuleState}
        onNavigate={onNavigate}
        onUpdateNotificationPreference={onUpdateNotificationPreference}
      />
    )
  } else if (normalizedScreen === 'saved') {
    content = <SavedItems onNavigate={onNavigate} />
  }

  return (
    <DashboardScrollRegion
      contentStyle={styles.scrollContent}
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
    >
      {content}
    </DashboardScrollRegion>
  )
}
