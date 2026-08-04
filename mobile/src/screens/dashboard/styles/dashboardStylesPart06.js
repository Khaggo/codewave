import { StyleSheet } from 'react-native';

import { colors } from '../../../theme';
import { createPlatformShadow } from '../../../utils/platformShadow';

export default StyleSheet.create({
  trackingProgressCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  trackingStepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  trackingRail: {
    width: 44,
    alignItems: 'center',
  },
  trackingStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A324B',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  trackingStepDotDone: {
    borderColor: '#12D764',
    backgroundColor: '#12D764',
  },
  trackingStepDotCurrent: {
    borderColor: '#347FFF',
    backgroundColor: '#347FFF',
    ...createPlatformShadow({
      color: '#347FFF',
      height: 8,
      opacity: 0.22,
      radius: 16,
      elevation: 4,
    }),
  },
  trackingStepDotCurrentCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text,
  },
  trackingStepDotIdle: {
    borderColor: '#2F354A',
    backgroundColor: '#131826',
  },
  trackingStepLine: {
    width: 2,
    flex: 1,
    minHeight: 54,
    backgroundColor: '#2A324B',
    marginTop: 2,
  },
  trackingStepLineActive: {
    backgroundColor: colors.primary,
  },
  trackingStepLineIdle: {
    backgroundColor: '#252C3E',
  },
  trackingStepContent: {
    flex: 1,
    paddingBottom: 18,
  },
  trackingStepTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 4,
  },
  trackingStepTitleCurrent: {
    color: '#F6F9FF',
  },
  trackingStepTitleInactive: {
    color: '#6E7594',
  },
  trackingStepStatus: {
    color: colors.mutedText,
    fontSize: 14,
    marginBottom: 8,
  },
  trackingStepStatusInactive: {
    color: '#676E8B',
  },
  trackingStepNoteCard: {
    backgroundColor: 'rgba(52, 127, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 127, 255, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  trackingStepNoteCardInactive: {
    backgroundColor: '#181D2C',
    borderColor: colors.borderSoft,
  },
  trackingStepNoteText: {
    color: '#9BC1FF',
    fontSize: 14,
    lineHeight: 21,
  },
  trackingStepNoteTextInactive: {
    color: '#78809D',
  },
  trackingRecommendationCard: {
    backgroundColor: 'rgba(98, 70, 10, 0.3)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 210, 74, 0.18)',
    padding: 16,
    marginBottom: 12,
  },
  trackingRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trackingRecommendationTitle: {
    color: '#FFD24A',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  trackingRecommendationText: {
    color: '#D0C49E',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  trackingRecommendationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingApproveButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  trackingApproveButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  trackingDeclineButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingDeclineButtonText: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
  },
  bookingStatusHistoryCard: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 18,
  },
  bookingStatusHistoryRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 12,
    marginTop: 12,
  },
  bookingStatusHistoryTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  bookingStatusHistoryMeta: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
});
