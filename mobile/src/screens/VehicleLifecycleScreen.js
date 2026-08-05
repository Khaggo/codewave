import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiError, createCustomerVehicle } from '../lib/authClient';
import { colors, radius } from '../theme';
import { GARAGE_PAGE_SIZE } from './garagePaginationModel.mjs';
import { buildGarageWorkshopMetric } from './garageWorkspaceModel.mjs';
import styles from './vehicleLifecycleStyles';
import {
  ActionButton,
  InlineEmptyState,
  InsightCard,
  MetricCard,
  SectionHeading,
  ShowcaseBadge,
  StateCard,
  TimelineEventCard,
  VehiclePickerRow,
} from './vehicleLifecycleComponents';
import {
  createEmptyVehicleDraft,
  getVehicleLabel,
  getVehiclePlate,
  getVehicleReference,
} from './vehicleLifecyclePresentation.mjs';
import useGarageWorkspaceController from './useGarageWorkspaceController';
import Sheet from '../components/ui/Sheet';
import {
  formatVehicleDisplayName,
  normalizeLicensePlate,
  validateLicensePlate,
  validateVehicleYear,
} from '../utils/validation';

function VehicleLifecycleContent({
  account,
  navigation,
  route,
  embedded = false,
  workspaceController,
  onBookVehicle,
  onOpenInsurance,
  onSelectedVehicleChange,
  refreshSignal,
}) {
  const [isVehiclePickerOpen, setIsVehiclePickerOpen] = useState(false);
  const {
    activeSourceType,
    addCreatedVehicle,
    canGoNext,
    canGoPrevious,
    changeSource: handleChangeSource,
    errorMessage,
    garagePageModel,
    garageSummary,
    isLoadingMore,
    loadLifecycle,
    loadMore: handleLoadMore,
    nextVehiclePage,
    ownedVehicleCount,
    paginatedVehicles,
    previousVehiclePage,
    searchVehicles,
    selectedVehicle,
    selectVehicle: handleSelectVehicle,
    snapshot,
    status,
    vehicleSearch,
    vehicles,
  } = workspaceController;
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState(createEmptyVehicleDraft);
  const [vehicleDraftError, setVehicleDraftError] = useState('');
  const [vehicleDraftErrors, setVehicleDraftErrors] = useState({});
  const [vehicleSearchInput, setVehicleSearchInput] = useState(vehicleSearch);
  const vehicleSearchInitializedRef = useRef(false);
  const searchVehiclesRef = useRef(searchVehicles);
  const insuranceReturnContextRef = useRef(null);

  useEffect(() => {
    searchVehiclesRef.current = searchVehicles;
  }, [searchVehicles]);

  useEffect(() => {
    if (!vehicleSearchInitializedRef.current) {
      vehicleSearchInitializedRef.current = true;
      return undefined;
    }

    const timeout = setTimeout(() => {
      void searchVehiclesRef.current(vehicleSearchInput);
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [vehicleSearchInput]);

  useEffect(() => {
    setVehicleSearchInput(vehicleSearch);
  }, [vehicleSearch]);

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

      await addCreatedVehicle(createdVehicle);
      setIsAddVehicleModalOpen(false);
      setVehicleDraft(createEmptyVehicleDraft());
      if (route?.params?.returnTo === 'InsuranceInquiryScreen') {
        const returnContext = insuranceReturnContextRef.current ?? {};
        navigation.navigate('InsuranceInquiryScreen', {
          vehicleId: createdVehicle.id,
          resumeDraftFromVehicleId:
            returnContext.sourceVehicleId ??
            route?.params?.returnInsuranceSourceVehicleId,
          resumeInsuranceTab:
            returnContext.insuranceTab ??
            route?.params?.returnInsuranceTab ??
            'request',
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
    selectedVehicleIndex >= 0
      ? `Vehicle ${
          garagePageModel.firstVisibleNumber + selectedVehicleIndex
        } of ${garagePageModel.totalVehicles || 1}`
      : 'Vehicle context';
  const heroHelperText = selectedVehicle
    ? 'Bookings, workshop progress, insurance, and approved service updates for this vehicle.'
    : vehicleSearch
      ? 'No vehicle matches the current search.'
      : 'Add a vehicle to start using Garage.';
  const workshopMetric = buildGarageWorkshopMetric(garageSummary?.latestJob);

  useEffect(() => {
    if (route?.params?.openAddVehicle) {
      if (route?.params?.returnTo === 'InsuranceInquiryScreen') {
        insuranceReturnContextRef.current = {
          sourceVehicleId: route?.params?.returnInsuranceSourceVehicleId ?? null,
          insuranceTab: route?.params?.returnInsuranceTab ?? 'request',
        };
      }
      handleOpenAddVehicleModal();
      navigation.setParams({ openAddVehicle: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.openAddVehicle]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroShell}>
          <View style={styles.heroPanel}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>DIGITAL GARAGE</Text>
              <Text style={styles.title}>Garage</Text>
              <Text style={styles.subtitle}>{heroHelperText}</Text>
            </View>

            <View style={styles.heroBadgeRow}>
              <ShowcaseBadge
                icon="car-multiple"
                label={`${ownedVehicleCount} saved vehicle${
                  ownedVehicleCount === 1 ? '' : 's'
                }`}
                tone="accent"
              />
            </View>
          </View>

          <View style={styles.heroTopRow}>
            {embedded ? (
              <View />
            ) : (
              <TouchableOpacity
                accessibilityLabel="Back"
                accessibilityRole="button"
                activeOpacity={0.86}
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <MaterialCommunityIcons name="arrow-left" size={21} color={colors.text} />
              </TouchableOpacity>
            )}
            <View style={styles.heroActions}>
              <ActionButton icon="refresh" label="Refresh" onPress={loadLifecycle} />
              <ActionButton icon="plus" label="Add vehicle" emphasis="primary" onPress={handleOpenAddVehicleModal} />
            </View>
          </View>
        </View>

        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>Selected vehicle</Text>
          <TouchableOpacity
            accessibilityLabel="Choose a Garage vehicle"
            accessibilityRole="button"
            activeOpacity={0.86}
            onPress={() => setIsVehiclePickerOpen(true)}
            style={styles.vehiclePickerButton}
          >
            <View style={styles.vehiclePickerRowIcon}>
              <MaterialCommunityIcons name="car-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.vehiclePickerRowCopy}>
              <Text style={styles.vehiclePickerRowTitle}>
                {selectedVehicle ? getVehicleLabel(selectedVehicle) : 'Choose a vehicle'}
              </Text>
              <Text style={styles.vehiclePickerRowMeta}>
                {selectedVehicle
                  ? `${getVehicleReference(selectedVehicle)} - ${getVehiclePlate(selectedVehicle)}`
                  : `${ownedVehicleCount} saved vehicles`}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={21} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        <Sheet
          visible={isVehiclePickerOpen}
          onClose={() => setIsVehiclePickerOpen(false)}
          variant="bottom"
          contentStyle={styles.vehiclePickerSheet}
        >
          <View style={styles.vehiclePickerSheetHeader}>
            <View style={styles.vehiclePickerSheetCopy}>
              <Text style={styles.vehiclePickerSheetTitle}>Choose a vehicle</Text>
              <Text style={styles.vehiclePickerSheetSubtitle}>
                {garagePageModel.totalVehicles} saved vehicle{garagePageModel.totalVehicles === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close vehicle picker"
              accessibilityRole="button"
              onPress={() => setIsVehiclePickerOpen(false)}
              style={styles.vehiclePickerCloseButton}
            >
              <MaterialCommunityIcons name="close" size={21} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.vehicleSearchField}>
            <MaterialCommunityIcons color={colors.mutedText} name="magnify" size={20} />
            <TextInput
              accessibilityLabel="Search Garage vehicles"
              autoCapitalize="none"
              autoCorrect={false}
              nativeID="garage-vehicle-search"
              onChangeText={setVehicleSearchInput}
              placeholder="Search make, model, or plate"
              placeholderTextColor={colors.mutedText}
              returnKeyType="search"
              style={styles.vehicleSearchInput}
              value={vehicleSearchInput}
            />
            {vehicleSearchInput ? (
              <TouchableOpacity
                accessibilityLabel="Clear Garage vehicle search"
                accessibilityRole="button"
                onPress={() => setVehicleSearchInput('')}
                style={styles.vehicleSearchClearButton}
              >
                <MaterialCommunityIcons color={colors.mutedText} name="close-circle" size={20} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView style={styles.vehiclePickerList} showsVerticalScrollIndicator={false}>
            {paginatedVehicles.map((vehicle) => (
              <VehiclePickerRow
                key={vehicle.id}
                vehicle={vehicle}
                isActive={vehicle.id === selectedVehicle?.id}
                onPress={() => {
                  handleSelectVehicle(vehicle.id);
                  setIsVehiclePickerOpen(false);
                }}
              />
            ))}
          </ScrollView>
          {garagePageModel.totalVehicles > GARAGE_PAGE_SIZE ? (
            <View style={styles.vehiclePickerPager}>
              <Text style={styles.vehiclePagerText}>
                {garagePageModel.firstVisibleNumber}-{garagePageModel.lastVisibleNumber} of {garagePageModel.totalVehicles}
              </Text>
              <View style={styles.vehiclePagerActions}>
                <TouchableOpacity
                  accessibilityLabel="Previous vehicles"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canGoPrevious }}
                  disabled={!canGoPrevious}
                  onPress={() => void previousVehiclePage()}
                  style={[styles.vehiclePagerButton, !canGoPrevious && styles.vehiclePagerButtonDisabled]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Next vehicles"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canGoNext }}
                  disabled={!canGoNext}
                  onPress={() => void nextVehiclePage()}
                  style={[styles.vehiclePagerButton, !canGoNext && styles.vehiclePagerButtonDisabled]}
                >
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Sheet>

        {selectedVehicle ? (
          <>
        <View style={styles.vehicleHero}>
          <View style={styles.vehicleHeroTopRow}>
            <Text style={styles.vehicleHeroLabel}>Selected Vehicle</Text>
            <ShowcaseBadge icon="map-marker-path" label={selectedVehicleOrdinalLabel} tone="accent" />
          </View>
          <Text style={styles.vehicleHeroTitle}>
            {selectedVehicle ? getVehicleLabel(selectedVehicle) : 'No vehicle selected'}
          </Text>
          <Text style={styles.vehicleHeroPlate}>
            {selectedVehicle
              ? `${getVehicleReference(selectedVehicle)} - ${getVehiclePlate(selectedVehicle)}`
              : 'Add a vehicle first'}
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
              onPress={() => {
                if (onBookVehicle) {
                  onBookVehicle(selectedVehicle.id);
                  return;
                }
                navigation.navigate('BookingScreen', {
                  vehicleId: selectedVehicle.id,
                });
              }}
            />
            <ActionButton
              icon="shield-car"
              label="Insurance"
              onPress={() => {
                if (onOpenInsurance) {
                  onOpenInsurance(selectedVehicle.id);
                  return;
                }
                navigation.navigate('InsuranceInquiryScreen', {
                  vehicleId: selectedVehicle.id,
                });
              }}
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
            value={workshopMetric.value}
            helper={workshopMetric.helper}
          />
          <MetricCard
            icon="shield-car"
            label="Insurance"
            value={garageSummary?.insurance?.status?.replaceAll('_', ' ') ?? 'None'}
            helper={garageSummary?.insurance?.providerName ?? 'No active request'}
          />
        </View>
          </>
        ) : null}

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

        {status === 'search_empty' ? (
          <StateCard
            icon="car-search-outline"
            title="No matching vehicles"
            message="Try a different make, model, or plate number."
            actionLabel="Clear search"
            onAction={() => setVehicleSearchInput('')}
          />
        ) : null}

        {selectedVehicle ? (
          <>
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
          </>
        ) : null}
      </ScrollView>
      <Modal
        visible={isAddVehicleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAddVehicleModal}
      >
        <View accessibilityViewIsModal style={styles.modalBackdrop}>
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
                  setVehicleDraftError('');
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
                setVehicleDraftError('');
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
                setVehicleDraftError('');
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
                setVehicleDraftError('');
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
              onChangeText={(value) => {
                setVehicleDraftError('');
                setVehicleDraft((current) => ({ ...current, color: value }));
              }}
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
                accessibilityLabel="Cancel adding vehicle"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSavingVehicle }}
                activeOpacity={isSavingVehicle ? 1 : 0.86}
                disabled={isSavingVehicle}
                onPress={handleCloseAddVehicleModal}
                style={styles.modalSecondaryButton}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={isSavingVehicle ? 'Saving vehicle' : 'Save vehicle'}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSavingVehicle, busy: isSavingVehicle }}
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

function VehicleLifecycleRoute(props) {
  const workspaceController = useGarageWorkspaceController({
    account: props.account,
    onSelectedVehicleChange: props.onSelectedVehicleChange,
    refreshSignal: props.refreshSignal,
    routeVehicleId: props.route?.params?.vehicleId,
  });

  return <VehicleLifecycleContent {...props} workspaceController={workspaceController} />;
}

export default function VehicleLifecycleScreen(props) {
  if (props.workspaceController) {
    return <VehicleLifecycleContent {...props} />;
  }

  return <VehicleLifecycleRoute {...props} />;
}
