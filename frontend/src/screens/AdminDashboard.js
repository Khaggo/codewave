import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

const sidebarItems = [
  { key: 'users', label: 'User Management', icon: 'account-group-outline' },
  { key: 'requests', label: 'Service Requests', icon: 'clipboard-text-clock-outline' },
  { key: 'alerts', label: 'AI Maintenance Alerts', icon: 'chart-timeline-variant' },
];

const statusFlow = ['Pending', 'In Progress', 'Completed'];

function MetricCard({ label, value, icon, accent = false, helper }) {
  return (
    <View style={[styles.metricCard, accent && styles.metricCardAccent]}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIconWrap, accent && styles.metricIconWrapAccent]}>
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={accent ? '#1F1202' : '#FFB866'}
          />
        </View>
        <Text style={[styles.metricLabel, accent && styles.metricLabelAccent]}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, accent && styles.metricValueAccent]}>{value}</Text>
      <Text style={[styles.metricHelper, accent && styles.metricHelperAccent]}>{helper}</Text>
    </View>
  );
}

function StatusPill({ label }) {
  const toneStyle =
    label === 'Completed' || label === 'Active'
      ? styles.statusSuccess
      : label === 'In Progress'
        ? styles.statusInfo
        : label === 'Pending'
          ? styles.statusWarning
          : label === 'Inactive'
            ? styles.statusDanger
            : styles.statusNeutral;

  return (
    <View style={[styles.statusPill, toneStyle]}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, copy }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name={icon} size={20} color="#FFB866" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

export default function AdminDashboard({
  account,
  users = [],
  serviceRequests = [],
  onToggleUserStatus,
  onRequestDeleteUser,
  onAdvanceRequestStatus,
  onRequestResetData,
  onSignOut,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;
  const [activeSection, setActiveSection] = useState('users');

  const alerts = useMemo(() => {
    if (users.length === 0) {
      return [
        {
          id: 'alert-1',
          title: 'Plate ABC-1234: Oil change predicted in 500km.',
          severity: 'High Priority',
          detail: 'The predictive maintenance model detected accelerated oil wear based on recent service cadence.',
        },
        {
          id: 'alert-2',
          title: 'Plate QWE-5678: Brake inspection suggested within 14 days.',
          severity: 'Advisory',
          detail: 'Brake usage patterns and maintenance intervals indicate an upcoming inspection threshold.',
        },
      ];
    }

    return users.slice(0, 5).map((user, index) => ({
      id: user.id,
      title:
        index % 2 === 0
          ? `Plate ${user.licensePlate || 'UNASSIGNED'}: Oil change predicted in 500km.`
          : `Plate ${user.licensePlate || 'UNASSIGNED'}: Battery health review suggested in 10 days.`,
      severity: index % 2 === 0 ? 'High Priority' : 'Advisory',
      detail: `${user.fullName} | ${user.vehicleModel || 'Vehicle pending'} | AI confidence ${94 - index}%.`,
    }));
  }, [users]);

  const metrics = useMemo(
    () => [
      {
        label: 'Registered Users',
        value: String(users.length).padStart(2, '0'),
        icon: 'account-group-outline',
        accent: true,
        helper: 'Managed customer records',
      },
      {
        label: 'Open Requests',
        value: String(serviceRequests.filter((request) => request.status !== 'Completed').length).padStart(2, '0'),
        icon: 'clipboard-text-clock-outline',
        helper: 'Bookings needing attention',
      },
      {
        label: 'AI Alerts',
        value: String(alerts.length).padStart(2, '0'),
        icon: 'chart-timeline-variant',
        helper: 'Predictive service signals',
      },
      {
        label: 'Active Users',
        value: String(users.filter((user) => user.isActive !== false).length).padStart(2, '0'),
        icon: 'shield-check-outline',
        helper: 'Accounts currently enabled',
      },
    ],
    [alerts.length, serviceRequests, users],
  );

  const renderUsers = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>User Management</Text>
          <Text style={styles.sectionSubtitle}>
            Review customer records, account status, and quick access controls from one table.
          </Text>
        </View>
      </View>

      {users.length === 0 ? (
        <EmptyState
          icon="account-off-outline"
          title="No managed users yet"
          copy="Customer records added to the prototype will appear here for admin review."
        />
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.headerCellWide]}>Customer</Text>
            <Text style={styles.headerCell}>Phone</Text>
            <Text style={styles.headerCell}>Vehicle</Text>
            <Text style={styles.headerCell}>Status</Text>
            <Text style={[styles.headerCell, styles.headerCellAction]}>Action</Text>
          </View>

          {users.map((user) => {
            const isActive = user.isActive !== false;

            return (
              <View key={user.id} style={styles.tableRow}>
                <View style={[styles.bodyCell, styles.bodyCellWide]}>
                  <Text style={styles.primaryCellText}>{user.fullName}</Text>
                  <Text style={styles.secondaryCellText}>{user.email}</Text>
                </View>
                <View style={styles.bodyCell}>
                  <Text style={styles.bodyCellText}>{user.phoneNumber}</Text>
                </View>
                <View style={styles.bodyCell}>
                  <Text style={styles.bodyCellText}>{user.vehicleModel || 'Pending'}</Text>
                </View>
                <View style={styles.bodyCell}>
                  <StatusPill label={isActive ? 'Active' : 'Inactive'} />
                </View>
                <View style={[styles.bodyCell, styles.actionCell]}>
                  <Pressable
                    style={[styles.actionButton, isActive ? styles.warningButton : styles.successButton]}
                    onPress={() => onToggleUserStatus?.(user.id)}
                  >
                    <Text style={styles.actionButtonText}>{isActive ? 'Deactivate' : 'Activate'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => onRequestDeleteUser?.(user)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderRequests = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionTitle}>Service Requests</Text>
          <Text style={styles.sectionSubtitle}>
            Advance booking flow from pending to in progress to completed with one click.
          </Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={onRequestResetData}>
          <MaterialCommunityIcons name="refresh" size={16} color="#FFB866" />
          <Text style={styles.secondaryButtonText}>Reset Demo Data</Text>
        </Pressable>
      </View>

      {serviceRequests.length === 0 ? (
        <EmptyState
          icon="clipboard-remove-outline"
          title="No service requests available"
          copy="Requests will appear here when demo data or live booking records are available."
        />
      ) : (
        <View style={styles.cardList}>
          {serviceRequests.map((request) => {
            const currentIndex = statusFlow.indexOf(request.status);
            const nextStatus = statusFlow[(currentIndex + 1) % statusFlow.length];

            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.requestHeaderCopy}>
                    <Text style={styles.requestTitle}>{request.customerName}</Text>
                    <Text style={styles.requestMeta}>{request.serviceType}</Text>
                  </View>
                  <StatusPill label={request.status} />
                </View>
                <Text style={styles.requestDetail}>Vehicle: {request.vehicle}</Text>
                <Text style={styles.requestDetail}>Schedule: {request.schedule}</Text>
                <Text style={styles.requestDetail}>Notes: {request.notes}</Text>
                <Pressable
                  style={[styles.actionButton, styles.primaryActionButton]}
                  onPress={() => onAdvanceRequestStatus?.(request.id)}
                >
                  <Text style={styles.actionButtonText}>Update Status to {nextStatus}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderAlerts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>AI Maintenance Alerts</Text>
          <Text style={styles.sectionSubtitle}>
            Predictive maintenance guidance based on usage patterns and service cadence.
          </Text>
        </View>
      </View>

      <View style={styles.cardList}>
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <View style={styles.alertTag}>
                <Text style={styles.alertTagText}>{alert.severity}</Text>
              </View>
            </View>
            <Text style={styles.alertDetail}>{alert.detail}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.layout, !isDesktop && styles.layoutStacked]}>
        <View style={[styles.sidebar, !isDesktop && styles.sidebarStacked]}>
          <View>
            <View style={styles.sidebarBadge}>
              <MaterialCommunityIcons name="shield-car" size={16} color="#FFB866" />
              <Text style={styles.sidebarBadgeText}>Cruisers Crib Admin</Text>
            </View>
            <Text style={styles.sidebarTitle}>Control Center</Text>
            <Text style={styles.sidebarSubtitle}>Signed in as {account?.email || 'admin@cruiserscrib.com'}.</Text>

            <View style={styles.sidebarNav}>
              {sidebarItems.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveSection(item.key)}
                  style={[
                    styles.sidebarButton,
                    activeSection === item.key && styles.sidebarButtonActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color={activeSection === item.key ? '#17100A' : '#FFB866'}
                  />
                  <Text
                    style={[
                      styles.sidebarButtonText,
                      activeSection === item.key && styles.sidebarButtonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.signOutButton} onPress={onSignOut}>
            <MaterialCommunityIcons name="logout" size={18} color="#2F1703" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroCopyWrap}>
              <Text style={styles.heroEyebrow}>Operations Overview</Text>
              <Text style={styles.heroTitle}>Admin Dashboard</Text>
              <Text style={styles.heroCopy}>
                Monitor users, bookings, and predictive maintenance signals from a clear, focused workspace designed for daily operations.
              </Text>
            </View>
            <View style={styles.heroInfoPill}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#FFB866" />
              <Text style={styles.heroInfoPillText}>Secure session active</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
                accent={metric.accent}
                helper={metric.helper}
              />
            ))}
          </View>

          {activeSection === 'users' ? renderUsers() : null}
          {activeSection === 'requests' ? renderRequests() : null}
          {activeSection === 'alerts' ? renderAlerts() : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080809',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  layoutStacked: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 310,
    backgroundColor: '#0E0F11',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  sidebarStacked: {
    width: '100%',
    gap: 28,
  },
  sidebarBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.20)',
    marginBottom: 18,
  },
  sidebarBadgeText: {
    color: '#FFCC8F',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sidebarTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  sidebarSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
  },
  sidebarNav: {
    gap: 10,
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.medium,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sidebarButtonActive: {
    backgroundColor: '#F58A15',
    borderColor: '#F58A15',
  },
  sidebarButtonText: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '800',
  },
  sidebarButtonTextActive: {
    color: '#17100A',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFE0BE',
    borderRadius: radius.medium,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  signOutButtonText: {
    color: '#2F1703',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#080809',
  },
  contentContainer: {
    padding: 28,
    gap: 24,
  },
  heroCard: {
    backgroundColor: '#121315',
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
  },
  heroCopyWrap: {
    flex: 1,
    minWidth: 260,
  },
  heroEyebrow: {
    color: '#FFB866',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  heroCopy: {
    color: '#A3A3A3',
    fontSize: 15,
    lineHeight: 25,
    maxWidth: 760,
  },
  heroInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#161719',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroInfoPillText: {
    color: '#FFE4C1',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: 190,
    backgroundColor: '#111214',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 18,
  },
  metricCardAccent: {
    backgroundColor: '#F58A15',
    borderColor: '#F58A15',
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#19191C',
  },
  metricIconWrapAccent: {
    backgroundColor: 'rgba(23, 16, 10, 0.15)',
  },
  metricLabel: {
    color: '#B7B7BC',
    fontSize: 13,
    fontWeight: '700',
  },
  metricLabelAccent: {
    color: '#2D1805',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 6,
  },
  metricValueAccent: {
    color: '#140B02',
  },
  metricHelper: {
    color: '#7D7D84',
    fontSize: 12,
    lineHeight: 18,
  },
  metricHelperAccent: {
    color: '#3B2007',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  sectionHeaderContent: {
    flex: 1,
    minWidth: 260,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#A3A3A3',
    fontSize: 14,
    lineHeight: 22,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#231509',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.22)',
    borderRadius: radius.medium,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#FFB866',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#111214',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 24,
  },
  emptyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18191C',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyCopy: {
    color: '#A3A3A3',
    fontSize: 14,
    lineHeight: 22,
  },
  tableCard: {
    backgroundColor: '#111214',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#17181A',
  },
  headerCell: {
    flex: 1,
    color: '#FFB866',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerCellWide: {
    flex: 1.6,
  },
  headerCellAction: {
    flex: 1.35,
  },
  tableRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  bodyCell: {
    flex: 1,
    justifyContent: 'center',
  },
  bodyCellWide: {
    flex: 1.6,
  },
  actionCell: {
    flex: 1.35,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryCellText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  secondaryCellText: {
    color: '#8F8F95',
    fontSize: 13,
  },
  bodyCellText: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryActionButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#F58A15',
  },
  warningButton: {
    backgroundColor: '#5C340B',
  },
  successButton: {
    backgroundColor: '#0F5132',
  },
  dangerButton: {
    backgroundColor: '#7F1D1D',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  statusSuccess: {
    backgroundColor: '#0F5132',
  },
  statusInfo: {
    backgroundColor: '#1D4ED8',
  },
  statusWarning: {
    backgroundColor: '#92400E',
  },
  statusDanger: {
    backgroundColor: '#7F1D1D',
  },
  statusNeutral: {
    backgroundColor: '#3F3F46',
  },
  cardList: {
    gap: 14,
  },
  requestCard: {
    backgroundColor: '#111214',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  requestHeaderCopy: {
    flex: 1,
  },
  requestTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  requestMeta: {
    color: '#FFB866',
    fontSize: 14,
    fontWeight: '700',
  },
  requestDetail: {
    color: '#B8B8BD',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  alertCard: {
    backgroundColor: '#111214',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
  },
  alertTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
    marginRight: 12,
  },
  alertTag: {
    backgroundColor: '#261508',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertTagText: {
    color: '#FFB866',
    fontSize: 12,
    fontWeight: '800',
  },
  alertDetail: {
    color: '#A3A3A3',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
});
