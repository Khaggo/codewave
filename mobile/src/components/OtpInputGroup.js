import { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

export default function OtpInputGroup({
  value,
  onChange,
  error,
  helperText,
  hideHelperText = false,
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);
  const screenWidth = Dimensions.get('window').width;
  const otpBoxWidth = Math.min(Math.max(screenWidth * 0.12, 44), 52);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('').map((item) => item.trim());

  const updateDigit = (inputValue, index) => {
    const sanitizedValue = inputValue.replace(/[^0-9]/g, '');
    const nextDigits = [...digits];

    if (!sanitizedValue) {
      nextDigits[index] = '';
      onChange(nextDigits.join(''));
      return;
    }

    sanitizedValue
      .slice(0, digits.length - index)
      .split('')
      .forEach((digit, offset) => {
        nextDigits[index + offset] = digit;
      });

    onChange(nextDigits.join(''));

    const lastFilledIndex = Math.min(index + sanitizedValue.length - 1, digits.length - 1);
    const nextIndex = lastFilledIndex + 1;

    if (nextIndex <= digits.length - 1) {
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    inputRefs.current[digits.length - 1]?.blur();
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const nextDigits = [...digits];
      nextDigits[index - 1] = '';
      onChange(nextDigits.join(''));
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {digits.map((digit, index) => (
          <TextInput
            key={`otp-${index}`}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => updateDigit(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={index === 0}
            style={[
              styles.input,
              { width: otpBoxWidth },
              focusedIndex === index && styles.inputFocused,
              error && styles.inputError,
            ]}
            selectionColor={colors.primary}
            textAlign="center"
            placeholder=""
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText && !hideHelperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  helperText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
