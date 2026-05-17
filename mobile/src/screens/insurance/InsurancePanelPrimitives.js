import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { radius } from '../../theme'

export const insurancePalette = {
  base: '#0D0F14',
  card: '#151820',
  cardMuted: '#12151C',
  cardSoft: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.05)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.14)',
  amberBorder: 'rgba(245,158,11,0.34)',
  onAmber: '#111318',
  success: '#FBBF24',
  shadow: '#000000',
}

export const insuranceFonts = {
  heading: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
}

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
          <MaterialCommunityIcons name={icon} size={18} color={insurancePalette.amber} />
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
  shell: { gap: 18 },
  eyebrow: {
    color: insurancePalette.amber,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  actionRow: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 10,
    shadowColor: insurancePalette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 4,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: insurancePalette.amberSoft,
  },
  value: {
    color: insurancePalette.amber,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    fontWeight: '800',
  },
  actionLabel: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 17,
    fontWeight: '700',
  },
  actionDescription: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 8,
    shadowColor: insurancePalette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 3,
  },
  sectionCardTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCardHelper: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  summaryStrip: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardMuted,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  summaryStripLabel: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  summaryStripValue: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryStripHelper: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionDivider: {
    gap: 10,
  },
  sectionDividerLeading: {
    paddingTop: 0,
  },
  sectionDividerHeader: {
    gap: 6,
  },
  sectionDividerTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDividerHelper: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
})
