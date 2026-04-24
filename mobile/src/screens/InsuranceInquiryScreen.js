import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ApiError } from '../lib/authClient';
import {
  buildOwnedVehicleInsuranceLabel,
  createInitialCustomerInsuranceDraft,
  createInsuranceInquiry,
  createEmptyCustomerInsuranceSnapshot,
  getInsuranceInquiryById,
  getCustomerInsuranceTrackingState,
  listVehicleInsuranceRecords,
} from '../lib/insuranceClient';
import { colors, radius } from '../theme';

const inquiryTypeOptions = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'ctpl', label: 'CTPL' },
];

const formatTimestampLabel = (value) => {
  if (!value) {
    return '--';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return parsedDate.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildCustomerErrorMessage = (error, fallbackMessage) =>
  error instanceof ApiError && error.message ? error.message : fallbackMessage;

function InsuranceStatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'default',
  loading = false,
}) {
  return (
    <View
      style={[
        styles.statePanel,
        tone === 'danger' && styles.statePanelDanger,
        tone === 'success' && styles.statePanelSuccess,
      ]}
    >
      <View style={styles.statePanelHeader}>
        <View style={styles.statePanelIconWrap}>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.statePanelCopy}>
          <Text style={styles.statePanelTitle}>{title}</Text>
          <Text style={styles.statePanelText}>{message}</Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.statePanelButton} onPress={onAction} activeOpacity={0.88}>
          <Text style={styles.statePanelButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function InquiryStatusBadge({ value }) {
  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusBadgeText}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

function InsuranceRecordCard({ title, subtitle, status, metadata = [] }) {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineCardHeader}>
        <View style={styles.timelineCardCopy}>
          <Text style={styles.timelineCardTitle}>{title}</Text>
          <Text style={styles.timelineCardSubtitle}>{subtitle}</Text>
        </View>
        <InquiryStatusBadge value={status} />
      </View>

      {metadata.map((item) => (
        <DetailRow key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
      ))}
    </View>
  );
}

