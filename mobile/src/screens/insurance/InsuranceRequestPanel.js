import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import {
  InsurancePanelShell,
  InsuranceSectionDivider,
  InsuranceSummaryStrip,
} from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

function InlineNotice({ state, message }) {
  if (!message) {
    return null
  }

  const isSuccess = state === 'submitted_inquiry'
  const isLoading = state === 'submitting'

  return (
    <View
      style={[
        styles.noticeCard,
        isSuccess && styles.noticeCardSuccess,
      ]}
    >
      <View style={styles.noticeIconWrap}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <MaterialCommunityIcons
            name={isSuccess ? 'check-decagram-outline' : 'information-outline'}
            size={18}
            color={colors.primary}
          />
        )}
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>
          {isSuccess ? 'Request submitted' : isLoading ? 'Submitting request' : 'Request update'}
        </Text>
        <Text style={styles.noticeText}>{message}</Text>
      </View>
    </View>
  )
}

export default function InsuranceRequestPanel({
  selectedVehicleLabel,
  draft,
  inquiryTypeOptions,
  onChangeDraft,
  onSubmit,
  isSubmitting,
  intakeState,
  intakeMessage,
}) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <InsurancePanelShell
          eyebrow="Request"
          title="Start a customer-safe insurance request"
          subtitle="Capture the essential details first, then submit one guided request for the selected vehicle."
        >
          <View style={styles.summaryStrip}>
            <InsuranceSummaryStrip
              label="Selected vehicle"
              value={selectedVehicleLabel || 'Choose a vehicle first'}
              helper="This request stays tied to the active vehicle in insurance mode."
            />
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Inquiry type"
              helper="Choose the policy lane before you fill in the request details."
            >
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
                      <Text style={[styles.segmentButtonText, isSelected && styles.segmentButtonTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </InsuranceSectionDivider>
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Claim details"
              helper="Describe the issue clearly so staff can triage the request without follow-up guesswork."
            >
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  value={draft.subject}
                  onChangeText={(value) => onChangeDraft({ subject: value })}
                  placeholder="Accident repair inquiry"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  value={draft.description}
                  onChangeText={(value) => onChangeDraft({ description: value })}
                  placeholder="Describe the concern, damage, or claim context."
                  placeholderTextColor={colors.mutedText}
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
                  placeholder="Optional customer-side notes"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.notesInput]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </InsuranceSectionDivider>
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Insurance details"
              helper="These fields are optional, but they help connect the request to an existing provider or policy."
            >
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Provider name</Text>
                <TextInput
                  value={draft.providerName}
                  onChangeText={(value) => onChangeDraft({ providerName: value })}
                  placeholder="Optional insurer or broker name"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Policy number</Text>
                <TextInput
                  value={draft.policyNumber}
                  onChangeText={(value) => onChangeDraft({ policyNumber: value })}
                  placeholder="Optional policy reference"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                  autoCapitalize="characters"
                />
              </View>
            </InsuranceSectionDivider>
          </View>

          <InlineNotice state={intakeState} message={intakeMessage} />
        </InsurancePanelShell>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerMeta}>Step 1 of 5</Text>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : null}
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit request'}</Text>
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
  content: {
    gap: 18,
    paddingBottom: 20,
  },
  summaryStrip: {
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  segmentButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentButtonTextSelected: {
    color: colors.primary,
  },
  sectionDivider: {
    gap: 12,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 112,
  },
  notesInput: {
    minHeight: 88,
  },
  noticeCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  noticeCardSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  noticeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  footerMeta: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.78,
  },
  submitButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
})
