import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../lib/authClient';
import {
  TECHNICIAN_TARGET_STATUSES,
  addJobOrderProgress,
  formatJobOrderStatusLabel,
  listAssignedJobOrders,
  updateJobOrderStatus,
} from '../lib/jobOrdersClient';
import { colors, radius } from '../theme';

const TABS = [
  { key: 'jobOrders', label: 'Job Orders', icon: 'clipboard-list-outline' },
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'more', label: 'More', icon: 'dots-horizontal' },
];

const STATUS_TONES = {
  draft: { background: colors.surfaceMuted, text: colors.mutedText },
  assigned: { background: colors.infoSoft, text: colors.info },
  in_progress: { background: colors.primarySoft, text: colors.primary },
  blocked: { background: colors.dangerSoft, text: colors.danger },
  ready_for_qa: { background: colors.successSoft, text: colors.success },
  finalized: { background: colors.successSoft, text: colors.success },
  cancelled: { background: colors.surfaceMuted, text: colors.mutedText },
};

const isToday = (dateValue) => {
  if (!dateValue) return false;
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) return false;
  const now = new Date();
  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const shortJobOrderId = (id) => (id ? id.slice(0, 8).toUpperCase() : '—');

function StatusPill({ status, size = 'sm' }) {
  const tone = STATUS_TONES[status] ?? STATUS_TONES.draft;
  return (
    <View
      style={[
        styles.statusPill,
        size === 'lg' && styles.statusPillLarge,
        { backgroundColor: tone.background },
      ]}
    >
      <Text style={[styles.statusPillText, { color: tone.text }]}>
        {formatJobOrderStatusLabel(status)}
      </Text>
    </View>
  );
}

function JobOrderCard({ jobOrder, onOpen }) {
  const totalItems = jobOrder.items?.length ?? 0;
  const completedItems = (jobOrder.items ?? []).filter((item) => item.isCompleted).length;
  const lastProgressEntry = jobOrder.progressEntries?.[0];

  return (
    <Pressable
      onPress={() => onOpen(jobOrder)}
      style={({ pressed }) => [styles.jobOrderCard, pressed && styles.cardPressed]}
    >
      <View style={styles.jobOrderCardHeader}>
        <View style={styles.jobOrderCardHeaderText}>
          <Text style={styles.jobOrderEyebrow}>Job order</Text>
          <Text style={styles.jobOrderId}>{shortJobOrderId(jobOrder.id)}</Text>
        </View>
        <StatusPill status={jobOrder.status} />
      </View>

      <View style={styles.jobOrderRow}>
        <MaterialCommunityIcons name="format-list-checks" size={16} color={colors.mutedText} />
        <Text style={styles.jobOrderRowText}>
          {completedItems}/{totalItems} task{totalItems === 1 ? '' : 's'} done
        </Text>
      </View>

      <View style={styles.jobOrderRow}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={colors.mutedText} />
        <Text style={styles.jobOrderRowText}>Updated {formatDateTime(jobOrder.updatedAt)}</Text>
      </View>

      {lastProgressEntry ? (
        <Text numberOfLines={2} style={styles.jobOrderNote}>
          Latest: {lastProgressEntry.message}
        </Text>
      ) : null}
    </Pressable>
  );
}

