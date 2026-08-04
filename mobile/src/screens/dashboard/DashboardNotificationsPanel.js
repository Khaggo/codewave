import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Animated, FlatList, Text, TouchableOpacity, View } from 'react-native'

import { buildCustomerNotificationPanelSummary } from '../../lib/notificationClient'
import { colors } from '../../theme'
import { NotificationRow } from './DashboardProfileComponents'
import styles from './dashboardStyles'
import { getNotificationPanelView } from './dashboardOverlayPresentationModel.mjs'

export default function DashboardNotificationsPanel({
  visible,
  animation,
  notifications,
  onMarkAllRead,
  onClose,
  onOpen,
  onDismiss,
}) {
  if (!visible) {
    return null
  }

  const panelView = getNotificationPanelView(notifications)
  const summary = buildCustomerNotificationPanelSummary(panelView.items)

  return (
    <Animated.View
      style={[
        styles.notificationsPanel,
        {
          opacity: animation,
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityViewIsModal
    >
      <View style={styles.notificationsPanelHeader}>
        <View>
          <Text style={styles.notificationsPanelTitle}>Notifications</Text>
          <Text style={styles.notificationsPanelSubtitle}>{summary.primaryTitle}</Text>
          <Text style={styles.notificationsPanelHelperText}>{summary.secondaryTitle}</Text>
        </View>

        <View style={styles.notificationsPanelActions}>
          <TouchableOpacity
            style={styles.notificationsHeaderButton}
            onPress={onMarkAllRead}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Mark all loaded notifications as read"
          >
            <MaterialCommunityIcons name="check-all" size={16} color={colors.labelText} />
            <Text style={styles.notificationsHeaderButtonText}>Mark all read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationsPanelClose}
            onPress={onClose}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Close notifications"
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.notificationsSummaryRow}>
        <View style={styles.notificationsSummaryCard}>
          <Text style={styles.notificationsSummaryLabel}>Unread</Text>
          <Text style={styles.notificationsSummaryValue}>{panelView.unreadCount}</Text>
        </View>
        <View style={styles.notificationsSummaryCard}>
          <Text style={styles.notificationsSummaryLabel}>Action needed</Text>
          <Text style={styles.notificationsSummaryValue}>{summary.actionNeededCount}</Text>
        </View>
        <View style={styles.notificationsSummaryCard}>
          <Text style={styles.notificationsSummaryLabel}>Updates</Text>
          <Text style={styles.notificationsSummaryValueMuted}>{summary.informationalCount}</Text>
        </View>
      </View>

      <FlatList
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsListContent}
        data={panelView.items}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onOpen={() => onOpen(item)}
            onDismiss={() => onDismiss(item.key)}
          />
        )}
        ListEmptyComponent={(
          <View style={styles.notificationsEmptyState}>
            <MaterialCommunityIcons name="bell-outline" size={28} color={colors.border} />
            <Text style={styles.notificationsEmptyTitle}>No notifications</Text>
            <Text style={styles.notificationsEmptyText}>
              Booking, insurance, and service updates will appear here.
            </Text>
          </View>
        )}
      />
    </Animated.View>
  )
}
