import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { radius } from '../../theme'
import { insuranceFonts, insurancePalette } from './InsurancePanelPrimitives'

export function InsuranceUploadNotice({
  uploadState,
  uploadMessage,
  isUploadingDocument,
}) {
  if (!uploadMessage) {
    return null
  }

  const isUploaded = uploadState === 'document_uploaded'

  return (
    <View style={styles.noticeRow} accessibilityLiveRegion="polite">
      {isUploadingDocument || uploadState === 'document_uploading' ? (
        <ActivityIndicator color={insurancePalette.amber} size="small" />
      ) : (
        <MaterialCommunityIcons
          name={isUploaded ? 'file-check-outline' : 'information-outline'}
          size={18}
          color={insurancePalette.amber}
        />
      )}
      <Text style={styles.noticeText}>{uploadMessage}</Text>
    </View>
  )
}

export function InsurancePendingUploadRow({
  item,
  onUse,
  onDiscard,
  disabled = false,
}) {
  return (
    <View style={styles.pendingRow}>
      <View style={styles.fileCopy}>
        <Text style={styles.fileTitle}>{item.fileName}</Text>
        <Text style={styles.fileMeta}>
          {[item.documentTypeLabel, item.fileSizeLabel].filter(Boolean).join(' | ')}
        </Text>
        {item.requiresFileReselection ? (
          <Text style={styles.fileMeta}>
            Select this file again. File access is not retained after the app restarts.
          </Text>
        ) : null}
      </View>
      <View style={styles.fileActionRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
          onPress={() => onUse(item.documentType)}
          disabled={disabled}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={
            item.requiresFileReselection
              ? `Select ${item.fileName} again`
              : `Prepare ${item.fileName} for upload`
          }
          accessibilityState={{ disabled }}
        >
          <Text style={styles.secondaryButtonText}>
            {item.requiresFileReselection ? 'Select file again' : 'Prepare upload'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
          onPress={() => onDiscard(item.documentType)}
          disabled={disabled}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`Discard pending ${item.fileName}`}
          accessibilityState={{ disabled }}
        >
          <Text style={styles.secondaryButtonText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.46,
  },
  fileActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fileCopy: {
    flex: 1,
    gap: 4,
    minWidth: 180,
  },
  fileMeta: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  fileTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeRow: {
    alignItems: 'center',
    backgroundColor: insurancePalette.amberSoft,
    borderColor: insurancePalette.amberBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  noticeText: {
    color: insurancePalette.text,
    flex: 1,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  pendingRow: {
    flex: 1,
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: insurancePalette.cardSoft,
    borderColor: insurancePalette.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    fontWeight: '700',
  },
})