function JobOrderDetailModal({ jobOrder, accessToken, visible, onClose, onChanged }) {
  const [actionStatus, setActionStatus] = useState({ kind: 'idle' });
  const [progressMessage, setProgressMessage] = useState('');
  const [progressEntryType, setProgressEntryType] = useState('note');

  useEffect(() => {
    if (!visible) {
      setActionStatus({ kind: 'idle' });
      setProgressMessage('');
      setProgressEntryType('note');
    }
  }, [visible]);

  if (!jobOrder) {
    return null;
  }

  const handleStatusChange = async (nextStatus) => {
    setActionStatus({ kind: 'submitting' });
    try {
      const updated = await updateJobOrderStatus({
        jobOrderId: jobOrder.id,
        status: nextStatus,
        accessToken,
      });
      setActionStatus({ kind: 'idle' });
      onChanged?.(updated);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not update job order status.';
      setActionStatus({ kind: 'error', message });
    }
  };

  const handleSubmitProgress = async () => {
    if (!progressMessage.trim()) {
      setActionStatus({ kind: 'error', message: 'Add a short note before saving.' });
      return;
    }
    setActionStatus({ kind: 'submitting' });
    try {
      const updated = await addJobOrderProgress({
        jobOrderId: jobOrder.id,
        entryType: progressEntryType,
        message: progressMessage,
        accessToken,
      });
      setProgressMessage('');
      setProgressEntryType('note');
      setActionStatus({ kind: 'idle' });
      onChanged?.(updated);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not append progress entry.';
      setActionStatus({ kind: 'error', message });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton} activeOpacity={0.8}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
            <Text style={styles.modalCloseText}>Back</Text>
          </TouchableOpacity>
          <StatusPill status={jobOrder.status} size="lg" />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalEyebrow}>Job order</Text>
          <Text style={styles.modalTitle}>{shortJobOrderId(jobOrder.id)}</Text>
          <Text style={styles.modalMeta}>Updated {formatDateTime(jobOrder.updatedAt)}</Text>

          {jobOrder.notes ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Service adviser notes</Text>
              <Text style={styles.detailBlockBody}>{jobOrder.notes}</Text>
            </View>
          ) : null}

          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Tasks</Text>
            {jobOrder.items?.length ? (
              jobOrder.items.map((item) => (
                <View key={item.id} style={styles.taskRow}>
                  <MaterialCommunityIcons
                    name={item.isCompleted ? 'check-circle' : 'circle-outline'}
                    size={18}
                    color={item.isCompleted ? colors.success : colors.mutedText}
                  />
                  <View style={styles.taskRowText}>
                    <Text style={styles.taskName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.taskDescription}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No tasks attached.</Text>
            )}
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Update status</Text>
            <View style={styles.statusButtonsRow}>
              {TECHNICIAN_TARGET_STATUSES.map((nextStatus) => {
                const isCurrent = jobOrder.status === nextStatus;
                return (
                  <TouchableOpacity
                    key={nextStatus}
                    style={[
                      styles.statusButton,
                      isCurrent && styles.statusButtonActive,
                      actionStatus.kind === 'submitting' && styles.statusButtonDisabled,
                    ]}
                    onPress={() => handleStatusChange(nextStatus)}
                    disabled={isCurrent || actionStatus.kind === 'submitting'}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.statusButtonText, isCurrent && styles.statusButtonTextActive]}
                    >
                      {formatJobOrderStatusLabel(nextStatus)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Add progress note</Text>
            <View style={styles.entryTypeRow}>
              {[
                { key: 'note', label: 'Note' },
                { key: 'work_started', label: 'Work started' },
                { key: 'work_completed', label: 'Work completed' },
                { key: 'issue_found', label: 'Issue found' },
              ].map((option) => {
                const isActive = progressEntryType === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.entryTypeChip, isActive && styles.entryTypeChipActive]}
                    onPress={() => setProgressEntryType(option.key)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.entryTypeChipText,
                        isActive && styles.entryTypeChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.progressInput}
              placeholder="Describe what changed..."
              placeholderTextColor={colors.mutedText}
              value={progressMessage}
              onChangeText={setProgressMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                actionStatus.kind === 'submitting' && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmitProgress}
              disabled={actionStatus.kind === 'submitting'}
              activeOpacity={0.85}
            >
              {actionStatus.kind === 'submitting' ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Save progress</Text>
              )}
            </TouchableOpacity>
          </View>

          {actionStatus.kind === 'error' ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorBannerText}>{actionStatus.message}</Text>
            </View>
          ) : null}

          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Recent activity</Text>
            {jobOrder.progressEntries?.length ? (
              jobOrder.progressEntries.slice(0, 6).map((entry) => (
                <View key={entry.id} style={styles.activityRow}>
                  <Text style={styles.activityType}>
                    {formatJobOrderStatusLabel(entry.entryType).toUpperCase()}
                  </Text>
                  <Text style={styles.activityMessage}>{entry.message}</Text>
                  <Text style={styles.activityTimestamp}>{formatDateTime(entry.createdAt)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No progress entries yet.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function HomeTab({ account, jobOrders, isLoading }) {
  const todaysAssigned = jobOrders.filter((order) => isToday(order.updatedAt)).length;
  const inProgressCount = jobOrders.filter((order) => order.status === 'in_progress').length;
  const readyForQaCount = jobOrders.filter((order) => order.status === 'ready_for_qa').length;
  const blockedCount = jobOrders.filter((order) => order.status === 'blocked').length;

  const greetingName = account?.firstName || account?.email?.split('@')?.[0] || 'Technician';

  return (
    <View style={styles.tabContent}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Welcome back</Text>
        <Text style={styles.heroTitle}>{greetingName}</Text>
        <Text style={styles.heroSubtitle}>
          Track your assigned job orders and keep service advisers in the loop.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{isLoading ? '—' : todaysAssigned}</Text>
          <Text style={styles.statLabel}>Updated today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{isLoading ? '—' : inProgressCount}</Text>
          <Text style={styles.statLabel}>In progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{isLoading ? '—' : readyForQaCount}</Text>
          <Text style={styles.statLabel}>Ready for QA</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{isLoading ? '—' : blockedCount}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
      </View>
    </View>
  );
}

function MoreTab({ account, onSignOut }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(account?.firstName?.[0] || account?.email?.[0] || 'T').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>
            {account?.firstName ? `${account.firstName} ${account.lastName ?? ''}`.trim() : 'Technician'}
          </Text>
          <Text style={styles.profileEmail}>{account?.email ?? '—'}</Text>
          {account?.staffCode ? (
            <Text style={styles.profileMeta}>Staff code: {account.staffCode}</Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => Alert.alert('Coming soon', 'Notifications will land in a future update.')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
        <Text style={styles.menuRowText}>Notifications</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.mutedText} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuRow, styles.menuRowDanger]}
        onPress={() =>
          Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: onSignOut },
          ])
        }
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="logout-variant" size={20} color={colors.danger} />
        <Text style={[styles.menuRowText, styles.menuRowTextDanger]}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function JobOrdersTab({ jobOrders, isLoading, errorMessage, onRefresh, onOpen }) {
  if (isLoading && jobOrders.length === 0) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.centerStateText}>Loading your job orders...</Text>
      </View>
    );
  }

  if (errorMessage && jobOrders.length === 0) {
    return (
      <View style={styles.centerState}>
        <MaterialCommunityIcons name="alert-circle-outline" size={32} color={colors.danger} />
        <Text style={styles.centerStateTitle}>Could not load job orders</Text>
        <Text style={styles.centerStateText}>{errorMessage}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onRefresh} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (jobOrders.length === 0) {
    return (
      <View style={styles.centerState}>
        <MaterialCommunityIcons
          name="clipboard-text-clock-outline"
          size={32}
          color={colors.mutedText}
        />
        <Text style={styles.centerStateTitle}>No assignments yet</Text>
        <Text style={styles.centerStateText}>
          When a service adviser assigns a job order to you it will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabHeading}>Assigned to you</Text>
      <Text style={styles.tabSubheading}>
        {jobOrders.length} active job order{jobOrders.length === 1 ? '' : 's'}
      </Text>
      {jobOrders.map((order) => (
        <JobOrderCard key={order.id} jobOrder={order} onOpen={onOpen} />
      ))}
    </View>
  );
}

export default function TechnicianDashboard({ account, onSignOut }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('jobOrders');
  const [jobOrders, setJobOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [openedJobOrder, setOpenedJobOrder] = useState(null);

  const accessToken = account?.accessToken;

  const loadJobOrders = useCallback(
    async ({ refreshing = false } = {}) => {
      if (!accessToken) return;
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const list = await listAssignedJobOrders({ accessToken });
        setJobOrders(list);
        setErrorMessage(null);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to load job orders.';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadJobOrders();
  }, [loadJobOrders]);

  const handleOpenJobOrder = useCallback((order) => {
    setOpenedJobOrder(order);
  }, []);

  const handleCloseJobOrder = useCallback(() => {
    setOpenedJobOrder(null);
  }, []);

  const handleJobOrderChanged = useCallback((updated) => {
    if (!updated?.id) return;
    setJobOrders((current) => {
      const next = current.map((order) => (order.id === updated.id ? updated : order));
      if (!current.some((order) => order.id === updated.id)) {
        next.unshift(updated);
      }
      return next;
    });
    setOpenedJobOrder(updated);
  }, []);

  const headerTitle = useMemo(() => {
    if (activeTab === 'jobOrders') return 'Job Orders';
    if (activeTab === 'home') return 'Dashboard';
    return 'More';
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.appBar}>
        <View>
          <Text style={styles.appBarEyebrow}>Technician</Text>
          <Text style={styles.appBarTitle}>{headerTitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void loadJobOrders({ refreshing: true })}
          activeOpacity={0.85}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 80 + insets.bottom },
        ]}
        refreshControl={
          activeTab === 'jobOrders' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadJobOrders({ refreshing: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {activeTab === 'jobOrders' ? (
          <JobOrdersTab
            jobOrders={jobOrders}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onRefresh={() => void loadJobOrders({ refreshing: true })}
            onOpen={handleOpenJobOrder}
          />
        ) : null}

        {activeTab === 'home' ? (
          <HomeTab account={account} jobOrders={jobOrders} isLoading={isLoading} />
        ) : null}

        {activeTab === 'more' ? <MoreTab account={account} onSignOut={onSignOut} /> : null}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: 12 + insets.bottom }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.bottomNavItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.mutedText}
              />
              <Text
                style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <JobOrderDetailModal
        jobOrder={openedJobOrder}
        accessToken={accessToken}
        visible={Boolean(openedJobOrder)}
        onClose={handleCloseJobOrder}
        onChanged={handleJobOrderChanged}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  appBarEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  appBarTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  tabContent: {
    gap: 14,
  },
  tabHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  tabSubheading: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: -8,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 6,
  },
  heroEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  jobOrderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.85,
  },
  jobOrderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  jobOrderCardHeaderText: {
    flexShrink: 1,
  },
  jobOrderEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  jobOrderId: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  jobOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobOrderRowText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  jobOrderNote: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  statusPillLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  centerState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  centerStateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  centerStateText: {
    color: colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    gap: 4,
  },
  bottomNavLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomNavLabelActive: {
    color: colors.primary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  profileEmail: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 2,
  },
  profileMeta: {
    color: colors.labelText,
    fontSize: 12,
    marginTop: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuRowText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  menuRowDanger: {
    borderColor: colors.dangerSoft,
  },
  menuRowTextDanger: {
    color: colors.danger,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
    paddingBottom: Platform.OS === 'web' ? 40 : 60,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  modalMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  detailBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  detailBlockLabel: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailBlockBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskRowText: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  taskDescription: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  statusButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  statusButtonDisabled: {
    opacity: 0.6,
  },
  statusButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statusButtonTextActive: {
    color: colors.primary,
  },
  entryTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  entryTypeChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  entryTypeChipText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  entryTypeChipTextActive: {
    color: colors.primary,
  },
  progressInput: {
    minHeight: 90,
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: 12,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  activityRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 4,
  },
  activityType: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  activityMessage: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  activityTimestamp: {
    color: colors.labelText,
    fontSize: 11,
  },
});
