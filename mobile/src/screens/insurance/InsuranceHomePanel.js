import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  InsurancePanelShell,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

const LINK_ITEMS = [
  { key: 'request', label: 'Request' },
  { key: 'documents', label: 'Documents' },
  { key: 'status', label: 'Status' },
]

export default function InsuranceHomePanel({
  title = 'Overview',
  selectedVehicleLabel,
  overviewState,
  statusState,
  onOpenSection,
}) {
  return (
    <View style={styles.root} accessibilityLabel={title}>
      <InsurancePanelShell title="Overview">
        <InsuranceSectionDivider title="Current vehicle" leading>
          <Text style={styles.primaryValue}>{selectedVehicleLabel || 'No vehicle selected'}</Text>
        </InsuranceSectionDivider>

        <InsuranceSectionDivider title="Next step">
          <Text style={styles.summaryText}>{overviewState.title}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onOpenSection(overviewState.routeKey)}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryButtonText}>{overviewState.ctaLabel}</Text>
          </TouchableOpacity>
        </InsuranceSectionDivider>

        <InsuranceSectionDivider title="Current status">
          <Text style={styles.summaryText}>{statusState.summary}</Text>
        </InsuranceSectionDivider>
      </InsurancePanelShell>

      <View style={styles.linkList}>
        {LINK_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.linkRow}
            onPress={() => onOpenSection(item.key)}
            activeOpacity={0.88}
          >
            <Text style={styles.linkLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 18,
  },
  primaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    minHeight: 50,
    marginTop: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  linkList: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  linkRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  linkLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
})