export default function InsuranceInquiryScreen({ account, navigation, route }) {
  const accessToken = account?.accessToken ?? null;
  const userId = account?.userId ?? null;
  const ownedVehicles = useMemo(
    () => (Array.isArray(account?.ownedVehicles) ? account.ownedVehicles.filter(Boolean) : []),
    [account?.ownedVehicles],
  );
  const hasSession = Boolean(accessToken && userId);
  const initialSnapshot = useMemo(
    () =>
      createEmptyCustomerInsuranceSnapshot({
        hasSession,
        ownedVehicles,
      }),
    [hasSession, ownedVehicles],
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    route?.params?.vehicleId ?? account?.primaryVehicleId ?? ownedVehicles[0]?.id ?? null,
  );
  const [draft, setDraft] = useState(createInitialCustomerInsuranceDraft());
  const [intakeState, setIntakeState] = useState(initialSnapshot.intakeState);
  const [intakeMessage, setIntakeMessage] = useState('');
  const [trackingState, setTrackingState] = useState(initialSnapshot.trackingState);
  const [trackingMessage, setTrackingMessage] = useState('');
  const [latestInquiry, setLatestInquiry] = useState(null);
  const [latestInquiryId, setLatestInquiryId] = useState(route?.params?.inquiryId ?? null);
  const [claimStatusUpdates, setClaimStatusUpdates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedVehicle =
    ownedVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;

  useEffect(() => {
    if (!hasSession) {
      setIntakeState('unauthorized_session');
      setTrackingState('tracking_unauthorized_session');
      return;
    }

    if (!ownedVehicles.length) {
      setSelectedVehicleId(null);
      setLatestInquiry(null);
      setClaimStatusUpdates([]);
      setIntakeState('no_vehicle');
      setTrackingState('tracking_empty');
      return;
    }

    if (!selectedVehicleId || !ownedVehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId(route?.params?.vehicleId ?? account?.primaryVehicleId ?? ownedVehicles[0]?.id ?? null);
    }

    if (!isSubmitting && intakeState === 'unauthorized_session') {
      setIntakeState('draft_ready');
    }
  }, [
    account?.primaryVehicleId,
    hasSession,
    intakeState,
    isSubmitting,
    ownedVehicles,
    route?.params?.vehicleId,
    selectedVehicleId,
  ]);

  const resetDraftState = () => {
    setDraft(createInitialCustomerInsuranceDraft());
  };

  const refreshTracking = async ({ inquiryIdOverride } = {}) => {
    if (!hasSession) {
      setTrackingState('tracking_unauthorized_session');
      setTrackingMessage('Sign in first so the app can load your claim-status updates.');
      return;
    }

    if (!selectedVehicleId) {
      setTrackingState('tracking_empty');
      setTrackingMessage('Select an owned vehicle before loading insurance tracking updates.');
      return;
    }

    const knownInquiryId = inquiryIdOverride ?? latestInquiryId ?? null;
    setIsRefreshing(true);
    setTrackingState('tracking_loading');
    setTrackingMessage('');

    try {
      let nextInquiry = latestInquiry;
      let inquiryNotFound = false;

      if (knownInquiryId) {
        try {
          nextInquiry = await getInsuranceInquiryById({
            inquiryId: knownInquiryId,
            accessToken,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            inquiryNotFound = true;
            nextInquiry = null;
          } else {
            throw error;
          }
        }
      }

      const nextRecords = await listVehicleInsuranceRecords({
        vehicleId: selectedVehicleId,
        accessToken,
      });

      setLatestInquiry(nextInquiry ?? null);
      setClaimStatusUpdates(nextRecords);
      setTrackingState(
        inquiryNotFound && !nextRecords.length
          ? 'tracking_not_found'
          : getCustomerInsuranceTrackingState({
              latestInquiry: nextInquiry ?? null,
              claimStatusUpdates: nextRecords,
            }),
      );
      setTrackingMessage(
        inquiryNotFound && !nextRecords.length
          ? 'The known inquiry could not be found anymore, but you can still track approved vehicle records here when they exist.'
          : '',
      );
    } catch (error) {
      setTrackingState('tracking_load_failed');
      setTrackingMessage(
        buildCustomerErrorMessage(
          error,
          'We could not load insurance tracking updates right now.',
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasSession || !selectedVehicleId) {
      return;
    }

    refreshTracking();
    // The screen should refresh when the selected vehicle changes or the session becomes valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSession, selectedVehicleId]);

  const handleDraftChange = (field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    if (hasSession && ownedVehicles.length && selectedVehicle) {
      setIntakeState('draft_ready');
      setIntakeMessage('');
    }
  };

  const handleSelectVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setTrackingMessage('');
    setLatestInquiry(null);
    setLatestInquiryId(null);
    setClaimStatusUpdates([]);
    setIntakeMessage('');
    if (hasSession && ownedVehicles.length) {
      setIntakeState('draft_ready');
    }
  };

  const handleSubmitInquiry = async () => {
    if (!hasSession) {
      setIntakeState('unauthorized_session');
      setIntakeMessage('Sign in first so the app can submit an insurance inquiry.');
      return;
    }

    if (!ownedVehicles.length) {
      setIntakeState('no_vehicle');
      setIntakeMessage('Add an owned vehicle before you start an insurance inquiry.');
      return;
    }

    if (!selectedVehicle) {
      setIntakeState('invalid_vehicle');
      setIntakeMessage('Select a valid owned vehicle before submitting the inquiry.');
      return;
    }

    if (!String(draft.subject ?? '').trim() || !String(draft.description ?? '').trim()) {
      setIntakeState('validation_error');
      setIntakeMessage('Subject and description are required before the inquiry can be submitted.');
      return;
    }

    setIsSubmitting(true);
    setIntakeState('submitting');
    setIntakeMessage('');

    try {
      const createdInquiry = await createInsuranceInquiry({
        userId,
        vehicleId: selectedVehicle.id,
        inquiryType: draft.inquiryType,
        subject: draft.subject,
        description: draft.description,
        providerName: draft.providerName,
        policyNumber: draft.policyNumber,
        notes: draft.notes,
        accessToken,
      });

      setLatestInquiry(createdInquiry);
      setLatestInquiryId(createdInquiry?.id ?? null);
      setIntakeState('submitted_inquiry');
      setIntakeMessage(
        `Inquiry submitted successfully with backend status ${createdInquiry?.status ?? 'submitted'}.`,
      );
      resetDraftState();
      await refreshTracking({
        inquiryIdOverride: createdInquiry?.id ?? null,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setIntakeState('validation_error');
      } else if (error instanceof ApiError && [404, 409].includes(error.status)) {
        setIntakeState('invalid_vehicle');
      } else if (error instanceof ApiError && error.status === 401) {
        setIntakeState('unauthorized_session');
      } else {
        setIntakeState('submit_failed');
      }

      setIntakeMessage(
        buildCustomerErrorMessage(error, 'We could not submit the insurance inquiry right now.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroSubtitle = hasSession
    ? 'Create an insurance inquiry using your owned vehicle, then track current inquiry status and vehicle-level claim updates without exposing staff-only review details.'
    : 'Sign in as a customer to create an insurance inquiry and see customer-safe claim-status updates.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.eyebrow}>CUSTOMER INSURANCE</Text>
            <Text style={styles.title}>Insurance inquiry intake</Text>
            <Text style={styles.subtitle}>{heroSubtitle}</Text>
            <View style={styles.routePill}>
              <Text style={styles.routePillText}>Live routes: create inquiry, get inquiry by id, vehicle insurance records</Text>
            </View>
          </View>

          {!hasSession ? (
            <InsuranceStatePanel
              icon="lock-outline"
              title="Customer session required"
              message="This mobile flow only works for a signed-in customer account because insurance creation and tracking are bearer-token protected."
              actionLabel="Sign in"
              onAction={() => navigation.navigate('Login')}
              tone="danger"
            />
          ) : null}

          {hasSession && !ownedVehicles.length ? (
            <InsuranceStatePanel
              icon="car-off"
              title="No owned vehicle on file"
              message="Insurance intake can only start from a customer-owned vehicle. Complete vehicle onboarding first, then come back here."
              tone="danger"
            />
          ) : null}

          {hasSession && ownedVehicles.length ? (
            <>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Select vehicle</Text>
                    <Text style={styles.sectionSubtitle}>
                      Vehicle ownership is the backend gate for insurance intake.
                    </Text>
                  </View>
                </View>

                <View style={styles.vehicleList}>
                  {ownedVehicles.map((vehicle) => {
                    const isSelected = vehicle.id === selectedVehicleId;

                    return (
                      <TouchableOpacity
                        key={vehicle.id}
                        style={[styles.selectionChip, isSelected && styles.selectionChipSelected]}
                        onPress={() => handleSelectVehicle(vehicle.id)}
                        activeOpacity={0.88}
                      >
                        <Text
                          style={[
                            styles.selectionChipText,
                            isSelected && styles.selectionChipTextSelected,
                          ]}
                        >
                          {buildOwnedVehicleInsuranceLabel(vehicle)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Create insurance inquiry</Text>
                    <Text style={styles.sectionSubtitle}>
                      Status values stay backend-owned. This form only uses documented live fields.
                    </Text>
                  </View>
                </View>

                <View style={styles.typeRow}>
                  {inquiryTypeOptions.map((option) => {
                    const isSelected = draft.inquiryType === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                        onPress={() => handleDraftChange('inquiryType', option.value)}
                        activeOpacity={0.88}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            isSelected && styles.typeChipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  value={draft.subject}
                  onChangeText={(value) => handleDraftChange('subject', value)}
                  placeholder="Accident repair inquiry"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  value={draft.description}
                  onChangeText={(value) => handleDraftChange('description', value)}
                  placeholder="Describe the concern, damage, or claim context."
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Provider name</Text>
                <TextInput
                  value={draft.providerName}
                  onChangeText={(value) => handleDraftChange('providerName', value)}
                  placeholder="Optional insurer or broker name"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Policy number</Text>
                <TextInput
                  value={draft.policyNumber}
                  onChangeText={(value) => handleDraftChange('policyNumber', value)}
                  placeholder="Optional policy reference"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                  autoCapitalize="characters"
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  value={draft.notes}
                  onChangeText={(value) => handleDraftChange('notes', value)}
                  placeholder="Optional customer-side notes"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {intakeMessage ? (
                  <InsuranceStatePanel
                    icon={
                      intakeState === 'submitted_inquiry'
                        ? 'check-decagram-outline'
                        : intakeState === 'submitting'
                          ? 'progress-clock'
                          : 'alert-circle-outline'
                    }
                    title={
                      intakeState === 'submitted_inquiry'
                        ? 'Inquiry submitted'
                        : intakeState === 'submitting'
                          ? 'Submitting inquiry'
                          : 'Insurance intake update'
                    }
                    message={intakeMessage}
                    tone={intakeState === 'submitted_inquiry' ? 'success' : 'default'}
                    loading={intakeState === 'submitting'}
                  />
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                  onPress={handleSubmitInquiry}
                  disabled={isSubmitting}
                  activeOpacity={0.9}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="shield-check-outline"
                        size={18}
                        color={colors.onPrimary}
                      />
                      <Text style={styles.primaryButtonText}>Submit insurance inquiry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Claim-status visibility</Text>
                <Text style={styles.sectionSubtitle}>
                  Current mobile truth comes from a known inquiry id and vehicle-level insurance records. Staff review notes stay hidden here.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => refreshTracking()}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {trackingMessage ? (
              <InsuranceStatePanel
                icon={trackingState === 'tracking_not_found' ? 'file-question-outline' : 'information-outline'}
                title={
                  trackingState === 'tracking_not_found'
                    ? 'Known inquiry missing'
                    : 'Tracking update'
                }
                message={trackingMessage}
                loading={trackingState === 'tracking_loading' || isRefreshing}
              />
            ) : null}

            {trackingState === 'tracking_loading' && !trackingMessage ? (
              <InsuranceStatePanel
                icon="refresh"
                title="Loading claim-status updates"
                message="We’re checking the latest inquiry state and vehicle-level insurance records."
                loading
              />
            ) : null}

            {latestInquiry ? (
              <InsuranceRecordCard
                title={latestInquiry.subject}
                subtitle={latestInquiry.statusHint}
                status={latestInquiry.status}
                metadata={[
                  { label: 'Inquiry type', value: latestInquiry.inquiryTypeLabel },
                  { label: 'Created', value: formatTimestampLabel(latestInquiry.createdAt) },
                  { label: 'Provider', value: latestInquiry.providerName },
                  { label: 'Policy no.', value: latestInquiry.policyNumber },
                  { label: 'Documents', value: String(latestInquiry.documentCount) },
                ]}
              />
            ) : null}

            {claimStatusUpdates.length ? (
              claimStatusUpdates.map((record) => (
                <InsuranceRecordCard
                  key={record.id}
                  title={`${record.inquiryTypeLabel} vehicle record`}
                  subtitle={record.statusHint}
                  status={record.status}
                  metadata={[
                    { label: 'Recorded', value: formatTimestampLabel(record.createdAt) },
                    { label: 'Latest update', value: formatTimestampLabel(record.updatedAt) },
                    { label: 'Provider', value: record.providerName },
                    { label: 'Policy no.', value: record.policyNumber },
                  ]}
                />
              ))
            ) : null}

            {!claimStatusUpdates.length && !latestInquiry && trackingState !== 'tracking_loading' ? (
              <InsuranceStatePanel
                icon="clipboard-text-search-outline"
                title="No claim-status updates yet"
                message="After you submit an inquiry, this screen can show the current inquiry state and later vehicle-level insurance records when staff approve them for tracking."
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        overflowX: 'hidden',
      },
    }),
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 22,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    marginBottom: 16,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  routePill: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  routePillText: {
    color: colors.labelText,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 20,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 520,
  },
  vehicleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  selectionChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  selectionChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  selectionChipTextSelected: {
    color: colors.primary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  typeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  typeChipTextSelected: {
    color: colors.primary,
  },
  fieldLabel: {
    color: colors.labelText,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  multilineInput: {
    minHeight: 102,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statePanel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  statePanelDanger: {
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  statePanelSuccess: {
    borderColor: 'rgba(63, 215, 143, 0.35)',
  },
  statePanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statePanelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statePanelCopy: {
    flex: 1,
  },
  statePanelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  statePanelText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  statePanelButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePanelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  timelineCardCopy: {
    flex: 1,
  },
  timelineCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  timelineCardSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  statusBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  detailRow: {
    marginTop: 8,
  },
  detailRowLabel: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailRowValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
