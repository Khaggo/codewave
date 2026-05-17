import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { radius } from '../../theme'
import { insuranceFonts, insurancePalette } from './InsurancePanelPrimitives'

const TAB_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'request', label: 'Request' },
  { key: 'documents', label: 'Documents' },
  { key: 'status', label: 'Status' },
]

export default function InsuranceModeShell({
  activeSection,
  onChangeSection,
  selectedVehicleLabel,
  isVehiclePickerAvailable,
  onOpenVehiclePicker,
  summaryChips = [],
  children,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Insurance</Text>
        <TouchableOpacity
          style={[
            styles.vehicleTrigger,
            !isVehiclePickerAvailable && styles.vehicleTriggerDisabled,
          ]}
          onPress={onOpenVehiclePicker}
          disabled={!isVehiclePickerAvailable}
          activeOpacity={0.88}
        >
          <Text
            style={[
              styles.vehicleTriggerText,
              !isVehiclePickerAvailable && styles.vehicleTriggerTextDisabled,
            ]}
          >
            {selectedVehicleLabel || 'Select vehicle'}
          </Text>
        </TouchableOpacity>
      </View>

      {summaryChips.length ? (
        <View style={styles.summaryRow}>
          {summaryChips.map((item) => (
            <View
              key={`${item.label}-${item.value}`}
              style={[
                styles.summaryChip,
                item.emphasis && styles.summaryChipEmphasis,
              ]}
            >
              <Text style={styles.summaryChipLabel}>{item.label}</Text>
              <View style={styles.summaryChipValueRow}>
                {item.icon ? (
                  <MaterialCommunityIcons
                    name={item.icon ? item.icon : 'alert-circle-outline'}
                    size={14}
                    color={item.emphasis ? insurancePalette.amber : insurancePalette.text}
                  />
                ) : null}
                <Text
                  style={[
                    styles.summaryChipValue,
                    item.mono && styles.summaryChipValueMono,
                    item.emphasis && styles.summaryChipValueEmphasis,
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.tabRow}>
        <View style={styles.tabRowInner}>
          {TAB_ITEMS.map((item) => {
            const active = item.key === activeSection

            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tabButton, active && styles.tabButtonActive]}
                onPress={() => onChangeSection(item.key)}
                activeOpacity={0.88}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 18,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '700',
  },
  vehicleTrigger: {
    maxWidth: '62%',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    justifyContent: 'center',
  },
  vehicleTriggerDisabled: {
    borderColor: insurancePalette.divider,
    backgroundColor: insurancePalette.cardMuted,
    opacity: 0.58,
  },
  vehicleTriggerText: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleTriggerTextDisabled: {
    color: insurancePalette.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryChip: {
    flex: 1,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    gap: 6,
  },
  summaryChipEmphasis: {
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
  },
  summaryChipLabel: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  summaryChipValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryChipValue: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryChipValueMono: {
    fontFamily: insuranceFonts.mono,
  },
  summaryChipValueEmphasis: {
    color: insurancePalette.amber,
  },
  tabRow: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 6,
    shadowColor: insurancePalette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 4,
  },
  tabRowInner: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: insurancePalette.amber,
  },
  tabText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: insurancePalette.onAmber,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
})
