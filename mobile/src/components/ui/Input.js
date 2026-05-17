import { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const Input = forwardRef(function Input(
  {
    label,
    value,
    onChangeText,
    placeholder,
    helperText,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    secureTextEntry = false,
    multiline = false,
    numberOfLines = 1,
    editable = true,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    autoComplete = 'off',
    autoCorrect = false,
    textContentType = 'none',
    maxLength,
    style,
    inputStyle,
    onFocus,
    onBlur,
    returnKeyType,
    onSubmitEditing,
    blurOnSubmit,
  },
  ref,
) {
  const { colors, radius, spacing, type } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.semantic.danger
    : focused && editable
    ? colors.brand.orange
    : colors.surface.border;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text
          style={[
            type.label,
            { color: colors.ink.muted, marginBottom: spacing[2] },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: editable ? colors.surface.input : colors.surface.readonly,
            borderColor,
            borderRadius: radius.md,
            paddingHorizontal: spacing[4],
            minHeight: multiline ? 92 : 48,
            alignItems: multiline ? 'flex-start' : 'center',
          },
          focused &&
            editable &&
            !error && {
              shadowColor: colors.brand.orange,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
            },
        ]}
      >
        {leftIcon ? (
          <Feather
            name={leftIcon}
            size={16}
            color={colors.ink.muted}
            style={{ marginRight: spacing[2], marginTop: multiline ? 14 : 0 }}
          />
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink.muted}
          editable={editable}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          textContentType={Platform.OS === 'ios' ? textContentType : 'none'}
          maxLength={maxLength}
          selectionColor={colors.brand.orange}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            type.body,
            styles.input,
            {
              color: editable ? colors.ink.primary : colors.ink.secondary,
              paddingVertical: multiline ? spacing[3] : 0,
              minHeight: multiline ? 80 : 48,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
        />

        {rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={8}
            style={{ marginLeft: spacing[2], paddingVertical: 4, paddingHorizontal: 4 }}
          >
            <Feather name={rightIcon} size={18} color={colors.ink.muted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          style={[
            type.small,
            { color: colors.semantic.danger, marginTop: spacing[2] },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            type.small,
            { color: colors.ink.muted, marginTop: spacing[2] },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  inputBox: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 0,
  },
});
