import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { getPasswordChecks } from '../utils/validation';

const checklistItems = [
  { key: 'hasValidLength', label: 'At least 8 characters' },
  { key: 'hasUppercase', label: 'One uppercase letter (A-Z)' },
  { key: 'hasLowercase', label: 'One lowercase letter (a-z)' },
  { key: 'hasNumber', label: 'One number (0-9)' },
  { key: 'hasSpecialCharacter', label: 'One special character (!@#$%^&*)' },
];

export default function PasswordChecklist({
  password,
  visible = true,
  title = 'Password requirements',
}) {
  if (!visible) {
    return null;
  }

  const checks = getPasswordChecks(password);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {checklistItems.map((item) => {
        const isComplete = checks[item.key];

        return (
          <View key={item.key} style={styles.row}>
            <View style={[styles.iconWrap, isComplete && styles.iconWrapComplete]}>
              <Feather
                name={isComplete ? 'check' : 'minus'}
                size={11}
                color={isComplete ? colors.onPrimary : colors.mutedText}
              />
            </View>
            <Text style={[styles.label, isComplete ? styles.complete : styles.pending]}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -2,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  title: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconWrapComplete: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  complete: {
    color: colors.text,
  },
  pending: {
    color: colors.mutedText,
  },
});
