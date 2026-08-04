import { forwardRef, useId, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '../theme';
import { createPlatformShadow } from '../utils/platformShadow';

const PasswordField = forwardRef(function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  isFocused,
  onFocus,
  onBlur,
  editable = true,
  textContentType = 'password',
  hideErrorText = false,
  containerStyle,
  icon = 'lock-outline',
  autoComplete = 'off',
  importantForAutofill = Platform.OS === 'android' ? 'noExcludeDescendants' : 'no',
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  nativeID,
  name,
  accessibilityLabel,
  accessibilityHint,
}, ref) {
  const [isVisible, setIsVisible] = useState(false);
  const generatedId = useId();
  const fieldId = nativeID || `password-${generatedId}`;
  const labelId = `${fieldId}-label`;
  const descriptionId = `${fieldId}-description`;

  return (
    <View
      style={[styles.container, containerStyle]}
      importantForAutofill={importantForAutofill}
    >
      {label ? <Text nativeID={labelId} style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrap,
          isFocused && editable && styles.inputFocused,
          !editable && styles.inputReadonly,
          error && styles.inputError,
        ]}
        importantForAutofill={importantForAutofill}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={colors.mutedText}
          style={styles.leadingIcon}
        />

        <TextInput
          ref={ref}
          nativeID={fieldId}
          name={Platform.OS === 'web' ? name : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          style={[styles.input, !editable && styles.inputReadonlyText]}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={editable}
          textContentType={Platform.OS === 'ios' ? textContentType : 'none'}
          autoComplete={autoComplete}
          importantForAutofill={importantForAutofill}
          disableFullscreenUI
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          selectionColor={colors.primary}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={accessibilityHint}
          accessibilityLabelledBy={label ? labelId : undefined}
          accessibilityDescribedBy={error || helperText ? descriptionId : undefined}
          accessibilityState={{ disabled: !editable }}
          aria-invalid={Platform.OS === 'web' ? Boolean(error) : undefined}
        />

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsVisible((currentValue) => !currentValue)}
          disabled={!editable}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          accessibilityState={{ disabled: !editable }}
        >
          <MaterialCommunityIcons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.mutedText}
          />
        </TouchableOpacity>
      </View>

      {error && !hideErrorText ? (
        <Text nativeID={descriptionId} style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {!error && helperText ? <Text nativeID={descriptionId} style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
});

export default PasswordField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    minWidth: 0,
  },
  label: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: colors.primary,
    ...createPlatformShadow({
      color: colors.primary,
      opacity: 0.18,
      radius: 10,
      elevation: 2,
    }),
  },
  inputReadonly: {
    backgroundColor: colors.readonly,
  },
  inputReadonlyText: {
    color: colors.mutedText,
  },
  inputError: {
    borderColor: colors.danger,
  },
  toggleButton: {
    alignItems: 'center',
    paddingLeft: 8,
    paddingHorizontal: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  helperText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});
