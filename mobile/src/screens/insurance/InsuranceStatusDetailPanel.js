import { Children, useEffect, useRef } from 'react'
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsurancePanelShell,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

function StepDot({ active, done }) {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!active || done) {
      pulse.stopAnimation()
      pulse.setValue(1)
      return undefined
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.18,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    )

    loop.start()
    return () => loop.stop()
  }, [active, done, pulse])

  return (
    <Animated.View
      style={[
        styles.stepDot,
        active && styles.stepDotActive,
        done && styles.stepDotDone,
        active && !done && { transform: [{ scale: pulse }] },
      ]}
    />
  )
}

function TimelineItem({ item, isLast = false }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <StepDot active={item.active} done={item.done} />
        {!isLast ? <View style={styles.timelineConnector} /> : null}
      </View>
      <Text style={styles.timelineLabel}>{item.label}</Text>
    </View>
  )
}

export default function InsuranceStatusDetailPanel({
  eyebrow = 'Status',
  title = 'Status',
  subtitle = 'Track review, approval, and next action',
  statusState,
  processSteps = [],
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
          tintColor={insurancePalette.amber}
        />
      }
    >
      <InsurancePanelShell eyebrow={eyebrow} title={title} subtitle={subtitle}>
        <InsuranceSectionDivider title="Current status" leading>
          <View style={styles.currentStatusCard}>
            <Text style={styles.statusTitle}>{statusState.title}</Text>
            <Text style={styles.statusSummary}>{statusState.summary}</Text>
          </View>
        </InsuranceSectionDivider>

        {statusState.timeline.length ? (
          <InsuranceSectionDivider title="Timeline">
            <View style={styles.groupCard}>
              {statusState.timeline.map((item, index) => (
                <TimelineItem
                  key={item.key}
                  item={{ ...item, done: item.active }}
                  isLast={index === statusState.timeline.length - 1}
                />
              ))}
            </View>
          </InsuranceSectionDivider>
        ) : null}

        {processSteps.length ? (
          <InsuranceSectionDivider title="Process">
            <View style={styles.groupCard}>
              {processSteps.map((item, index) => (
                <TimelineItem
                  key={item.key}
                  item={item}
                  isLast={index === processSteps.length - 1}
                />
              ))}
            </View>
          </InsuranceSectionDivider>
        ) : null}

        <InsuranceSectionDivider title="Latest update">
          <View style={styles.groupCard}>
            <Text style={styles.statusSummary}>{statusState.latestUpdateLabel}</Text>
          </View>
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
  currentStatusCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 8,
  },
  groupCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 14,
  },
  statusTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  statusSummary: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  timelineRail: {
    width: 14,
    alignItems: 'center',
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    marginTop: 4,
    backgroundColor: insurancePalette.divider,
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: insurancePalette.border,
    backgroundColor: '#33373F',
  },
  stepDotActive: {
    borderColor: insurancePalette.amber,
    backgroundColor: insurancePalette.amber,
  },
  stepDotDone: {
    borderColor: insurancePalette.amber,
    backgroundColor: insurancePalette.amberSoft,
  },
  timelineLabel: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    flex: 1,
    paddingBottom: 12,
  },
})
