import { forwardRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

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
  importantForAutofill = 'no',
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
}, ref) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrap,
          isFocused && editable && styles.inputFocused,
          !editable && styles.inputReadonly,
          error && styles.inputError,
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={colors.mutedText}
            style={styles.leadingIcon}
          />
        ) : null}

        <TextInput
          ref={ref}
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
          textContentType={textContentType}
          autoCorrect={false}
          autoComplete={autoComplete}
          importantForAutofill={importantForAutofill}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          selectionColor={colors.primary}
        />
      </View>
      {error && !hideErrorText ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
});

export default FormField;

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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.input,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 16,
    fontSize: 16,
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
    color: colors.mutedText,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  inputReadonlyText: {
    color: colors.mutedText,
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
