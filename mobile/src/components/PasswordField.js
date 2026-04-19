import { forwardRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '../theme';

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
}, ref) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View
      style={[styles.container, containerStyle]}
      importantForAutofill={importantForAutofill}
    >
      <Text style={styles.label}>{label}</Text>

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
        />

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsVisible((currentValue) => !currentValue)}
          disabled={!editable}
        >
          <MaterialCommunityIcons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.mutedText}
          />
        </TouchableOpacity>
      </View>

      {error && !hideErrorText ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
});

export default PasswordField;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputWrap: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.input,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 2,
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
    paddingLeft: 10,
    minHeight: 36,
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  helperText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
});
