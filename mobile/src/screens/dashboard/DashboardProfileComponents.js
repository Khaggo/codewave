import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  Image,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { colors } from '../../theme'
import MotionPressable from './MotionPressable'
import styles from './dashboardStyles'
import { getNotificationStatusLabel } from './dashboardCardPresentationModel.mjs'

export function MenuRow({ icon, label, onPress, rightLabel, danger = false }) {
  return (
    <MotionPressable
      style={styles.menuRow}
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={rightLabel ? `${label}. ${rightLabel}` : label}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger]}>
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={danger ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.menuCopy}>
          <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
          {rightLabel ? <Text style={styles.menuMeta}>{rightLabel}</Text> : null}
        </View>
      </View>
      <Text style={[styles.menuArrow, danger && styles.menuArrowDanger]}>{'>'}</Text>
    </MotionPressable>
  )
}

export function NotificationPreferenceToggleRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
}) {
  const isEnabled = Boolean(value)

  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{label}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      {Platform.OS === 'web' ? (
        <TouchableOpacity
          style={[
            styles.preferenceSwitchTarget,
            disabled && styles.preferenceSwitchTargetDisabled,
          ]}
          onPress={() => onValueChange(!isEnabled)}
          disabled={disabled}
          activeOpacity={0.82}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityHint={description}
          accessibilityState={{ checked: isEnabled, disabled: Boolean(disabled) }}
          aria-checked={isEnabled}
        >
          <View
            style={[
              styles.preferenceSwitchTrack,
              isEnabled && styles.preferenceSwitchTrackActive,
            ]}
          >
            <View
              style={[
                styles.preferenceSwitchThumb,
                isEnabled && styles.preferenceSwitchThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      ) : (
        <Switch
          value={isEnabled}
          disabled={disabled}
          onValueChange={onValueChange}
          trackColor={{ false: '#2D334A', true: colors.primary }}
          thumbColor={isEnabled ? '#FFF5EB' : '#E6E9F5'}
          hitSlop={12}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityHint={description}
          accessibilityState={{ checked: isEnabled, disabled: Boolean(disabled) }}
        />
      )}
    </View>
  )
}

export function ScreenBackHeader({ title, subtitle, onBack }) {
  return (
    <View style={styles.subHeader}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={`Back from ${title}`}
      >
        <Text style={styles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      <View style={styles.subHeaderCopy}>
        <Text style={styles.subHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  )
}

export function PasswordFieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  visible,
  onToggleVisibility,
}) {
  return (
    <View style={styles.passwordFieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.passwordInputWrap, error && styles.passwordInputWrapError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.passwordInput}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          accessibilityHint={error || undefined}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={onToggleVisibility}
          accessibilityRole="button"
          accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          <MaterialCommunityIcons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.mutedText}
          />
          <Text style={styles.eyeButtonText}>{visible ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  )
}

export function ActionIconButton({ icon, onPress, accessibilityLabel }) {
  return (
    <MotionPressable
      style={styles.actionIconButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <MaterialCommunityIcons name={icon} size={20} color={colors.labelText} />
    </MotionPressable>
  )
}

export function NotificationIconButton({ count, onPress }) {
  return (
    <MotionPressable
      style={styles.actionIconButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open notifications, ${count} unread`}
    >
      <MaterialCommunityIcons name="bell-outline" size={20} color={colors.labelText} />
      {count > 0 ? (
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>{count}</Text>
        </View>
      ) : null}
    </MotionPressable>
  )
}

export function ProfileAvatarButton({
  account,
  onPress,
  onChangePhoto,
  showTooltip,
  onHoverIn,
  onHoverOut,
}) {
  const initials = `${account?.firstName?.[0] || 'J'}${account?.lastName?.[0] || 'D'}`

  return (
    <View
      style={styles.profileAvatarAnchor}
      onMouseEnter={Platform.OS === 'web' ? onHoverIn : undefined}
      onMouseLeave={Platform.OS === 'web' ? onHoverOut : undefined}
    >
      <MotionPressable
        style={styles.homeAvatar}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        {account?.profileImage ? (
          <Image source={{ uri: account.profileImage }} style={styles.homeAvatarImage} />
        ) : (
          <Text style={styles.homeAvatarText}>{initials}</Text>
        )}
      </MotionPressable>

      {showTooltip ? (
        <View style={styles.profileHoverCard}>
          <Text style={styles.profileHoverTitle}>Change Profile</Text>
          <Text style={styles.profileHoverText}>Upload a new photo from your gallery.</Text>
          <MotionPressable
            style={styles.profileHoverButton}
            onPress={onChangePhoto}
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel="Choose profile photo"
          >
            <Text style={styles.profileHoverButtonText}>Choose Photo</Text>
          </MotionPressable>
        </View>
      ) : null}
    </View>
  )
}

export function NotificationRow({ item, onDismiss, onOpen }) {
  const requiresAction = item.requiresAction
  const statusLabel = getNotificationStatusLabel(item)

  return (
    <View style={styles.notificationRow}>
      <View style={[styles.notificationIconWrap, { backgroundColor: item.bgColor }]}>
        <MaterialCommunityIcons name={item.icon} size={18} color={item.tint} />
      </View>

      <TouchableOpacity
        style={styles.notificationCopy}
        onPress={onOpen}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${statusLabel}. ${item.message}`}
      >
        <View style={styles.notificationTitleRow}>
          {item.unread ? <View style={styles.notificationUnreadDot} /> : null}
          <Text style={styles.notificationRowTitle}>{item.title}</Text>
          <View
            style={[
              styles.notificationStatusPill,
              requiresAction
                ? styles.notificationStatusPillAction
                : styles.notificationStatusPillInformational,
            ]}
          >
            <Text
              style={[
                styles.notificationStatusPillText,
                requiresAction
                  ? styles.notificationStatusPillTextAction
                  : styles.notificationStatusPillTextInformational,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.notificationRowMessage}>{item.message}</Text>
        <Text style={styles.notificationRowTime}>{item.timeLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.notificationDismissButton}
        onPress={onDismiss}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${item.title}`}
      >
        <MaterialCommunityIcons name="close" size={16} color={colors.mutedText} />
      </TouchableOpacity>
    </View>
  )
}

export function ProfileSectionTab({ item, isActive, onPress }) {
  return (
    <MotionPressable
      containerStyle={styles.sectionTabContainer}
      style={[styles.sectionTab, isActive && styles.sectionTabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
    >
      <MaterialCommunityIcons
        name={item.icon}
        size={18}
        color={isActive ? colors.onPrimary : colors.mutedText}
      />
      <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>
        {item.label}
      </Text>
    </MotionPressable>
  )
}
