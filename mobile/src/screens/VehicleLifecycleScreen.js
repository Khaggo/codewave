import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ApiError, listCustomerVehicles } from '../lib/authClient';
import {
  createEmptyCustomerVehicleLifecycleSnapshot,
  loadCustomerVehicleLifecycleSnapshot,
} from '../lib/vehicleLifecycleClient';
import { colors, radius } from '../theme';
import { formatVehicleDisplayName } from '../utils/validation';

const emptySnapshot = createEmptyCustomerVehicleLifecycleSnapshot();

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
      <MaterialCommunityIcons name={icon} size={32} color={colors.primary} />
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

function VehicleChip({ vehicle, isActive, onPress }) {
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
        <Text style={[styles.vehicleChipTitle, isActive && styles.vehicleChipTitleActive]}>
          {getVehicleLabel(vehicle)}
        </Text>
        <Text style={[styles.vehicleChipPlate, isActive && styles.vehicleChipPlateActive]}>
          {getVehiclePlate(vehicle)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function MetricCard({ label, value, tone = 'default' }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, tone === 'warm' && styles.metricValueWarm]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState(emptySnapshot);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0] ?? null,
    [selectedVehicleId, vehicles],
  );

  useEffect(() => {
    if (!selectedVehicleId && selectedVehicle?.id) {
      setSelectedVehicleId(selectedVehicle.id);
    }
  }, [selectedVehicle?.id, selectedVehicleId]);

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

  const serviceEvents = snapshot.events.filter((event) =>
    ['Booking', 'Inspection', 'Job Order', 'Quality Gate'].includes(event.typeLabel),
  );
  const partsEvents = snapshot.events.filter((event) =>
    String(event.title).toLowerCase().includes('part') ||
    String(event.summary).toLowerCase().includes('part'),
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={21} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>DIGITAL GARAGE</Text>
            <Text style={styles.title}>Vehicle Timeline & Lifecycle</Text>
            <Text style={styles.subtitle}>
              A customer-safe history for maintenance, repair milestones, parts notes, and future AI recommendations.
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroller}>
          {vehicles.map((vehicle) => (
            <VehicleChip
              key={vehicle.id}
              vehicle={vehicle}
              isActive={vehicle.id === selectedVehicle?.id}
              onPress={() => setSelectedVehicleId(vehicle.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.vehicleHero}>
          <Text style={styles.vehicleHeroLabel}>Selected Vehicle</Text>
          <Text style={styles.vehicleHeroTitle}>{selectedVehicle ? getVehicleLabel(selectedVehicle) : 'No vehicle selected'}</Text>
          <Text style={styles.vehicleHeroPlate}>{selectedVehicle ? getVehiclePlate(selectedVehicle) : 'Add a vehicle first'}</Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Lifecycle Events" value={snapshot.stats.totalEvents} tone="warm" />
          <MetricCard label="Verified Milestones" value={snapshot.stats.verifiedEvents} />
          <MetricCard label="Operational Notes" value={snapshot.stats.administrativeEvents} />
        </View>

        {status === 'loading' ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingTitle}>Loading lifecycle history</Text>
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
          <Text style={styles.sectionTitle}>Maintenance & Repair Timeline</Text>
          <Text style={styles.sectionText}>
            Customer-visible service milestones are listed newest first.
          </Text>
          {serviceEvents.length ? (
            <View style={styles.timelineList}>
              {serviceEvents.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyInlineText}>No maintenance or repair milestones are visible yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parts Replacement History</Text>
          <Text style={styles.sectionText}>
            Parts details will come from approved job-order evidence and invoice-ready service records.
          </Text>
          {partsEvents.length ? (
            partsEvents.map((event) => <TimelineEventCard key={event.id} event={event} />)
          ) : (
            <Text style={styles.emptyInlineText}>No customer-visible parts replacement records yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Ready Insights</Text>
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
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    gap: 14,
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
  vehicleScroller: {
    gap: 10,
    paddingRight: 16,
  },
  vehicleChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 210,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  vehicleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleChipCopy: {
    flex: 1,
  },
  vehicleChipTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 18,
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
    paddingHorizontal: 12,
    paddingVertical: 14,
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
    marginTop: 4,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 10,
    paddingVertical: 22,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
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
    gap: 12,
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
});
