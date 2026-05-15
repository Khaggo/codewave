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

export function InsuranceSummaryStrip({ label, value, helper }) {
  return (
    <View style={styles.summaryStrip}>
      <Text style={styles.summaryStripLabel}>{label}</Text>
      <Text style={styles.summaryStripValue}>{value}</Text>
      {helper ? <Text style={styles.summaryStripHelper}>{helper}</Text> : null}
    </View>
  )
}

export function InsuranceSectionDivider({ title, helper, leading = false, children }) {
  return (
    <View style={[styles.sectionDivider, leading && styles.sectionDividerLeading]}>
      <View style={styles.sectionDividerHeader}>
        <Text style={styles.sectionDividerTitle}>{title}</Text>
        {helper ? <Text style={styles.sectionDividerHelper}>{helper}</Text> : null}
      </View>
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
  summaryStrip: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  summaryStripLabel: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryStripValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryStripHelper: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionDivider: {
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 12,
  },
  sectionDividerLeading: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  sectionDividerHeader: {
    gap: 4,
  },
  sectionDividerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDividerHelper: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
})
