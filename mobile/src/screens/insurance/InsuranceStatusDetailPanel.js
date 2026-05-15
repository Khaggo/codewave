import { Children } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { InsurancePanelShell, InsuranceSectionDivider } from './InsurancePanelPrimitives'
import { colors } from '../../theme'

export default function InsuranceStatusDetailPanel({
  eyebrow,
  title,
  subtitle,
  statusState,
  isRefreshing,
  onRefresh,
  children,
}) {
  const extraSections = Children.toArray(children).filter(Boolean)

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <InsurancePanelShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <InsuranceSectionDivider title="Current status" leading>
          <Text style={styles.statusTitle}>{statusState.title}</Text>
          <Text style={styles.statusSummary}>{statusState.summary}</Text>
        </InsuranceSectionDivider>

        {statusState.timeline.length ? (
          <InsuranceSectionDivider title="Timeline">
            {statusState.timeline.map((item) => (
              <View key={item.key} style={styles.timelineRow}>
                <View style={[styles.timelineDot, item.active && styles.timelineDotActive]} />
                <Text style={styles.timelineLabel}>{item.label}</Text>
              </View>
            ))}
          </InsuranceSectionDivider>
        ) : null}

        <InsuranceSectionDivider title="Latest update">
          <Text style={styles.statusSummary}>{statusState.latestUpdateLabel}</Text>
        </InsuranceSectionDivider>
      </InsurancePanelShell>

      {extraSections.length ? <View style={styles.extraSections}>{extraSections}</View> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: 18,
    paddingBottom: 28,
  },
  extraSections: {
    gap: 18,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statusSummary: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
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
})
