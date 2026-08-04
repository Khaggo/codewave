export function getNotificationPanelView(notifications = []) {
  const safeNotifications = Array.isArray(notifications) ? notifications : []
  return {
    items: safeNotifications,
    unreadCount: safeNotifications.filter((item) => item?.unread).length,
    isEmpty: safeNotifications.length === 0,
  }
}
