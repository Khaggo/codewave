import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiError, createCustomerVehicle, listCustomerVehicles } from '../lib/authClient';
import {
  buildCustomerTimelineEventPresentation,
  createEmptyCustomerVehicleLifecycleSnapshot,
  getCustomerGarageSummary,
  listCustomerVehicleTimelinePage,
  loadCustomerVehicleLifecycleSnapshot,
} from '../lib/vehicleLifecycleClient';
import { colors, radius } from '../theme';
import styles from './vehicleLifecycleStyles';
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
  const [vehicleDraftErrors, setVehicleDraftErrors] = useState({});
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [garageSummary, setGarageSummary] = useState(null);
  const [activeSourceType, setActiveSourceType] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

  const loadSelectedVehicle = async (vehicleId, sourceType = activeSourceType) => {
    if (!vehicleId || !account?.accessToken) {
      setSnapshot(emptySnapshot);
      setGarageSummary(null);
      setStatus('empty');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const [nextSnapshot, nextGarageSummary] = await Promise.all([
        loadCustomerVehicleLifecycleSnapshot({
          vehicleId,
          sourceType,
          accessToken: account.accessToken,
        }),
        getCustomerGarageSummary({
          vehicleId,
          accessToken: account.accessToken,
        }),
      ]);

      setSnapshot(nextSnapshot);
      setGarageSummary(nextGarageSummary);
      setStatus(nextSnapshot.timelineState === 'timeline_ready' ? 'ready' : 'empty');
    } catch (error) {
      setSnapshot(emptySnapshot);
      setGarageSummary(null);
      setStatus('error');
      setErrorMessage(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'We could not load Garage details right now.',
      );
    }
  };

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

      await loadSelectedVehicle(nextSelectedVehicle.id);
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

  const handleOpenAddVehicleModal = () => {
    setVehicleDraft(createEmptyVehicleDraft());
    setVehicleDraftError('');
    setVehicleDraftErrors({});
    setIsAddVehicleModalOpen(true);
  };

  const handleCloseAddVehicleModal = () => {
    if (isSavingVehicle) {
      return;
    }

    setIsAddVehicleModalOpen(false);
    setVehicleDraftError('');
    setVehicleDraftErrors({});
  };

  const handleSaveVehicle = async () => {
    const licensePlate = normalizeLicensePlate(vehicleDraft.licensePlate).trim();
    const vehicleMake = String(vehicleDraft.vehicleMake ?? '').trim();
    const vehicleModel = String(vehicleDraft.vehicleModel ?? '').trim();
    const vehicleYear = String(vehicleDraft.vehicleYear ?? '').replace(/\D/g, '').slice(0, 4);
    const color = String(vehicleDraft.color ?? '').trim();
    const licensePlateError = validateLicensePlate(licensePlate);
    const vehicleYearError = validateVehicleYear(vehicleYear);
    const duplicatePlate = vehicles.some(
      (vehicle) => normalizeLicensePlate(getVehiclePlate(vehicle)) === licensePlate,
    );
    const nextDraftErrors = {
      ...(licensePlateError
        ? { licensePlate: licensePlateError }
        : duplicatePlate
          ? { licensePlate: 'This plate number is already saved in your Garage.' }
          : {}),
      ...(!vehicleMake ? { vehicleMake: 'Enter the vehicle make.' } : {}),
      ...(!vehicleModel ? { vehicleModel: 'Enter the vehicle model.' } : {}),
      ...(vehicleYearError ? { vehicleYear: vehicleYearError } : {}),
    };

    if (!account?.userId || !account?.accessToken) {
      setVehicleDraftError('Sign in again before adding another vehicle.');
      return;
    }

    if (Object.keys(nextDraftErrors).length) {
      setVehicleDraftErrors(nextDraftErrors);
      setVehicleDraftError('Check the highlighted vehicle details.');
      return;
    }

    setIsSavingVehicle(true);
    setVehicleDraftError('');
    setVehicleDraftErrors({});

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
      setActiveSourceType(null);
      await loadSelectedVehicle(createdVehicle.id, null);
      if (route?.params?.returnTo === 'InsuranceInquiryScreen') {
        navigation.navigate('InsuranceInquiryScreen', {
          vehicleId: createdVehicle.id,
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setVehicleDraftErrors({
          licensePlate: 'This plate number is already registered.',
        });
      }
      setVehicleDraftError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'We could not save the vehicle right now.',
      );
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const serviceEvents = snapshot.events;
  const selectedVehicleIndex = selectedVehicle
    ? vehicles.findIndex((vehicle) => vehicle.id === selectedVehicle.id)
    : -1;
  const selectedVehicleOrdinalLabel =
    selectedVehicleIndex >= 0 ? `Vehicle ${selectedVehicleIndex + 1} of ${vehicles.length || 1}` : 'Vehicle context';
  const heroHelperText = selectedVehicle
    ? 'Bookings, workshop progress, insurance, and approved service updates for this vehicle.'
    : 'Add a vehicle to start using Garage.';

  const handleSelectVehicle = async (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setActiveSourceType(null);
    await loadSelectedVehicle(vehicleId, null);
  };

  const handleChangeSource = async (sourceType) => {
    setActiveSourceType(sourceType);
    await loadSelectedVehicle(selectedVehicle?.id, sourceType);
  };

  const handleLoadMore = async () => {
    if (
      !selectedVehicle?.id ||
      !snapshot.page?.hasNext ||
      !snapshot.page?.nextCursor ||
      isLoadingMore
    ) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = await listCustomerVehicleTimelinePage({
        vehicleId: selectedVehicle.id,
        cursor: snapshot.page.nextCursor,
        sourceType: activeSourceType,
        limit: 20,
        accessToken: account?.accessToken,
      });
      const nextEvents = nextPage.items.map(buildCustomerTimelineEventPresentation);
      setSnapshot((currentSnapshot) => {
        const mergedEvents = [...currentSnapshot.events, ...nextEvents];
        const uniqueEvents = [
          ...new Map(mergedEvents.map((event) => [event.id, event])).values(),
        ];
        const verifiedEvents = uniqueEvents.filter(
          (event) => event.statusTone === 'verified',
        ).length;

        return {
          ...currentSnapshot,
          timelineState: uniqueEvents.length ? 'timeline_ready' : 'timeline_empty',
          events: uniqueEvents,
          stats: {
            totalEvents: uniqueEvents.length,
            verifiedEvents,
            administrativeEvents: uniqueEvents.length - verifiedEvents,
          },
          page: nextPage.page,
        };
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'We could not load more Garage updates.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (route?.params?.openAddVehicle) {
      handleOpenAddVehicleModal();
      navigation.setParams({ openAddVehicle: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.openAddVehicle]);

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
              <Text style={styles.title}>Garage</Text>
              <Text style={styles.subtitle}>{heroHelperText}</Text>
            </View>

            <View style={styles.heroBadgeRow}>
              <ShowcaseBadge
                icon="car-multiple"
                label={`${vehicles.length || 0} saved vehicle${vehicles.length === 1 ? '' : 's'}`}
                tone="accent"
              />
              <ShowcaseBadge
                icon="timeline-clock-outline"
                label={`${snapshot.stats.totalEvents} loaded update${snapshot.stats.totalEvents === 1 ? '' : 's'}`}
              />
            </View>

          </View>
        </View>

        <View style={styles.selectorSection}>
          <SectionHeading
            eyebrow="Vehicles"
            title="Your vehicles"
            description="Choose a vehicle to view its current work and history."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroller}>
            {paginatedVehicles.map((vehicle, index) => (
              <VehicleChip
                key={vehicle.id}
                vehicle={vehicle}
                ordinalLabel={`Vehicle ${vehiclePage * GARAGE_PAGE_SIZE + index + 1}`}
                isActive={vehicle.id === selectedVehicle?.id}
                onPress={() => handleSelectVehicle(vehicle.id)}
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
            {garageSummary?.activeBooking
              ? `Booking ${garageSummary.activeBooking.reference} is ${String(
                  garageSummary.activeBooking.status,
                ).replaceAll('_', ' ')}.`
              : 'No active booking for this vehicle.'}
          </Text>
          {selectedVehicle ? <View style={styles.quickActionRow}>
            <ActionButton
              icon="calendar-plus"
              label="Book service"
              emphasis="primary"
              onPress={() =>
                navigation.navigate('BookingScreen', {
                  vehicleId: selectedVehicle?.id,
                })
              }
            />
            <ActionButton
              icon="shield-car"
              label="Insurance"
              onPress={() =>
                navigation.navigate('InsuranceInquiryScreen', {
                  vehicleId: selectedVehicle?.id,
                })
              }
            />
          </View> : null}
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="calendar-check-outline"
            label="Booking"
            value={garageSummary?.activeBooking?.status?.replaceAll('_', ' ') ?? 'None'}
            helper={garageSummary?.activeBooking?.reference ?? 'No active booking'}
            tone="warm"
          />
          <MetricCard
            icon="wrench-clock-outline"
            label="Workshop"
            value={garageSummary?.latestJob?.status?.replaceAll('_', ' ') ?? 'None'}
            helper={
              garageSummary?.latestJob?.workshopStage?.replaceAll('_', ' ') ??
              'No active work'
            }
          />
          <MetricCard
            icon="shield-car"
            label="Insurance"
            value={garageSummary?.insurance?.status?.replaceAll('_', ' ') ?? 'None'}
            helper={garageSummary?.insurance?.providerName ?? 'No active request'}
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
            title={selectedVehicle ? 'No Garage updates yet' : 'Add your first vehicle'}
            message={
              selectedVehicle
                ? 'Booking, workshop, insurance, and approved service updates will appear here.'
                : 'Save a vehicle to use booking, insurance, and service history.'
            }
            actionLabel={selectedVehicle ? 'Refresh' : 'Add vehicle'}
            onAction={selectedVehicle ? loadLifecycle : handleOpenAddVehicleModal}
          />
        ) : null}

        <View style={styles.section}>
          <SectionHeading
            eyebrow="Vehicle History"
            title="Timeline"
            description="The newest customer-visible update appears first."
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {snapshot.filters.map((filter) => {
              const isActive = activeSourceType === filter.sourceType;

              return (
                <TouchableOpacity
                  key={filter.label}
                  style={[styles.filterButton, isActive && styles.filterButtonActive]}
                  onPress={() => handleChangeSource(filter.sourceType)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {serviceEvents.length ? (
            <View style={styles.timelineList}>
              {serviceEvents.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
              {snapshot.page?.hasNext ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                  disabled={isLoadingMore}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLoadingMore }}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : null}
                  <Text style={styles.loadMoreButtonText}>
                    {isLoadingMore ? 'Loading...' : 'Load more'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <InlineEmptyState
              icon="garage-variant-lock"
              title="No updates in this view"
              message="Try another filter or refresh after your next booking or insurance update."
            />
          )}
        </View>

        {snapshot.summaryCard.summaryText ? (
          <View style={styles.section}>
            <SectionHeading
              eyebrow="Service Summary"
              title="Approved summary"
              description="Reviewed by staff before it appears in Garage."
            />
            <View style={styles.summaryProofCard}>
              <View style={styles.summaryProofHeader}>
                <MaterialCommunityIcons name="file-document-check-outline" size={18} color={colors.primary} />
                <Text style={styles.summaryProofTitle}>Service summary</Text>
              </View>
              <Text style={styles.summaryProofText}>{snapshot.summaryCard.summaryText}</Text>
              {snapshot.summaryCard.reviewedAt ? (
                <Text style={styles.summaryProofMeta}>
                  Approved {new Date(snapshot.summaryCard.reviewedAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={isAddVehicleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAddVehicleModal}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>Add vehicle</Text>
            <Text style={styles.modalSubtitle}>Enter the vehicle details shown on its registration.</Text>
            <Text style={styles.modalFieldLabel}>Plate number</Text>
            <TextInput
                value={vehicleDraft.licensePlate}
                onChangeText={(value) => {
                  setVehicleDraft((current) => ({
                    ...current,
                    licensePlate: normalizeLicensePlate(value),
                  }));
                  setVehicleDraftErrors((current) => ({ ...current, licensePlate: undefined }));
                }}
                placeholder="Plate number"
              placeholderTextColor={colors.mutedText}
              style={[styles.modalInput, vehicleDraftErrors.licensePlate && styles.modalInputError]}
              autoCapitalize="characters"
              accessibilityLabel="Plate number"
            />
            {vehicleDraftErrors.licensePlate ? (
              <Text style={styles.modalFieldError}>{vehicleDraftErrors.licensePlate}</Text>
            ) : null}
            <Text style={styles.modalFieldLabel}>Make</Text>
            <TextInput
              value={vehicleDraft.vehicleMake}
              onChangeText={(value) => {
                setVehicleDraft((current) => ({ ...current, vehicleMake: value }));
                setVehicleDraftErrors((current) => ({ ...current, vehicleMake: undefined }));
              }}
              placeholder="Make"
              placeholderTextColor={colors.mutedText}
              style={[styles.modalInput, vehicleDraftErrors.vehicleMake && styles.modalInputError]}
              autoCapitalize="words"
              accessibilityLabel="Vehicle make"
            />
            {vehicleDraftErrors.vehicleMake ? (
              <Text style={styles.modalFieldError}>{vehicleDraftErrors.vehicleMake}</Text>
            ) : null}
            <Text style={styles.modalFieldLabel}>Model</Text>
            <TextInput
              value={vehicleDraft.vehicleModel}
              onChangeText={(value) => {
                setVehicleDraft((current) => ({ ...current, vehicleModel: value }));
                setVehicleDraftErrors((current) => ({ ...current, vehicleModel: undefined }));
              }}
              placeholder="Model"
              placeholderTextColor={colors.mutedText}
              style={[styles.modalInput, vehicleDraftErrors.vehicleModel && styles.modalInputError]}
              autoCapitalize="words"
              accessibilityLabel="Vehicle model"
            />
            {vehicleDraftErrors.vehicleModel ? (
              <Text style={styles.modalFieldError}>{vehicleDraftErrors.vehicleModel}</Text>
            ) : null}
            <Text style={styles.modalFieldLabel}>Year</Text>
            <TextInput
              value={vehicleDraft.vehicleYear}
              onChangeText={(value) => {
                setVehicleDraft((current) => ({
                  ...current,
                  vehicleYear: value.replace(/\D/g, '').slice(0, 4),
                }));
                setVehicleDraftErrors((current) => ({ ...current, vehicleYear: undefined }));
              }}
              placeholder="Year"
              placeholderTextColor={colors.mutedText}
              style={[styles.modalInput, vehicleDraftErrors.vehicleYear && styles.modalInputError]}
              keyboardType="number-pad"
              accessibilityLabel="Vehicle year"
            />
            {vehicleDraftErrors.vehicleYear ? (
              <Text style={styles.modalFieldError}>{vehicleDraftErrors.vehicleYear}</Text>
            ) : null}
            <Text style={styles.modalFieldLabel}>Color (optional)</Text>
            <TextInput
              value={vehicleDraft.color}
              onChangeText={(value) => setVehicleDraft((current) => ({ ...current, color: value }))}
              placeholder="Color (optional)"
              placeholderTextColor={colors.mutedText}
              style={styles.modalInput}
              autoCapitalize="words"
              accessibilityLabel="Vehicle color"
            />
            {vehicleDraftError ? (
              <Text style={styles.modalErrorText} accessibilityLiveRegion="assertive">
                {vehicleDraftError}
              </Text>
            ) : null}
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
