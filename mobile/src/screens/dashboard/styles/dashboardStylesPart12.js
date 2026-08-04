import { Platform, StyleSheet } from 'react-native';

import { colors, radius } from '../../../theme';
import {
  BOTTOM_NAV_HEIGHT,
  DASHBOARD_WEB_SCROLL_HEIGHT,
} from '../dashboardNavigationModel.mjs';

export default StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginHorizontal: 3,
    minWidth: 0,
    borderRadius: 8,
    zIndex: 1,
  },
  tabButtonCompact: {
    minHeight: 50,
    borderRadius: 8,
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelCompact: {
    fontSize: 11,
    maxWidth: 64,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
