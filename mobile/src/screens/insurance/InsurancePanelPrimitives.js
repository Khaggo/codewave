import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { colors, radius } from '../../theme'

export function InsurancePanelShell({ eyebrow, title, subtitle, children }) {
  return (
    <View style={styles.shell}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  )
}

export function InsuranceActionRow({ icon, label, value, description, onPress }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.actionHeader}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
        </View>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  )
}

export function InsuranceSectionCard({ title, helper, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {helper ? <Text style={styles.sectionCardHelper}>{helper}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { gap: 12 },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.mutedText, fontSize: 14, lineHeight: 22 },
  actionRow: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 10,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  value: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  actionLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
  actionDescription: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
  sectionCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 8,
  },
  sectionCardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCardHelper: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
})
