import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsuranceSectionCard } from './InsurancePanelPrimitives'
import { colors } from '../../theme'

export default function InsuranceEntryPanel({ entryState, onEnterMode }) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Insurance</Text>
      <Text style={styles.title}>{entryState.title}</Text>
      <Text style={styles.summary}>{entryState.summary}</Text>
      <InsuranceSectionCard title={entryState.vehicleLabel} helper={entryState.statusLabel} />
      <TouchableOpacity style={styles.button} onPress={onEnterMode} activeOpacity={0.88}>
        <Text style={styles.buttonText}>{entryState.ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  eyebrow: { color: colors.labelText, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900' },
  summary: { color: colors.mutedText, fontSize: 15, lineHeight: 24 },
  button: { borderRadius: 18, backgroundColor: colors.primary, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
})
