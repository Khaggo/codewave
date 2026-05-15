import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { InsurancePanelShell, InsuranceSectionCard } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

export default function InsuranceStatusDetailPanel({
  eyebrow,
  title,
  subtitle,
  statusState,
  footerLabel,
  onFooterPress,
  children,
}) {
  const showsFooter = Boolean(footerLabel && onFooterPress)

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, showsFooter && styles.contentWithFooter]}
        showsVerticalScrollIndicator={false}
      >
        <InsurancePanelShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
          <InsuranceSectionCard
            title={statusState.title}
            helper={statusState.summary}
          />
        </InsurancePanelShell>

        {statusState.timeline.length ? (
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>Timeline</Text>
            {statusState.timeline.map((item) => (
              <View key={item.key} style={styles.timelineRow}>
                <View
                  style={[
                    styles.timelineDot,
                    item.active && styles.timelineDotActive,
                  ]}
                />
                <Text style={styles.timelineLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <InsuranceSectionCard
          title="Latest update"
          helper={statusState.latestUpdateLabel}
        />
        {children}
      </ScrollView>

      {showsFooter ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={onFooterPress}
            activeOpacity={0.88}
          >
            <Text style={styles.footerButtonText}>{footerLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: 14,
    paddingBottom: 28,
  },
  contentWithFooter: {
    paddingBottom: 140,
  },
  timelineSection: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  timelineTitle: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  timelineDotActive: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    flex: 1,
  },
  footer: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  footerButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footerButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
})
