import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsuranceActionRow, InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

const iconByKey = {
  documents: 'file-document-outline',
  payment: 'cash-check',
  renewal: 'calendar-clock-outline',
  history: 'history',
}

export default function InsuranceHomePanel({
  hero,
  actionCards,
  selectedVehicleLabel,
  onOpenPanel,
}) {
  return (
    <View style={styles.content}>
      <InsurancePanelShell
        eyebrow={hero.eyebrow}
        title="Insurance home"
        subtitle="Review the current request, then open the exact task you need."
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          <Text style={styles.heroMessage}>{hero.message}</Text>
          {selectedVehicleLabel ? <Text style={styles.vehicleLabel}>{selectedVehicleLabel}</Text> : null}
          <TouchableOpacity style={styles.heroButton} onPress={() => onOpenPanel(hero.routeKey)} activeOpacity={0.9}>
            <Text style={styles.heroButtonText}>{hero.ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </InsurancePanelShell>

      <View style={styles.actionsGrid}>
        {actionCards.map((card) => (
          <InsuranceActionRow
            key={card.key}
            icon={iconByKey[card.key]}
            label={card.title}
            value={card.value}
            description={card.description}
            onPress={() => onOpenPanel(card.routeKey)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 32 },
  heroCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 12 },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  heroMessage: { color: colors.mutedText, fontSize: 15, lineHeight: 23 },
  vehicleLabel: { color: colors.labelText, fontSize: 13, fontWeight: '700' },
  heroButton: { marginTop: 4, borderRadius: radius.lg, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center' },
  heroButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800' },
  actionsGrid: { gap: 14 },
})
