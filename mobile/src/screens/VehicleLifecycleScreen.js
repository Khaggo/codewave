import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiError, createCustomerVehicle, listCustomerVehicles } from '../lib/authClient';
import {
  createEmptyCustomerVehicleLifecycleSnapshot,
  loadCustomerVehicleLifecycleSnapshot,
} from '../lib/vehicleLifecycleClient';
import { colors, radius } from '../theme';
import {
  formatVehicleDisplayName,
  normalizeLicensePlate,
  validateLicensePlate,
  validateVehicleYear,
} from '../utils/validation';

const emptySnapshot = createEmptyCustomerVehicleLifecycleSnapshot();
const GARAGE_PAGE_SIZE = 3;
const createEmptyVehicleDraft = () => ({
  licensePlate: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  color: '',
});

const getVehicleLabel = (vehicle) =>
  formatVehicleDisplayName({
    vehicleMake: vehicle?.make ?? vehicle?.vehicleMake,
    vehicleModel: vehicle?.model ?? vehicle?.vehicleModel,
    vehicleYear: vehicle?.year ?? vehicle?.vehicleYear,
  }) || vehicle?.plateNumber || vehicle?.licensePlate || 'Vehicle';

const getVehiclePlate = (vehicle) =>
  vehicle?.plateNumber ?? vehicle?.licensePlate ?? 'No plate recorded';

function StateCard({ icon = 'timeline-clock-outline', title, message, actionLabel, onAction }) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconWrap}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.86} onPress={onAction} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ActionButton({ icon, label, emphasis = 'secondary', onPress }) {
  const isPrimary = emphasis === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.actionButton, isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={isPrimary ? colors.onPrimary : colors.text}
      />
      <Text style={[styles.actionButtonText, isPrimary ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function VehicleChip({ vehicle, isActive, onPress, ordinalLabel }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.vehicleChip, isActive && styles.vehicleChipActive]}
    >
      <MaterialCommunityIcons
        name="car-outline"
        size={18}
        color={isActive ? colors.onPrimary : colors.primary}
      />
      <View style={styles.vehicleChipCopy}>
        {ordinalLabel ? <Text style={[styles.vehicleChipEyebrow, isActive && styles.vehicleChipEyebrowActive]}>{ordinalLabel}</Text> : null}
        <Text style={[styles.vehicleChipTitle, isActive && styles.vehicleChipTitleActive]}>
          {getVehicleLabel(vehicle)}
        </Text>
        <Text style={[styles.vehicleChipPlate, isActive && styles.vehicleChipPlateActive]}>
          {getVehiclePlate(vehicle)}
        </Text>
      </View>
      <MaterialCommunityIcons
        name={isActive ? 'arrow-top-right' : 'chevron-right'}
        size={18}
        color={isActive ? colors.onPrimary : colors.labelText}
      />
    </TouchableOpacity>
  );
}

function MetricCard({ icon = 'chart-box-outline', label, value, tone = 'default', helper }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <MaterialCommunityIcons
          name={icon}
          size={17}
          color={tone === 'warm' ? colors.primary : colors.text}
        />
      </View>
      <Text style={[styles.metricValue, tone === 'warm' && styles.metricValueWarm]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
}

function ShowcaseBadge({ icon, label, tone = 'neutral' }) {
  return (
    <View
      style={[
        styles.showcaseBadge,
        tone === 'accent' ? styles.showcaseBadgeAccent : styles.showcaseBadgeNeutral,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={14}
        color={tone === 'accent' ? colors.primary : colors.labelText}
      />
      <Text
        style={[
          styles.showcaseBadgeText,
          tone === 'accent' ? styles.showcaseBadgeTextAccent : styles.showcaseBadgeTextNeutral,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <View style={styles.sectionHeading}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionText}>{description}</Text> : null}
    </View>
  );
}

function InlineEmptyState({ icon = 'tray-remove', title, message }) {
  return (
    <View style={styles.inlineEmptyState}>
      <View style={styles.inlineEmptyStateIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.inlineEmptyStateCopy}>
        <Text style={styles.inlineEmptyStateTitle}>{title}</Text>
        <Text style={styles.inlineEmptyStateText}>{message}</Text>
      </View>
    </View>
  );
}

function TimelineEventCard({ event }) {
  return (
    <View style={styles.timelineEventCard}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot}>
          <MaterialCommunityIcons name={event.icon} size={16} color={colors.onPrimary} />
        </View>
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.timelineEventContent}>
        <View style={styles.timelineEventHeader}>
          <Text style={styles.timelineEventDate}>{event.dateLabel}</Text>
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>{event.typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.timelineEventTitle}>{event.title}</Text>
        <Text style={styles.timelineEventSummary}>{event.summary}</Text>
        <Text style={styles.timelineEventMeta}>{event.metaLabel}</Text>
      </View>
    </View>
  );
}

function InsightCard({ icon, title, message }) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.insightCopy}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightText}>{message}</Text>
      </View>
    </View>
  );
}

