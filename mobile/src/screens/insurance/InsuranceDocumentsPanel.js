import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { InsurancePanelShell, InsuranceSectionDivider } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

function ChecklistGroup({ title, items }) {
  return (
    <View style={styles.checklistGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.type} style={styles.checklistRow}>
          <MaterialCommunityIcons
            name={item.complete ? 'check-circle-outline' : 'minus-circle-outline'}
            size={18}
            color={item.complete ? colors.primary : colors.labelText}
          />
          <Text style={[styles.checklistLabel, item.complete && styles.checklistLabelComplete]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function UploadNotice({ uploadState, uploadMessage, isUploadingDocument }) {
  if (!uploadMessage) {
    return null
  }

  const isUploaded = uploadState === 'document_uploaded'

  return (
    <View style={styles.noticeRow}>
      {isUploadingDocument || uploadState === 'document_uploading' ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <MaterialCommunityIcons
          name={isUploaded ? 'file-check-outline' : 'information-outline'}
          size={18}
          color={colors.primary}
        />
      )}
      <Text style={styles.noticeText}>{uploadMessage}</Text>
    </View>
  )
}

export default function InsuranceDocumentsPanel({
  checklist,
  latestInquiry,
  isRefreshing,
  onRefresh,
  onPickDocument,
  isUploadingDocument,
  documentDraft,
  documentTypeOptions = [],
  onChangeDocumentDraft,
  onClearPickedDocument,
  onUploadDocument,
  uploadMessage,
  uploadState,
  canAcceptDocuments = false,
}) {
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <InsurancePanelShell eyebrow="Documents" title="Documents">
          <InsuranceSectionDivider title="Checklist" leading>
            <ChecklistGroup title="Required" items={checklist.required} />
            <ChecklistGroup title="Optional" items={checklist.optional} />
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Already on file">
            {latestInquiry?.documents?.length ? (
              <View style={styles.fileList}>
                {latestInquiry.documents.map((document, index) => (
                  <View
                    key={document.id ?? `${document.fileName}-${document.fileUrl}`}
                    style={[styles.fileRow, index > 0 && styles.fileRowBordered]}
                  >
                    <View style={styles.fileCopy}>
                      <Text style={styles.fileTitle}>{document.fileName}</Text>
                      <Text style={styles.fileMeta}>
                        {[document.documentTypeLabel, document.createdAt].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="file-document-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No files on this request yet.</Text>
            )}
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Upload target">
            <View style={styles.targetRow}>
              {documentTypeOptions.map((option) => {
                const isSelected = documentDraft.documentType === option.value

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.targetChip, isSelected && styles.targetChipSelected]}
                    onPress={() => onChangeDocumentDraft?.({ documentType: option.value })}
                    activeOpacity={0.88}
                    disabled={!canAcceptDocuments || isUploadingDocument}
                  >
                    <Text style={[styles.targetChipText, isSelected && styles.targetChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Selected file">
            {documentDraft.fileName ? (
              <View style={styles.selectedFileRow}>
                <MaterialCommunityIcons
                  name={documentDraft.mimeType?.startsWith('image/') ? 'file-image-outline' : 'file-pdf-box'}
                  size={20}
                  color={colors.primary}
                />
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>{documentDraft.fileName}</Text>
                  <Text style={styles.fileMeta}>
                    {[documentDraft.mimeType, documentDraft.fileSizeLabel].filter(Boolean).join(' | ')}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>No file selected.</Text>
            )}

            <View style={styles.fileActionRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled]}
                onPress={onPickDocument}
                disabled={!canAcceptDocuments || isUploadingDocument}
                activeOpacity={0.88}
              >
                <Text style={styles.secondaryButtonText}>
                  {documentDraft.fileName ? 'Replace file' : 'Select file'}
                </Text>
              </TouchableOpacity>
              {documentDraft.fileName ? (
                <TouchableOpacity
                  style={[styles.secondaryButton, (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled]}
                  onPress={onClearPickedDocument}
                  disabled={!canAcceptDocuments || isUploadingDocument}
                  activeOpacity={0.88}
                >
                  <Text style={styles.secondaryButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Note">
            <TextInput
              value={documentDraft.notes}
              onChangeText={(value) => onChangeDocumentDraft?.({ notes: value })}
              placeholder="Optional note"
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={canAcceptDocuments && !isUploadingDocument}
            />
          </InsuranceSectionDivider>

          <UploadNotice
            uploadState={uploadState}
            uploadMessage={uploadMessage}
            isUploadingDocument={isUploadingDocument}
          />
        </InsurancePanelShell>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadButton, (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled]}
          onPress={onUploadDocument}
          disabled={!canAcceptDocuments || isUploadingDocument}
          activeOpacity={0.88}
        >
          {isUploadingDocument ? <ActivityIndicator color={colors.onPrimary} size="small" /> : null}
          <Text style={styles.uploadButtonText}>Upload file</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: 18,
    paddingBottom: 120,
  },
  checklistGroup: {
    gap: 10,
  },
  groupTitle: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistLabel: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  checklistLabelComplete: {
    color: colors.primary,
    fontWeight: '700',
  },
  fileList: {
    gap: 0,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  fileRowBordered: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  fileCopy: {
    flex: 1,
    gap: 4,
  },
  fileTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  fileMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  targetChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  targetChipTextSelected: {
    color: colors.primary,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 88,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 2,
  },
  noticeText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: 14,
  },
  uploadButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
