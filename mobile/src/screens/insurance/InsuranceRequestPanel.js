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
import { InsurancePanelShell, InsuranceSectionDivider } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

function InlineNotice({ state, message }) {
  if (!message) {
    return null
  }

  const isSuccess = state === 'submitted_inquiry'
  const isLoading = state === 'submitting'

  return (
    <View style={[styles.noticeRow, isSuccess && styles.noticeRowSuccess]}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <MaterialCommunityIcons
          name={isSuccess ? 'check-decagram-outline' : 'information-outline'}
          size={18}
          color={colors.primary}
        />
      )}
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  )
}

export default function InsuranceRequestPanel({
  selectedVehicleLabel,
  draft,
  inquiryTypeOptions,
  isRefreshing,
  onRefresh,
  onChangeDraft,
  onSubmit,
  isSubmitting,
  intakeState,
  intakeMessage,
}) {
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
            tintColor={colors.primary}
          />
        }
      >
        <InsurancePanelShell eyebrow="Request" title="Request">
          <InsuranceSectionDivider title="Selected vehicle" leading>
            <Text style={styles.vehicleValue}>{selectedVehicleLabel || 'Choose a vehicle first'}</Text>
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

          <InsuranceSectionDivider title="Claim details">
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
                placeholder="Describe the concern or claim."
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
                placeholder="Optional notes"
                placeholderTextColor={colors.mutedText}
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
                placeholder="Optional insurer or broker"
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

          <InlineNotice state={intakeState} message={intakeMessage} />
        </InsurancePanelShell>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? <ActivityIndicator color={colors.onPrimary} size="small" /> : null}
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
    paddingBottom: 120,
  },
  vehicleValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
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
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 2,
  },
  noticeRowSuccess: {
    opacity: 0.95,
  },
  noticeText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 14,
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
