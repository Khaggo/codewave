import { StyleSheet } from 'react-native';

import { colors, radius } from '../theme';
import { createPlatformShadow } from '../utils/platformShadow';

export default StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputFocused: {
    borderColor: colors.primary,
    ...createPlatformShadow({
      color: colors.primary,
      opacity: 0.22,
      radius: 12,
      elevation: 2,
    }),
  },
  inputReadonly: {
    backgroundColor: colors.readonly,
  },
  inputError: {
    borderColor: colors.danger,
  },
  valueText: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
    minWidth: 0,
  },
  placeholderText: {
    color: colors.mutedText,
  },
  trailingText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  trailingTextReadonly: {
    color: colors.mutedText,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  helperText: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  overlayCompact: {
    paddingHorizontal: 14,
  },
  modalCard: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    width: '100%',
    maxWidth: 430,
    padding: 20,
    maxHeight: '82%',
  },
  modalCardCompact: {
    padding: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepRowCompact: {
    flexWrap: 'wrap',
  },
  stepChip: {
    flex: 1,
    minWidth: 82,
    minHeight: 44,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceMuted,
  },
  stepChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  stepChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  stepChipTextActive: {
    color: colors.primary,
  },
  selectionPanel: {
    minHeight: 280,
    maxHeight: 360,
    marginBottom: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 46,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: colors.background,
  },
  optionButtonRegular: {
    flexBasis: '30%',
    minWidth: 82,
  },
  optionButtonCompact: {
    flexBasis: '46%',
    minWidth: 0,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextActive: {
    color: colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    marginBottom: 6,
  },
  dayCellEmpty: {
    opacity: 0,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: colors.border,
  },
  dayTextSelected: {
    color: colors.onPrimary,
    fontWeight: '800',
  },
  closeButton: {
    minHeight: 48,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
