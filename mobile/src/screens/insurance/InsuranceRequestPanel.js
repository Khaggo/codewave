import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsurancePanelShell,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

function InlineNotice({ state, message }) {
  if (!message) {
    return null
  }

  const isSuccess = state === 'submitted_inquiry'
  const isLoading = state === 'submitting'

  return (
    <View style={[styles.noticeRow, isSuccess && styles.noticeRowSuccess]}>
      {isLoading ? (
        <ActivityIndicator color={insurancePalette.amber} size="small" />
      ) : (
        <MaterialCommunityIcons
          name={isSuccess ? 'check-decagram-outline' : 'information-outline'}
          size={18}
          color={insurancePalette.amber}
        />
      )}
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  )
}

const REQUEST_TITLES = {
  claim: 'Claim request',
  renewal: 'Renewal request',
  new_application: 'New application',
  quotation: 'Quotation request',
}

export default function InsuranceRequestPanel({
  bottomInset = 0,
  selectedVehicleLabel,
  draft,
  purposeOptions = [],
  inquiryTypeOptions,
  requestGuidance,
  isRefreshing,
  onRefresh,
  onChangeDraft,
  onSubmit,
  isSubmitting,
  intakeState,
  intakeMessage,
}) {
  const requestTitle = REQUEST_TITLES[draft.purpose] ?? 'Claim request'

  return (
    <View style={styles.root}>
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
        <InsurancePanelShell eyebrow="Request" title="Request">
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{requestTitle}</Text>
            <Text style={styles.heroSubtitle}>
              Keep the intake short, clear, and ready for staff review.
            </Text>
          </View>

          <InsuranceSectionDivider title="Selected vehicle" leading>
            <View style={styles.slimCard}>
              <Text style={styles.vehicleValue}>{selectedVehicleLabel || 'Choose a vehicle first'}</Text>
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Request purpose" helper={requestGuidance?.sectionHelper}>
            <View style={styles.purposeRow}>
              {purposeOptions.map((option) => {
                const isSelected = draft.purpose === option.value

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.purposeButton, isSelected && styles.segmentButtonSelected]}
                    onPress={() => onChangeDraft({ purpose: option.value })}
                    activeOpacity={0.88}
                  >
                    <Text
                      style={[styles.segmentButtonText, isSelected && styles.segmentButtonTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Inquiry type">
            <View style={styles.segmentRow}>
              {inquiryTypeOptions.map((option) => {
                const isSelected = draft.inquiryType === option.value

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.segmentButton, isSelected && styles.segmentButtonSelected]}
                    onPress={() => onChangeDraft({ inquiryType: option.value })}
                    activeOpacity={0.88}
                  >
                    <Text
                      style={[styles.segmentButtonText, isSelected && styles.segmentButtonTextSelected]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Estimate and approval" helper={requestGuidance?.processLine}>
            <View style={styles.slimCard}>
              <Text style={styles.helperText}>
                Staff check the intake first, prepare the estimate, then move the approval updates to Status.
              </Text>
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Request details">
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                value={draft.subject}
                onChangeText={(value) => onChangeDraft({ subject: value })}
                placeholder={requestGuidance?.subjectPlaceholder ?? 'Accident repair inquiry'}
                placeholderTextColor={insurancePalette.textDim}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={draft.description}
                onChangeText={(value) => onChangeDraft({ description: value })}
                placeholder={requestGuidance?.descriptionPlaceholder ?? 'Describe the concern or claim.'}
                placeholderTextColor={insurancePalette.textDim}
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                value={draft.notes}
                onChangeText={(value) => onChangeDraft({ notes: value })}
                placeholder={requestGuidance?.notesPlaceholder ?? 'Optional notes'}
                placeholderTextColor={insurancePalette.textDim}
                style={[styles.input, styles.notesInput]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Insurance details">
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Provider name</Text>
              <TextInput
                value={draft.providerName}
                onChangeText={(value) => onChangeDraft({ providerName: value })}
                placeholder={requestGuidance?.providerPlaceholder ?? 'Optional insurer or broker'}
                placeholderTextColor={insurancePalette.textDim}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Policy number</Text>
              <TextInput
                value={draft.policyNumber}
                onChangeText={(value) => onChangeDraft({ policyNumber: value })}
                placeholder={requestGuidance?.policyPlaceholder ?? 'Optional policy reference'}
                placeholderTextColor={insurancePalette.textDim}
                style={styles.input}
                autoCapitalize="characters"
              />
            </View>
          </InsuranceSectionDivider>

          <InlineNotice state={intakeState} message={intakeMessage} />
        </InsurancePanelShell>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Math.max(bottomInset, 14) }]}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? <ActivityIndicator color={insurancePalette.onAmber} size="small" /> : null}
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit request'}
          </Text>
        </TouchableOpacity>
      </View>
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
    gap: 18,
    paddingBottom: 128,
  },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 18,
    gap: 8,
  },
  heroTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 22,
  },
  slimCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 16,
    gap: 6,
  },
  vehicleValue: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  purposeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  segmentButtonSelected: {
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
  },
  segmentButtonText: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentButtonTextSelected: {
    color: insurancePalette.amber,
  },
  purposeButton: {
    minWidth: '22%',
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  fieldBlock: {
    gap: 8,
  },
  helperText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  fieldLabel: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 116,
  },
  notesInput: {
    minHeight: 88,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    padding: 14,
  },
  noticeRowSuccess: {
    borderColor: insurancePalette.amberBorder,
  },
  noticeText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: insurancePalette.divider,
    paddingTop: 14,
    backgroundColor: insurancePalette.base,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: insurancePalette.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.78,
  },
  submitButtonText: {
    color: insurancePalette.onAmber,
    fontFamily: insuranceFonts.heading,
    fontSize: 15,
    fontWeight: '700',
  },
})
