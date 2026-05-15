import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

export default function InsuranceStatusDetailPanel({
  eyebrow,
  title,
  subtitle,
  statusLabel,
  summary,
  children,
  onBack,
}) {
  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.88}>
        <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
        <Text style={styles.backLinkText}>Back to home</Text>
      </TouchableOpacity>

      <InsurancePanelShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroSummary}>{summary}</Text>
            {statusLabel ? <Text style={styles.statusPill}>{statusLabel}</Text> : null}
          </View>
        </View>

        <View style={styles.content}>{children}</View>
      </InsurancePanelShell>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  backLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroSummary: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  content: {
    gap: 14,
  },
})
