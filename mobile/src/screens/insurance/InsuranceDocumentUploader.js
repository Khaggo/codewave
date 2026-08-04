import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'
import {
  InsurancePendingUploadRow,
  InsuranceUploadNotice,
} from './InsuranceUploadRecoveryParts'

export function InsuranceDocumentUploadContent({
  canAcceptDocuments,
  documentDraft,
  documentTypeOptions,
  isUploadingDocument,
  onChangeDocumentDraft,
  onClearPickedDocument,
  onDiscardPendingUpload,
  onPickDocument,
  onUsePendingUpload,
  pendingUploadRows,
  uploadMessage,
  uploadState,
}) {
  const controlsDisabled = !canAcceptDocuments || isUploadingDocument

  return (
    <>
      <InsuranceSectionDivider
        title="Upload target"
        helper="Add or replace a file for this insurance request."
      >
        <View style={styles.selectedFileCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.targetScrollContent}
          >
            {documentTypeOptions.map((option) => {
              const isSelected = documentDraft.documentType === option.value

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.targetChip,
                    isSelected && styles.targetChipSelected,
                  ]}
                  onPress={() =>
                    onChangeDocumentDraft?.({ documentType: option.value })
                  }
                  activeOpacity={0.88}
                  disabled={controlsDisabled}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{
                    checked: isSelected,
                    disabled: controlsDisabled,
                  }}
                >
                  <Text
                    style={[
                      styles.targetChipText,
                      isSelected && styles.targetChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {documentDraft.fileName ? (
            <View style={styles.selectedFileCardInner}>
              <Text style={styles.groupTitle}>Selected file</Text>
              <View style={styles.selectedFileRow}>
                <MaterialCommunityIcons
                  name={
                    documentDraft.mimeType?.startsWith('image/')
                      ? 'file-image-outline'
                      : 'file-pdf-box'
                  }
                  size={20}
                  color={insurancePalette.amber}
                />
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle} numberOfLines={2}>
                    {documentDraft.fileName}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {[documentDraft.mimeType, documentDraft.fileSizeLabel]
                      .filter(Boolean)
                      .join(' | ')}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No file selected. Choose a file first, then upload it to this
              insurance request.
            </Text>
          )}

          <View style={styles.fileActionRow}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                controlsDisabled && styles.buttonDisabled,
              ]}
              onPress={onPickDocument}
              disabled={controlsDisabled}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Select insurance document file"
              accessibilityState={{ disabled: controlsDisabled }}
            >
              <Text style={styles.secondaryButtonText}>Select file</Text>
            </TouchableOpacity>
            {documentDraft.fileName ? (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  controlsDisabled && styles.buttonDisabled,
                ]}
                onPress={onClearPickedDocument}
                disabled={controlsDisabled}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={`Clear selected file ${documentDraft.fileName}`}
                accessibilityState={{ disabled: controlsDisabled }}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TextInput
            value={documentDraft.notes}
            onChangeText={(value) => onChangeDocumentDraft?.({ notes: value })}
            placeholder="Optional note for staff review"
            placeholderTextColor={insurancePalette.textDim}
            style={[styles.input, styles.multilineInput]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!controlsDisabled}
            accessibilityLabel="Optional note for staff review"
          />
        </View>
      </InsuranceSectionDivider>

      {pendingUploadRows.length ? (
        <InsuranceSectionDivider title="Pending staged uploads">
          <View style={styles.fileCard}>
            {pendingUploadRows.map((item, index) => (
              <View
                key={`${item.documentType}-${item.fileName}-${index}`}
                style={[styles.fileRow, index > 0 && styles.fileRowBordered]}
              >
                <InsurancePendingUploadRow
                  item={item}
                  onUse={onUsePendingUpload}
                  onDiscard={onDiscardPendingUpload}
                  disabled={controlsDisabled}
                />
              </View>
            ))}
          </View>
        </InsuranceSectionDivider>
      ) : null}

      <InsuranceUploadNotice
        uploadState={uploadState}
        uploadMessage={uploadMessage}
        isUploadingDocument={isUploadingDocument}
      />
    </>
  )
}

export function InsuranceDocumentUploadFooter({
  bottomInset,
  canAcceptDocuments,
  isUploadingDocument,
  onUploadDocument,
}) {
  const controlsDisabled = !canAcceptDocuments || isUploadingDocument

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 14) }]}>
      <TouchableOpacity
        style={[
          styles.uploadButton,
          controlsDisabled && styles.buttonDisabled,
        ]}
        onPress={onUploadDocument}
        disabled={controlsDisabled}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Upload insurance document"
        accessibilityState={{
          busy: isUploadingDocument,
          disabled: controlsDisabled,
        }}
      >
        {isUploadingDocument ? (
          <ActivityIndicator
            color={insurancePalette.onAmber}
            size="small"
          />
        ) : null}
        <Text style={styles.uploadButtonText}>Upload file</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  groupTitle: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  fileCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 2,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  fileRowBordered: {
    borderTopWidth: 1,
    borderTopColor: insurancePalette.divider,
  },
  fileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  fileTitle: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  fileMeta: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  targetScrollContent: {
    gap: 8,
    paddingRight: 12,
  },
  targetChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetChipSelected: {
    borderColor: insurancePalette.amber,
    backgroundColor: insurancePalette.amberSoft,
  },
  targetChipText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    fontWeight: '700',
  },
  targetChipTextSelected: {
    color: insurancePalette.amber,
  },
  selectedFileCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 16,
    gap: 14,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedFileCardInner: {
    gap: 10,
  },
  fileActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: insurancePalette.cardSoft,
  },
  secondaryButtonText: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 88,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: insurancePalette.divider,
    paddingTop: 14,
    backgroundColor: insurancePalette.base,
  },
  uploadButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: insurancePalette.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: insurancePalette.onAmber,
    fontFamily: insuranceFonts.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
