import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, View } from 'react-native'

import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

function ChecklistSummaryCard({ label, value, helper, emphasis = false }) {
  return (
    <View style={[styles.summaryCard, emphasis && styles.summaryCardEmphasis]}>
      <Text style={styles.summaryCardLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryCardValue,
          emphasis && styles.summaryCardValueEmphasis,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.summaryCardHelper}>{helper}</Text>
    </View>
  )
}

function ChecklistItemRow({ item }) {
  return (
    <View style={styles.checklistRow}>
      <MaterialCommunityIcons
        name={item.complete ? 'check-circle' : 'minus-circle-outline'}
        size={18}
        color={item.complete ? insurancePalette.amber : insurancePalette.textDim}
      />
      <Text
        style={[
          styles.checklistLabel,
          item.complete && styles.checklistLabelComplete,
        ]}
      >
        {item.label}
      </Text>
      <View
        style={[
          styles.checklistBadge,
          item.complete && styles.checklistBadgeComplete,
        ]}
      >
        <Text
          style={[
            styles.checklistBadgeText,
            item.complete && styles.checklistBadgeTextComplete,
          ]}
        >
          {item.complete ? 'On file' : 'Needed'}
        </Text>
      </View>
    </View>
  )
}

function ChecklistGroup({ title, items }) {
  return (
    <View style={styles.checklistGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item) => (
        <ChecklistItemRow key={item.type} item={item} />
      ))}
    </View>
  )
}

export default function InsuranceDocumentChecklist({
  checklistGroups,
  guidance,
  onFileCount,
  pendingCount,
  purposeLabel,
  requiredCompleteCount,
  requiredTotalCount,
}) {
  return (
    <>
      <InsuranceSectionDivider
        title="Document status"
        helper={`${purposeLabel || 'Insurance'} files stay tied to this vehicle request.`}
        leading
      >
        <View style={styles.summaryGrid}>
          <ChecklistSummaryCard
            label="Required"
            value={`${requiredCompleteCount}/${requiredTotalCount || 0}`}
            helper={
              requiredTotalCount
                ? requiredCompleteCount === requiredTotalCount
                  ? 'Ready for review'
                  : 'Still missing required files'
                : 'No required upload blockers'
            }
            emphasis={
              Boolean(requiredTotalCount) &&
              requiredCompleteCount === requiredTotalCount
            }
          />
          <ChecklistSummaryCard
            label="On file"
            value={String(onFileCount)}
            helper="Already attached to this case"
          />
          <ChecklistSummaryCard
            label="Pending"
            value={String(pendingCount)}
            helper="Still staged on this device"
          />
        </View>
      </InsuranceSectionDivider>

      <InsuranceSectionDivider title="Required now">
        <View style={styles.notesCard}>
          <ChecklistGroup
            title="Required now"
            items={checklistGroups.required}
          />
        </View>
      </InsuranceSectionDivider>

      {checklistGroups.supporting.length ? (
        <InsuranceSectionDivider title="Helpful next">
          <View style={styles.notesCard}>
            <ChecklistGroup
              title="Helpful next"
              items={checklistGroups.supporting}
            />
          </View>
        </InsuranceSectionDivider>
      ) : null}

      {checklistGroups.optional.length ? (
        <InsuranceSectionDivider title="Optional later">
          <View style={styles.notesCard}>
            <ChecklistGroup
              title="Optional later"
              items={checklistGroups.optional}
            />
          </View>
        </InsuranceSectionDivider>
      ) : null}

      <InsuranceSectionDivider title="Upload notes">
        <View style={styles.notesCard}>
          {guidance.map((item) => (
            <Text key={item} style={styles.guidanceText}>
              {item}
            </Text>
          ))}
        </View>
      </InsuranceSectionDivider>
    </>
  )
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 14,
    gap: 6,
  },
  summaryCardEmphasis: {
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
  },
  summaryCardLabel: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  summaryCardValue: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  summaryCardValueEmphasis: {
    color: insurancePalette.amber,
  },
  summaryCardHelper: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  checklistGroup: {
    gap: 10,
  },
  groupTitle: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checklistLabel: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  checklistLabelComplete: {
    color: insurancePalette.amber,
    fontWeight: '700',
  },
  checklistBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checklistBadgeComplete: {
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
  },
  checklistBadgeText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '700',
  },
  checklistBadgeTextComplete: {
    color: insurancePalette.amber,
  },
  notesCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 16,
    gap: 10,
  },
  guidanceText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
})
