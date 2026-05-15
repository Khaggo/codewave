import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors, radius } from '../../theme'

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
  onOpenVehiclePicker,
  children,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Insurance</Text>
        <TouchableOpacity
          style={styles.vehicleTrigger}
          onPress={onOpenVehiclePicker}
          activeOpacity={0.88}
        >
          <Text style={styles.vehicleTriggerText}>
            {selectedVehicleLabel || 'Select vehicle'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
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

      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  vehicleTrigger: {
    maxWidth: '62%',
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    justifyContent: 'center',
  },
  vehicleTriggerText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabButton: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  body: {
    minHeight: 0,
  },
})
