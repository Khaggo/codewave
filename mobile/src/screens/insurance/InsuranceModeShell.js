import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors, radius } from '../../theme'

const SECTION_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'request', label: 'Request' },
  { key: 'documents', label: 'Docs' },
  { key: 'status', label: 'Status' },
  { key: 'history', label: 'History' },
]

export default function InsuranceModeShell({ activeSection, onChangeSection, onExitMode, children }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onExitMode} activeOpacity={0.85}>
        <Text style={styles.backLink}>Back to insurance</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>Customer insurance</Text>
      <Text style={styles.title}>Insurance mode</Text>

      <View style={styles.navRow}>
        {SECTION_ITEMS.map(({ key, label }) => {
          const active = activeSection === key

          return (
            <TouchableOpacity
              key={key}
              style={[styles.navButton, active && styles.navButtonActive]}
              onPress={() => onChangeSection(key)}
              activeOpacity={0.88}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  backLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  navRow: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  navButton: { flex: 1, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' },
  navButtonActive: { backgroundColor: colors.primary },
  navText: { color: colors.mutedText, fontSize: 13, fontWeight: '700' },
  navTextActive: { color: colors.onPrimary },
})
