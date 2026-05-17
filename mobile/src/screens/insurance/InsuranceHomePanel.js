import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

const QUICK_NAV_ICON_MAP = {
  request: 'shield-edit-outline',
  documents: 'file-document-outline',
  status: 'timeline-text-outline',
}

export default function InsuranceHomePanel({
  title = 'Home',
  selectedVehicleLabel,
  currentRequestSummary,
  overviewState,
  statusState,
  onOpenSection,
}) {
  const routeRows = (overviewState.routeRows ?? [])
    .filter((item) => item?.key && item.key !== 'history')

  const quickNavItems = routeRows.map((item) => ({
    ...item,
    icon: QUICK_NAV_ICON_MAP[item.key] ?? 'chevron-right',
    description: item.description ?? item.helper ?? 'Open this section',
  }))

  return (
    <View style={styles.root} accessibilityLabel={title}>
      <InsuranceSectionDivider title="Current vehicle" leading>
        <View style={styles.vehiclePanel}>
          <Text style={styles.primaryValue}>{selectedVehicleLabel || 'No vehicle selected'}</Text>
          <Text style={styles.vehicleMeta}>
            {currentRequestSummary?.purposeLabel ?? 'Request'} •{' '}
            {currentRequestSummary?.inquiryTypeLabel ?? 'Insurance'}
          </Text>
        </View>
      </InsuranceSectionDivider>

      <InsuranceSectionDivider title="Next step">
        <View style={styles.actionCard}>
          <Text style={styles.summaryTitle}>{overviewState.title}</Text>
          {overviewState.message ? (
            <Text style={styles.summaryText}>{overviewState.message}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onOpenSection(overviewState.routeKey)}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Open request</Text>
          </TouchableOpacity>
        </View>
      </InsuranceSectionDivider>

      <InsuranceSectionDivider title="Current status">
        <View style={styles.statusCard}>
          <Text style={styles.statusHeading}>{statusState.title}</Text>
          <Text style={styles.summaryText}>{statusState.summary}</Text>
        </View>
      </InsuranceSectionDivider>

      <InsuranceSectionDivider title="Quick access">
        <View style={styles.quickAccessList}>
          {quickNavItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.quickAccessCard}
              onPress={() => onOpenSection(item.key)}
              activeOpacity={0.9}
            >
              <View style={styles.quickAccessIconWrap}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={18}
                  color={insurancePalette.amber}
                />
              </View>
              <View style={styles.quickAccessCopy}>
                <Text style={styles.quickAccessTitle}>{item.label}</Text>
                <Text style={styles.quickAccessDescription}>{item.description}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={insurancePalette.textDim}
              />
            </TouchableOpacity>
          ))}
        </View>
      </InsuranceSectionDivider>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  vehiclePanel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 8,
    shadowColor: insurancePalette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  primaryValue: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  vehicleMeta: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  actionCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 12,
  },
  summaryTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  summaryText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: insurancePalette.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: insurancePalette.onAmber,
    fontFamily: insuranceFonts.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  statusCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    padding: 18,
    gap: 8,
  },
  statusHeading: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  quickAccessList: {
    gap: 12,
  },
  quickAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quickAccessIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: insurancePalette.amberSoft,
  },
  quickAccessCopy: {
    flex: 1,
    gap: 2,
  },
  quickAccessTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  quickAccessDescription: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
})
