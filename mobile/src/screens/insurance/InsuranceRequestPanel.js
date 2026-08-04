import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
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
import {
  INSURANCE_REQUEST_STAGES,
  normalizeInsuranceRequestStageIndex,
  validateInsuranceRequestStage,
} from './insuranceRequestFlow.mjs'
import { InlineNotice, StagedDocumentRow } from './InsuranceRequestParts'
import styles from './insuranceRequestPanelStyles'

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
  checklist,
  stagedDocuments = [],
  onFileDocuments = [],
  hasOnFileRenewalPolicy = false,
  canSubmitRequest = true,
  initialStageIndex = 0,
  onStageChange,
  onStageDocument,
  onRemoveStagedDocument,
}) {
  const scrollRef = useRef(null)
  const descriptionRef = useRef(null)
  const [stageIndex, setStageIndex] = useState(() =>
    normalizeInsuranceRequestStageIndex(initialStageIndex),
  )
  const [fieldError, setFieldError] = useState(null)
  const [incidentPickerMode, setIncidentPickerMode] = useState(null)
  const stagedDocumentsByType = new Map(stagedDocuments.map((item) => [item.documentType, item]))
  const onFileDocumentsByType = new Map((onFileDocuments ?? []).map((item) => [item.documentType, item]))
  const footerPaddingBottom = Math.max(bottomInset, 14)
  const contentPaddingBottom = footerPaddingBottom + 180
  const useOnFileRenewalPolicy =
    draft.purpose === 'renewal' &&
    hasOnFileRenewalPolicy &&
    draft.renewalPolicyMode !== 'replace'

  const buildDocumentItem = (item) => {
    const stagedDocument = stagedDocumentsByType.get(item.type)
    const onFileDocument = onFileDocumentsByType.get(item.type)
    const allowOnFile =
      item.type === 'policy' && draft.purpose === 'renewal'
        ? useOnFileRenewalPolicy
        : Boolean(onFileDocument)

    return {
      ...item,
      fileName: stagedDocument?.fileName ?? '',
      fileSizeLabel: stagedDocument?.fileSizeLabel ?? null,
      onFileName: !stagedDocument && allowOnFile ? onFileDocument?.fileName ?? item.label : '',
      onFileCreatedAt: !stagedDocument && allowOnFile ? onFileDocument?.createdAt ?? null : null,
    }
  }

  const incidentDate = draft.incidentOccurredAt
    ? new Date(draft.incidentOccurredAt)
    : new Date()
  const hasValidIncidentDate = !Number.isNaN(incidentDate.getTime())
  const incidentDateLabel = draft.incidentOccurredAt && hasValidIncidentDate
    ? incidentDate.toLocaleDateString()
    : 'Choose date'
  const incidentTimeLabel = draft.incidentOccurredAt && hasValidIncidentDate
    ? incidentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Choose time'
  const showPolicyFields = ['claim', 'renewal'].includes(draft.purpose)

  useEffect(() => {
    setStageIndex(normalizeInsuranceRequestStageIndex(initialStageIndex))
  }, [initialStageIndex])

  const moveToStage = (nextStageIndex) => {
    const normalizedStageIndex =
      normalizeInsuranceRequestStageIndex(nextStageIndex)
    setFieldError(null)
    setStageIndex(normalizedStageIndex)
    onStageChange?.(normalizedStageIndex)
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }

  const handleContinue = () => {
    const validation = validateInsuranceRequestStage({
      stageIndex,
      draft,
      checklist,
    })

    if (validation) {
      setFieldError(validation)
      if (validation.field === 'description') {
        descriptionRef.current?.focus()
      }
      return
    }

    moveToStage(stageIndex + 1)
  }

  const handleSubmit = () => {
    const validation = validateInsuranceRequestStage({
      stageIndex: 2,
      draft,
      checklist,
    })

    if (validation) {
      setFieldError(validation)
      return
    }

    onSubmit()
  }

  const handleIncidentDateChange = (_event, value) => {
    if (Platform.OS === 'android') {
      setIncidentPickerMode(null)
    }

    if (!value) {
      return
    }

    const current = hasValidIncidentDate ? incidentDate : new Date()
    const next = new Date(current)

    if (incidentPickerMode === 'date') {
      next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate())
    } else {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    }

    onChangeDraft({ incidentOccurredAt: next.toISOString() })
    setFieldError((currentError) =>
      currentError?.field === 'incidentOccurredAt' ? null : currentError,
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={insurancePalette.amber}
          />
        }
      >
        <InsurancePanelShell eyebrow="Request" title="New insurance request">
          <View style={styles.stageRail} accessibilityRole="tablist">
            {INSURANCE_REQUEST_STAGES.map((stage, index) => (
              <TouchableOpacity
                key={stage.key}
                style={[styles.stageTab, stageIndex === index && styles.stageTabSelected]}
                onPress={() => {
                  if (index <= stageIndex) {
                    moveToStage(index)
                  }
                }}
                disabled={index > stageIndex}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: stageIndex === index,
                  disabled: index > stageIndex,
                }}
                accessibilityLabel={`Step ${index + 1}: ${stage.label}`}
              >
                <Text style={styles.stageNumber}>{index + 1}</Text>
                <Text
                  numberOfLines={2}
                  style={[styles.stageLabel, stageIndex === index && styles.stageLabelSelected]}
                >
                  {stage.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {stageIndex === 0 ? (
            <>
              <InsuranceSectionDivider
                title="What do you need?"
                helper={requestGuidance?.sectionHelper}
                leading
              >
                <View style={styles.purposeRow}>
                  {purposeOptions.map((option) => {
                    const isSelected = draft.purpose === option.value

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.purposeButton, isSelected && styles.segmentButtonSelected]}
                        onPress={() => {
                          onChangeDraft({ purpose: option.value })
                          setFieldError(null)
                        }}
                        activeOpacity={0.88}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected, selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            isSelected && styles.segmentButtonTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </InsuranceSectionDivider>

              <InsuranceSectionDivider title="Coverage">
                <View style={styles.segmentRow}>
                  {inquiryTypeOptions.map((option) => {
                    const isSelected = draft.inquiryType === option.value

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.segmentButton, isSelected && styles.segmentButtonSelected]}
                        onPress={() => {
                          onChangeDraft({ inquiryType: option.value })
                          setFieldError(null)
                        }}
                        activeOpacity={0.88}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected, selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            isSelected && styles.segmentButtonTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </InsuranceSectionDivider>
            </>
          ) : null}

          {stageIndex === 1 ? (
            <>
              <InsuranceSectionDivider title="Request details" leading>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>What happened or what do you need?</Text>
                  <TextInput
                    ref={descriptionRef}
                    nativeID="insurance-request-description"
                    value={draft.description}
                    onChangeText={(value) => {
                      onChangeDraft({ description: value })
                      setFieldError((currentError) =>
                        currentError?.field === 'description' ? null : currentError,
                      )
                    }}
                    placeholder={
                      requestGuidance?.descriptionPlaceholder ?? 'Describe the concern or claim.'
                    }
                    placeholderTextColor={insurancePalette.textDim}
                    style={[
                      styles.input,
                      styles.multilineInput,
                      fieldError?.field === 'description' && styles.inputError,
                    ]}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    accessibilityLabel="Request description"
                  />
                  {fieldError?.field === 'description' ? (
                    <Text style={styles.fieldErrorText}>{fieldError.message}</Text>
                  ) : null}
                </View>

                {draft.purpose === 'claim' ? (
                  <>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Incident date and time</Text>
                      <View style={styles.dateTimeRow}>
                        <TouchableOpacity
                          style={styles.dateTimeButton}
                          onPress={() => setIncidentPickerMode('date')}
                          accessibilityRole="button"
                          accessibilityLabel={`Incident date. ${incidentDateLabel}`}
                        >
                          <MaterialCommunityIcons
                            name="calendar-outline"
                            size={18}
                            color={insurancePalette.amber}
                          />
                          <Text style={styles.dateTimeButtonText}>{incidentDateLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateTimeButton}
                          onPress={() => setIncidentPickerMode('time')}
                          accessibilityRole="button"
                          accessibilityLabel={`Incident time. ${incidentTimeLabel}`}
                        >
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={18}
                            color={insurancePalette.amber}
                          />
                          <Text style={styles.dateTimeButtonText}>{incidentTimeLabel}</Text>
                        </TouchableOpacity>
                      </View>
                      {incidentPickerMode ? (
                        <View style={styles.dateTimePickerWrap}>
                          <DateTimePicker
                            value={hasValidIncidentDate ? incidentDate : new Date()}
                            mode={incidentPickerMode}
                            maximumDate={new Date()}
                            onChange={handleIncidentDateChange}
                          />
                          {Platform.OS === 'ios' ? (
                            <TouchableOpacity
                              style={styles.pickerDoneButton}
                              onPress={() => setIncidentPickerMode(null)}
                            >
                              <Text style={styles.pickerDoneText}>Done</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Incident location</Text>
                      <TextInput
                        nativeID="insurance-incident-location"
                        value={draft.incidentLocation}
                        onChangeText={(value) => onChangeDraft({ incidentLocation: value })}
                        placeholder="Street, city, or nearby landmark"
                        placeholderTextColor={insurancePalette.textDim}
                        style={styles.input}
                        accessibilityLabel="Incident location"
                      />
                    </View>
                  </>
                ) : null}

                {showPolicyFields ? (
                  <>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Insurance provider</Text>
                      <TextInput
                        nativeID="insurance-provider-name"
                        value={draft.providerName}
                        onChangeText={(value) => onChangeDraft({ providerName: value })}
                        placeholder={
                          requestGuidance?.providerPlaceholder ?? 'Optional insurer or broker'
                        }
                        placeholderTextColor={insurancePalette.textDim}
                        style={styles.input}
                        accessibilityLabel="Insurance provider"
                      />
                    </View>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Policy number</Text>
                      <TextInput
                        nativeID="insurance-policy-number"
                        value={draft.policyNumber}
                        onChangeText={(value) => onChangeDraft({ policyNumber: value })}
                        placeholder={
                          requestGuidance?.policyPlaceholder ?? 'Optional policy reference'
                        }
                        placeholderTextColor={insurancePalette.textDim}
                        style={styles.input}
                        autoCapitalize="characters"
                        accessibilityLabel="Policy number"
                      />
                    </View>
                  </>
                ) : null}

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Additional details</Text>
                  <TextInput
                    nativeID="insurance-additional-details"
                    value={draft.notes}
                    onChangeText={(value) => onChangeDraft({ notes: value })}
                    placeholder={requestGuidance?.notesPlaceholder ?? 'Optional notes'}
                    placeholderTextColor={insurancePalette.textDim}
                    style={[styles.input, styles.notesInput]}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    accessibilityLabel="Additional details"
                  />
                </View>
              </InsuranceSectionDivider>

              {draft.purpose === 'renewal' && hasOnFileRenewalPolicy ? (
                <InsuranceSectionDivider title="Policy copy">
                  <View style={styles.notesCard}>
                    <Text style={styles.helperText}>
                      A policy copy is already on file. Keep it or attach a newer copy.
                    </Text>
                    <View style={styles.segmentRow}>
                      <TouchableOpacity
                        style={[
                          styles.segmentButton,
                          useOnFileRenewalPolicy && styles.segmentButtonSelected,
                        ]}
                        onPress={() => onChangeDraft({ renewalPolicyMode: 'reuse' })}
                        activeOpacity={0.88}
                        disabled={isSubmitting}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: useOnFileRenewalPolicy,
                          selected: useOnFileRenewalPolicy,
                        }}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            useOnFileRenewalPolicy && styles.segmentButtonTextSelected,
                          ]}
                        >
                          Use on-file policy
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.segmentButton,
                          !useOnFileRenewalPolicy && styles.segmentButtonSelected,
                        ]}
                        onPress={() => onChangeDraft({ renewalPolicyMode: 'replace' })}
                        activeOpacity={0.88}
                        disabled={isSubmitting}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: !useOnFileRenewalPolicy,
                          selected: !useOnFileRenewalPolicy,
                        }}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            !useOnFileRenewalPolicy && styles.segmentButtonTextSelected,
                          ]}
                        >
                          Replace policy
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </InsuranceSectionDivider>
              ) : null}
            </>
          ) : null}

          {stageIndex === 2 ? (
            <>
              <InsuranceSectionDivider title="Required documents" leading>
                <View style={styles.notesCard}>
                  {(checklist?.required ?? []).map((item) => (
                    <StagedDocumentRow
                      key={item.type}
                      item={buildDocumentItem(item)}
                      onAttach={onStageDocument}
                      onRemove={onRemoveStagedDocument}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>
              </InsuranceSectionDivider>

              {(checklist?.supporting ?? []).length ? (
                <InsuranceSectionDivider title="Optional documents">
                  <View style={styles.notesCard}>
                    {(checklist?.supporting ?? []).map((item) => (
                      <StagedDocumentRow
                        key={item.type}
                        item={buildDocumentItem(item)}
                        onAttach={onStageDocument}
                        onRemove={onRemoveStagedDocument}
                        disabled={isSubmitting}
                      />
                    ))}
                  </View>
                </InsuranceSectionDivider>
              ) : null}

              <InsuranceSectionDivider title="Review">
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewTitle}>{requestTitle}</Text>
                  <Text style={styles.reviewLine}>{selectedVehicleLabel}</Text>
                  <Text style={styles.reviewLine}>{draft.inquiryType === 'ctpl' ? 'CTPL' : 'Comprehensive'}</Text>
                  <Text style={styles.reviewBody}>{draft.description}</Text>
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => moveToStage(0)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.secondaryButtonText}>Edit coverage</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => moveToStage(1)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.secondaryButtonText}>Edit details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </InsuranceSectionDivider>

              {fieldError?.field === 'documents' ? (
                <Text style={styles.fieldErrorText} accessibilityLiveRegion="assertive">
                  {fieldError.message}
                </Text>
              ) : null}
            </>
          ) : null}

          <InlineNotice state={intakeState} message={intakeMessage} />
          {fieldError && fieldError.field !== 'description' && fieldError.field !== 'documents' ? (
            <Text style={styles.fieldErrorText} accessibilityLiveRegion="assertive">
              {fieldError.message}
            </Text>
          ) : null}
        </InsurancePanelShell>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Math.max(bottomInset, 14) }]}>
        {!canSubmitRequest ? (
          <View style={styles.footerNoticeCard}>
            <Text style={styles.footerNoticeTitle}>This insurance case is already active.</Text>
            <Text style={styles.footerNoticeText}>
              Continue from Documents or Status.
            </Text>
          </View>
        ) : null}
        <View style={styles.footerActions}>
          {stageIndex > 0 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => moveToStage(stageIndex - 1)}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={insurancePalette.text}
              />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || !canSubmitRequest) && styles.submitButtonDisabled,
              stageIndex > 0 && styles.submitButtonWithBack,
            ]}
            onPress={
              stageIndex === INSURANCE_REQUEST_STAGES.length - 1
                ? handleSubmit
                : handleContinue
            }
            disabled={isSubmitting || !canSubmitRequest}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting || !canSubmitRequest }}
          >
            {isSubmitting ? (
              <ActivityIndicator color={insurancePalette.onAmber} size="small" />
            ) : null}
            <Text style={styles.submitButtonText}>
              {isSubmitting
                ? 'Submitting...'
                : canSubmitRequest
                  ? stageIndex === INSURANCE_REQUEST_STAGES.length - 1
                    ? 'Submit request'
                    : 'Continue'
                  : 'Request already active'}
            </Text>
            {!isSubmitting && canSubmitRequest && stageIndex < INSURANCE_REQUEST_STAGES.length - 1 ? (
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={insurancePalette.onAmber}
              />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
