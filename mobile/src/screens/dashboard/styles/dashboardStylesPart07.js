import { StyleSheet } from 'react-native';

import { colors } from '../../../theme';
import { createPlatformShadow } from '../../../utils/platformShadow';

export default StyleSheet.create({
  profileHomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  profileHomeTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  profileHomeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  profileAvatarAnchor: {
    position: 'relative',
    marginLeft: 10,
    zIndex: 12,
  },
  profileHoverCard: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 210,
    backgroundColor: colors.surfaceStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...createPlatformShadow({
      color: colors.shadow,
      height: 12,
      opacity: 0.22,
      radius: 20,
      elevation: 5,
    }),
  },
  profileHoverTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  profileHoverText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  profileHoverButton: {
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHoverButtonText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  profileHero: {
    marginBottom: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
});
