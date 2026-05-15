import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  InsurancePanelShell,
  InsuranceSectionCard,
} from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

export default function InsuranceHomePanel({ overviewState, onOpenSection }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <InsurancePanelShell
        eyebrow="Overview"
        title="Insurance overview"
        subtitle="Use one section at a time so the current request stays easy to follow."
      >
        <InsuranceSectionCard title={overviewState.title} helper={overviewState.message}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => onOpenSection(overviewState.routeKey)}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryActionText}>{overviewState.ctaLabel}</Text>
          </TouchableOpacity>
        </InsuranceSectionCard>
      </InsurancePanelShell>

      {overviewState.routeRows.map((row) => (
        <TouchableOpacity
          key={row.key}
          style={styles.routeRow}
          onPress={() => onOpenSection(row.key)}
          activeOpacity={0.88}
        >
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>{row.label}</Text>
            <Text style={styles.routeHelper}>{row.helper}</Text>
          </View>
          <Text style={styles.routeArrow}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 28,
  },
  primaryAction: {
    minHeight: 52,
    marginTop: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  routeCopy: {
    flex: 1,
    gap: 4,
  },
  routeLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  routeHelper: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  routeArrow: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
})
