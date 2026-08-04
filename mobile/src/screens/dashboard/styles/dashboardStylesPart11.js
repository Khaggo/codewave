import { Platform, StyleSheet } from 'react-native';

import { colors } from '../../../theme';
import { BOTTOM_NAV_HEIGHT } from '../dashboardNavigationModel.mjs';

export default StyleSheet.create({
  notificationRowMessage: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  notificationRowTime: {
    color: '#6E7594',
    fontSize: 12,
  },
  notificationDismissButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  notificationsEmptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  notificationsEmptyText: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
    paddingTop: 9,
    paddingBottom: 12,
    minHeight: BOTTOM_NAV_HEIGHT,
    zIndex: 1000,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  bottomNavCompact: {
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabButtonContainer: {
    flex: 1,
    minWidth: 0,
  },
});
