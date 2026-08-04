import { forwardRef, useId } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';
import { createPlatformShadow } from '../utils/platformShadow';

const FormField = forwardRef(function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  error,
  isFocused,
  onFocus,
  onBlur,
  editable = true,
  helperText,
  maxLength,
  multiline = false,
  numberOfLines = 1,
  textContentType = 'none',
  hideErrorText = false,
  icon,
  containerStyle,
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
  const generatedId = useId();
  const fieldId = nativeID || `field-${generatedId}`;
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
          multiline && styles.inputWrapMultiline,
        ]}
        importantForAutofill={importantForAutofill}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={colors.mutedText}
            style={[styles.leadingIcon, multiline && styles.leadingIconMultiline]}
          />
        ) : null}

        <TextInput
          ref={ref}
          nativeID={fieldId}
          name={Platform.OS === 'web' ? name : undefined}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            multiline && styles.inputMultiline,
            !editable && styles.inputReadonlyText,
          ]}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={editable}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textContentType={Platform.OS === 'ios' ? textContentType : 'none'}
          autoCorrect={false}
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

export default FormField;

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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  leadingIcon: {
    marginRight: 8,
  },
  leadingIconMultiline: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    paddingVertical: 12,
    fontSize: 14,
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
  inputError: {
    borderColor: colors.danger,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    paddingTop: 0,
    paddingBottom: 12,
    minHeight: 84,
    textAlignVertical: 'top',
  },
  inputReadonlyText: {
    color: colors.mutedText,
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
