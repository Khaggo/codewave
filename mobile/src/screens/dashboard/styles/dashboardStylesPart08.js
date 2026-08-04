import { StyleSheet } from 'react-native';

import { colors, radius } from '../../../theme';
import { createPlatformShadow } from '../../../utils/platformShadow';

export default StyleSheet.create({
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#5B4700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: colors.onPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileSubline: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  loyaltyBadge: {
    marginLeft: 12,
    paddingHorizontal: 14,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#6A5300',
    backgroundColor: 'rgba(255, 199, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyBadgeText: {
    color: '#FFCC33',
    fontSize: 13,
    fontWeight: '800',
  },
  loyaltyCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: '#5A4608',
    padding: 18,
    marginBottom: 18,
    ...createPlatformShadow({
      color: colors.shadow,
      height: 14,
      opacity: 0.18,
      radius: 24,
      elevation: 4,
    }),
  },
  loyaltyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  loyaltyCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loyaltyCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  loyaltyPointsWrap: {
    alignItems: 'flex-end',
  },
  loyaltyPointsValue: {
    color: '#FFCC33',
    fontSize: 16,
    fontWeight: '800',
  },
  loyaltyPointsLabel: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  loyaltyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentTierText: {
    color: '#FFCC33',
    fontSize: 14,
    fontWeight: '800',
  },
  nextTierText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  loyaltyTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#2B3043',
    overflow: 'hidden',
    marginBottom: 16,
  },
  loyaltyFill: {
    width: '74%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  loyaltyTierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loyaltyTierItem: {
    alignItems: 'center',
    flex: 1,
  },
  loyaltyTierIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  loyaltyTierIconWrapReached: {
    borderColor: '#6A5300',
  },
  loyaltyTierIconWrapCurrent: {
    backgroundColor: 'rgba(255, 199, 0, 0.12)',
    borderColor: '#6A5300',
  },
  loyaltyTierLabel: {
    color: colors.mutedText,
    fontSize: 12,
  },
  loyaltyTierLabelReached: {
    color: colors.text,
  },
  loyaltyTierLabelCurrent: {
    color: '#FFCC33',
    fontWeight: '800',
  },
  loyaltyActivityCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  loyaltyActivityTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  loyaltyActivitySubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  loyaltyTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  loyaltyTransactionCopy: {
    flex: 1,
    paddingRight: 14,
  },
  loyaltyTransactionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  loyaltyTransactionMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  loyaltyTransactionAmountWrap: {
    alignItems: 'flex-end',
  },
  loyaltyTransactionAmount: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  loyaltyTransactionAmountPositive: {
    color: '#24E37A',
  },
  loyaltyTransactionAmountNegative: {
    color: '#FF8B8B',
  },
  loyaltyTransactionBalance: {
    color: colors.mutedText,
    fontSize: 12,
  },
  preferenceCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  preferenceCopy: {
    flex: 1,
    paddingRight: 14,
  },
  preferenceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  preferenceDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  preferenceSwitchTarget: {
    width: 52,
    minWidth: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceSwitchTargetDisabled: {
    opacity: 0.55,
  },
  preferenceSwitchTrack: {
    width: 40,
    height: 24,
    padding: 3,
    borderRadius: 12,
    backgroundColor: '#2D334A',
  },
  preferenceSwitchTrackActive: {
    backgroundColor: colors.primary,
  },
  preferenceSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E6E9F5',
  },
  preferenceSwitchThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF5EB',
  },
  sectionTabsWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  sectionTabsWrapCompact: {},
  sectionTabContainer: {
    flex: 1,
  },
  sectionTab: {
    minHeight: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionTabText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionTabTextActive: {
    color: colors.onPrimary,
  },
});
