import { StyleSheet } from 'react-native'

import { colors, radius } from '../theme'

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 32,
  },
  page: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingTop: 18,
    paddingBottom: 24,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backLinkText: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 22,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginBottom: 18,
  },
  toastBanner: {
    marginHorizontal: 24,
    marginBottom: 14,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastBannerError: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  toastBannerSuccess: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  toastText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  toastTextSuccess: {
    color: colors.success,
  },
  messageCard: {
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 28,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  messageTitle: {
    color: colors.labelText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  messageStrong: {
    color: colors.text,
    fontWeight: '800',
  },
  emailText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 6,
  },
  messageSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  codeLabel: {
    color: colors.labelText,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 24,
  },
  resendHint: {
    color: colors.mutedText,
    fontSize: 15,
  },
  resendCountdown: {
    color: colors.labelText,
    fontSize: 15,
    fontWeight: '700',
  },
  resendAction: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
})

export default styles