export default function VehicleLifecycleScreen({ account, navigation, route }) {
  const [vehicles, setVehicles] = useState(account?.ownedVehicles ?? []);
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    route?.params?.vehicleId ?? account?.primaryVehicleId ?? account?.ownedVehicles?.[0]?.id ?? null,
  );
  const [vehiclePage, setVehiclePage] = useState(0);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState(createEmptyVehicleDraft);
  const [vehicleDraftError, setVehicleDraftError] = useState('');
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState(emptySnapshot);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0] ?? null,
    [selectedVehicleId, vehicles],
  );
  const totalVehiclePages = Math.max(1, Math.ceil(vehicles.length / GARAGE_PAGE_SIZE));
  const paginatedVehicles = useMemo(
    () =>
      vehicles.slice(
        vehiclePage * GARAGE_PAGE_SIZE,
        (vehiclePage + 1) * GARAGE_PAGE_SIZE,
      ),
    [vehiclePage, vehicles],
  );

  useEffect(() => {
    if (!selectedVehicleId && selectedVehicle?.id) {
      setSelectedVehicleId(selectedVehicle.id);
    }
  }, [selectedVehicle?.id, selectedVehicleId]);

  useEffect(() => {
    setVehiclePage((currentPage) => Math.min(currentPage, totalVehiclePages - 1));
  }, [totalVehiclePages]);

  const loadLifecycle = async () => {
    const accessToken = account?.accessToken;
    const userId = account?.userId;

    if (!accessToken || !userId) {
      setStatus('error');
      setErrorMessage('Sign in again before loading your vehicle lifecycle.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const liveVehicles = await listCustomerVehicles({ userId, accessToken });
      const nextVehicles = liveVehicles.length ? liveVehicles : account?.ownedVehicles ?? [];
      const preferredVehicleId =
        selectedVehicleId ??
        route?.params?.vehicleId ??
        account?.primaryVehicleId ??
        nextVehicles[0]?.id ??
        null;
      const nextSelectedVehicle =
        nextVehicles.find((vehicle) => vehicle.id === preferredVehicleId) ?? nextVehicles[0] ?? null;

      setVehicles(nextVehicles);
      setSelectedVehicleId(nextSelectedVehicle?.id ?? null);

      if (!nextSelectedVehicle?.id) {
        setSnapshot(emptySnapshot);
        setStatus('empty');
        return;
      }

      const nextSnapshot = await loadCustomerVehicleLifecycleSnapshot({
        vehicleId: nextSelectedVehicle.id,
        accessToken,
      });

      setSnapshot(nextSnapshot);
      setStatus(nextSnapshot.timelineState === 'timeline_ready' ? 'ready' : 'empty');
    } catch (error) {
      setSnapshot(emptySnapshot);
      setStatus('error');
      setErrorMessage(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'We could not load lifecycle history right now.',
      );
    }
  };

  useEffect(() => {
    loadLifecycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.accessToken, account?.userId, route?.params?.vehicleId]);

  useEffect(() => {
    if (!selectedVehicleId || status === 'loading') {
      return;
    }

    const refreshSelectedVehicle = async () => {
      try {
        setStatus('loading');
        const nextSnapshot = await loadCustomerVehicleLifecycleSnapshot({
          vehicleId: selectedVehicleId,
          accessToken: account?.accessToken,
        });
        setSnapshot(nextSnapshot);
        setStatus(nextSnapshot.timelineState === 'timeline_ready' ? 'ready' : 'empty');
      } catch (error) {
        setSnapshot(emptySnapshot);
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'We could not load lifecycle history right now.',
        );
      }
    };

    refreshSelectedVehicle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  const handleOpenAddVehicleModal = () => {
    setVehicleDraft(createEmptyVehicleDraft());
    setVehicleDraftError('');
    setIsAddVehicleModalOpen(true);
  };

  const handleCloseAddVehicleModal = () => {
    if (isSavingVehicle) {
      return;
    }

    setIsAddVehicleModalOpen(false);
    setVehicleDraftError('');
  };

  const handleSaveVehicle = async () => {
    const licensePlate = normalizeLicensePlate(vehicleDraft.licensePlate).trim();
    const vehicleMake = String(vehicleDraft.vehicleMake ?? '').trim();
    const vehicleModel = String(vehicleDraft.vehicleModel ?? '').trim();
    const vehicleYear = String(vehicleDraft.vehicleYear ?? '').replace(/\D/g, '').slice(0, 4);
    const color = String(vehicleDraft.color ?? '').trim();
    const licensePlateError = validateLicensePlate(licensePlate);
    const vehicleYearError = validateVehicleYear(vehicleYear);

    if (!account?.userId || !account?.accessToken) {
      setVehicleDraftError('Sign in again before adding another vehicle.');
      return;
    }

    if (licensePlateError) {
      setVehicleDraftError(licensePlateError);
      return;
    }

    if (!vehicleMake || !vehicleModel) {
      setVehicleDraftError('Make and model are required before adding another vehicle.');
      return;
    }

    if (vehicleYearError) {
      setVehicleDraftError(vehicleYearError);
      return;
    }

    setIsSavingVehicle(true);
    setVehicleDraftError('');

    try {
      const createdVehicle = await createCustomerVehicle({
        userId: account.userId,
        licensePlate,
        vehicleMake,
        vehicleModel,
        vehicleYear: Number(vehicleYear),
        color: color || undefined,
        accessToken: account.accessToken,
      });

      const nextVehicles = [...vehicles, createdVehicle];
      setVehicles(nextVehicles);
      setSelectedVehicleId(createdVehicle.id);
      setVehiclePage(Math.max(0, Math.ceil(nextVehicles.length / GARAGE_PAGE_SIZE) - 1));
      setIsAddVehicleModalOpen(false);
      setVehicleDraft(createEmptyVehicleDraft());
      setStatus('loading');

      const nextSnapshot = await loadCustomerVehicleLifecycleSnapshot({
        vehicleId: createdVehicle.id,
        accessToken: account.accessToken,
      });
      setSnapshot(nextSnapshot);
      setStatus(nextSnapshot.timelineState === 'timeline_ready' ? 'ready' : 'empty');
    } catch (error) {
      setVehicleDraftError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'We could not save the vehicle right now.',
      );
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const serviceEvents = snapshot.events.filter((event) =>
    ['Booking', 'Inspection', 'Job Order', 'Quality Gate'].includes(event.typeLabel),
  );
  const partsEvents = snapshot.events.filter((event) =>
    String(event.title).toLowerCase().includes('part') ||
    String(event.summary).toLowerCase().includes('part'),
  );
  const selectedVehicleIndex = selectedVehicle
    ? vehicles.findIndex((vehicle) => vehicle.id === selectedVehicle.id)
    : -1;
  const selectedVehicleOrdinalLabel =
    selectedVehicleIndex >= 0 ? `Vehicle ${selectedVehicleIndex + 1} of ${vehicles.length || 1}` : 'Vehicle context';
  const lifecycleReadinessLabel =
    status === 'ready'
      ? 'Timeline ready'
      : status === 'loading'
        ? 'Refreshing timeline'
        : status === 'error'
          ? 'Needs retry'
          : 'Awaiting first milestone';
  const summaryStatusLabel = snapshot.summaryCard.summaryText
    ? 'Reviewed summary available'
    : 'Summary unlocks after staff approval';
  const heroHelperText = selectedVehicle
    ? 'A customer-safe history for maintenance, repairs, approved milestones, and future AI recommendations.'
    : 'Add a vehicle to stage the customer-facing lifecycle timeline for bookings, inspections, QA, and approved summaries.';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroShell}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={21} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <ActionButton icon="refresh" label="Refresh" onPress={loadLifecycle} />
              <ActionButton icon="plus" label="Add vehicle" emphasis="primary" onPress={handleOpenAddVehicleModal} />
            </View>
          </View>

          <View style={styles.heroPanel}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>DIGITAL GARAGE</Text>
              <Text style={styles.title}>Vehicle Timeline & Lifecycle</Text>
              <Text style={styles.subtitle}>{heroHelperText}</Text>
            </View>

            <View style={styles.heroBadgeRow}>
              <ShowcaseBadge
                icon="car-multiple"
                label={`${vehicles.length || 0} saved vehicle${vehicles.length === 1 ? '' : 's'}`}
                tone="accent"
              />
              <ShowcaseBadge icon="timeline-clock-outline" label={lifecycleReadinessLabel} />
              <ShowcaseBadge icon="shield-check-outline" label={summaryStatusLabel} />
            </View>

            <View style={styles.heroNarrativeCard}>
              <Text style={styles.heroNarrativeEyebrow}>Panel Demo Focus</Text>
              <Text style={styles.heroNarrativeTitle}>
                {selectedVehicle ? getVehicleLabel(selectedVehicle) : 'Select a vehicle to spotlight'}
              </Text>
              <Text style={styles.heroNarrativeText}>
                Showcase one vehicle’s visible service journey, approved lifecycle proof, and customer-safe summary in one polished mobile view.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.selectorSection}>
          <SectionHeading
            eyebrow="Garage Lineup"
            title="Choose the vehicle you want to present"
            description="Switch the customer context before reviewing lifecycle proof, parts history, and AI-ready summary cards."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroller}>
            {paginatedVehicles.map((vehicle, index) => (
              <VehicleChip
                key={vehicle.id}
                vehicle={vehicle}
                ordinalLabel={`Slot ${vehiclePage * GARAGE_PAGE_SIZE + index + 1}`}
                isActive={vehicle.id === selectedVehicle?.id}
                onPress={() => setSelectedVehicleId(vehicle.id)}
              />
            ))}
          </ScrollView>
          {vehicles.length > GARAGE_PAGE_SIZE ? (
            <View style={styles.vehiclePagerRow}>
              <Text style={styles.vehiclePagerText}>
                Showing {Math.min(vehiclePage * GARAGE_PAGE_SIZE + 1, vehicles.length)}-
                {Math.min((vehiclePage + 1) * GARAGE_PAGE_SIZE, vehicles.length)} of {vehicles.length} vehicles
              </Text>
              <View style={styles.vehiclePagerActions}>
                <TouchableOpacity
                  activeOpacity={vehiclePage === 0 ? 1 : 0.86}
                  disabled={vehiclePage === 0}
                  onPress={() => setVehiclePage((currentPage) => Math.max(0, currentPage - 1))}
                  style={[styles.vehiclePagerButton, vehiclePage === 0 && styles.vehiclePagerButtonDisabled]}
                >
                  <Text style={styles.vehiclePagerButtonText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={vehiclePage >= totalVehiclePages - 1 ? 1 : 0.86}
                  disabled={vehiclePage >= totalVehiclePages - 1}
                  onPress={() =>
                    setVehiclePage((currentPage) => Math.min(totalVehiclePages - 1, currentPage + 1))
                  }
                  style={[
                    styles.vehiclePagerButton,
                    vehiclePage >= totalVehiclePages - 1 && styles.vehiclePagerButtonDisabled,
                  ]}
                >
                  <Text style={styles.vehiclePagerButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.vehicleHero}>
          <View style={styles.vehicleHeroTopRow}>
            <Text style={styles.vehicleHeroLabel}>Selected Vehicle</Text>
            <ShowcaseBadge icon="map-marker-path" label={selectedVehicleOrdinalLabel} tone="accent" />
          </View>
          <Text style={styles.vehicleHeroTitle}>
            {selectedVehicle ? getVehicleLabel(selectedVehicle) : 'No vehicle selected'}
          </Text>
          <Text style={styles.vehicleHeroPlate}>
            {selectedVehicle ? getVehiclePlate(selectedVehicle) : 'Add a vehicle first'}
          </Text>
          <Text style={styles.vehicleHeroDescription}>
            This vehicle is the active customer-facing context for maintenance milestones, verified release proof, and AI-ready lifecycle storytelling.
          </Text>
          <View style={styles.vehicleHeroMetaRow}>
            <ShowcaseBadge icon="timeline-text-outline" label={`${snapshot.stats.totalEvents} visible events`} />
            <ShowcaseBadge icon="check-decagram-outline" label={`${snapshot.stats.verifiedEvents} verified milestones`} />
            <ShowcaseBadge icon="notebook-outline" label={`${snapshot.stats.administrativeEvents} operational notes`} />
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="timeline-clock-outline"
            label="Lifecycle Events"
            value={snapshot.stats.totalEvents}
            helper="Timeline depth"
            tone="warm"
          />
          <MetricCard
            icon="shield-check-outline"
            label="Verified Milestones"
            value={snapshot.stats.verifiedEvents}
            helper="Panel-ready proof"
          />
          <MetricCard
            icon="clipboard-text-outline"
            label="Operational Notes"
            value={snapshot.stats.administrativeEvents}
            helper="Context signals"
          />
        </View>

        {status === 'loading' ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
            <Text style={styles.loadingTitle}>Loading lifecycle history</Text>
            <Text style={styles.loadingText}>
              Refreshing service milestones, inspections, QA, and summary proof for this vehicle.
            </Text>
          </View>
        ) : null}

        {status === 'error' ? (
          <StateCard
            icon="alert-circle-outline"
            title="Lifecycle unavailable"
            message={errorMessage || 'We could not load this vehicle lifecycle right now.'}
            actionLabel="Retry"
            onAction={loadLifecycle}
          />
        ) : null}

        {status === 'empty' ? (
          <StateCard
            title="No lifecycle events yet"
            message="Bookings, inspections, job orders, QA releases, and approved summaries will appear here after staff process this vehicle."
            actionLabel="Refresh"
            onAction={loadLifecycle}
          />
        ) : null}

        <View style={styles.section}>
          <SectionHeading
            eyebrow="Service Timeline"
            title="Maintenance & Repair Timeline"
            description="Customer-visible service milestones are arranged newest first so the latest progress reads clearly during demos."
          />
          {serviceEvents.length ? (
            <View style={styles.timelineList}>
              {serviceEvents.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </View>
          ) : (
            <InlineEmptyState
              icon="garage-variant-lock"
              title="No maintenance milestones visible yet"
              message="Once bookings move through inspection, job orders, and QA release, the service story will appear here."
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow="Repair Evidence"
            title="Parts Replacement History"
            description="Parts details come from approved job-order evidence and invoice-ready service records."
          />
          {partsEvents.length ? (
            partsEvents.map((event) => <TimelineEventCard key={event.id} event={event} />)
          ) : (
            <InlineEmptyState
              icon="wrench-outline"
              title="No customer-visible parts records yet"
              message="Approved parts replacements will appear here after staff complete and release the supporting service records."
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow="Future Intelligence"
            title="AI-Ready Insights"
            description="This area shows how reviewed lifecycle evidence can grow into clear customer guidance and future recommendations."
          />
          <InsightCard
            icon="brain"
            title="Predicted maintenance recommendations"
            message="Reserved for future AI summaries after enough verified service history exists."
          />
          <InsightCard
            icon="shield-check-outline"
            title={snapshot.summaryCard.title}
            message={snapshot.summaryCard.helperText}
          />
          {snapshot.summaryCard.summaryText ? (
            <View style={styles.summaryProofCard}>
              <View style={styles.summaryProofHeader}>
                <MaterialCommunityIcons name="file-document-check-outline" size={18} color={colors.primary} />
                <Text style={styles.summaryProofTitle}>Customer-visible reviewed summary</Text>
              </View>
              <Text style={styles.summaryProofText}>{snapshot.summaryCard.summaryText}</Text>
              {snapshot.summaryCard.reviewedAt ? (
                <Text style={styles.summaryProofMeta}>
                  Reviewed and approved on {new Date(snapshot.summaryCard.reviewedAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <Modal
        visible={isAddVehicleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAddVehicleModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add another vehicle</Text>
            <Text style={styles.modalSubtitle}>
              Save a second car directly into the customer garage so booking, lifecycle, and insurance flows can target it.
            </Text>
              <TextInput
                value={vehicleDraft.licensePlate}
                onChangeText={(value) => setVehicleDraft((current) => ({ ...current, licensePlate: normalizeLicensePlate(value) }))}
                placeholder="Plate number"
              placeholderTextColor={colors.mutedText}
              style={styles.modalInput}
              autoCapitalize="characters"
            />
            <TextInput
              value={vehicleDraft.vehicleMake}
              onChangeText={(value) => setVehicleDraft((current) => ({ ...current, vehicleMake: value }))}
              placeholder="Make"
              placeholderTextColor={colors.mutedText}
              style={styles.modalInput}
              autoCapitalize="words"
            />
            <TextInput
              value={vehicleDraft.vehicleModel}
              onChangeText={(value) => setVehicleDraft((current) => ({ ...current, vehicleModel: value }))}
              placeholder="Model"
              placeholderTextColor={colors.mutedText}
              style={styles.modalInput}
              autoCapitalize="words"
            />
            <TextInput
              value={vehicleDraft.vehicleYear}
              onChangeText={(value) => setVehicleDraft((current) => ({ ...current, vehicleYear: value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="Year"
              placeholderTextColor={colors.mutedText}
              style={styles.modalInput}
              keyboardType="number-pad"
            />
            <TextInput
              value={vehicleDraft.color}
              onChangeText={(value) => setVehicleDraft((current) => ({ ...current, color: value }))}
              placeholder="Color (optional)"
              placeholderTextColor={colors.mutedText}
              style={styles.modalInput}
              autoCapitalize="words"
            />
            {vehicleDraftError ? <Text style={styles.modalErrorText}>{vehicleDraftError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={isSavingVehicle ? 1 : 0.86}
                disabled={isSavingVehicle}
                onPress={handleCloseAddVehicleModal}
                style={styles.modalSecondaryButton}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={isSavingVehicle ? 1 : 0.86}
                disabled={isSavingVehicle}
                onPress={handleSaveVehicle}
                style={styles.modalPrimaryButton}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {isSavingVehicle ? 'Saving...' : 'Save vehicle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 18,
  },
  heroShell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonTextPrimary: {
    color: colors.onPrimary,
  },
  actionButtonTextSecondary: {
    color: colors.text,
  },
  heroPanel: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 18,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 33,
    marginTop: 5,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  showcaseBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  showcaseBadgeAccent: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryGlow,
    borderWidth: 1,
  },
  showcaseBadgeNeutral: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
  },
  showcaseBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  showcaseBadgeTextAccent: {
    color: colors.primary,
  },
  showcaseBadgeTextNeutral: {
    color: colors.labelText,
  },
  heroNarrativeCard: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  heroNarrativeEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroNarrativeTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 8,
  },
  heroNarrativeText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  selectorSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  sectionHeading: {
    gap: 6,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  vehicleScroller: {
    gap: 10,
    paddingRight: 16,
  },
  vehiclePagerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehiclePagerText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  vehiclePagerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  vehiclePagerButton: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vehiclePagerButtonDisabled: {
    opacity: 0.45,
  },
  vehiclePagerButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  vehicleChip: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 12,
    minWidth: 244,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  vehicleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
  },
  vehicleChipEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  vehicleChipEyebrowActive: {
    color: colors.onPrimary,
    opacity: 0.78,
  },
  vehicleChipCopy: {
    flex: 1,
  },
  vehicleChipTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  vehicleChipTitleActive: {
    color: colors.onPrimary,
  },
  vehicleChipPlate: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 3,
  },
  vehicleChipPlateActive: {
    color: colors.onPrimary,
    opacity: 0.82,
  },
  vehicleHero: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  vehicleHeroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleHeroLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  vehicleHeroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  vehicleHeroPlate: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  vehicleHeroDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  vehicleHeroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  metricIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  metricValueWarm: {
    color: colors.primary,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  metricHelper: {
    color: colors.labelText,
    fontSize: 11,
    lineHeight: 15,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  loadingIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  stateIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  stateText: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyInlineText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  inlineEmptyState: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  inlineEmptyStateIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  inlineEmptyStateCopy: {
    flex: 1,
  },
  inlineEmptyStateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  inlineEmptyStateText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  timelineList: {
    gap: 12,
  },
  timelineEventCard: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    alignItems: 'center',
    width: 34,
  },
  timelineDot: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  timelineLine: {
    backgroundColor: colors.border,
    flex: 1,
    marginTop: 6,
    width: 2,
  },
  timelineEventContent: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  timelineEventHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  timelineEventDate: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  eventBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  eventBadgeText: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '800',
  },
  timelineEventTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },
  timelineEventSummary: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  timelineEventMeta: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 9,
  },
  insightCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  insightIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  insightCopy: {
    flex: 1,
  },
  insightTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  insightText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  summaryProofCard: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  summaryProofHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  summaryProofTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryProofText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },
  summaryProofMeta: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalPrimaryButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  modalSecondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalSecondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
