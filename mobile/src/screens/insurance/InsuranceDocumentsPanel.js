import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import {
  InsurancePanelShell,
  InsuranceSectionDivider,
  InsuranceSummaryStrip,
} from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

function ChecklistGroup({ title, items }) {
  return (
    <View style={styles.checklistGroup}>
      <Text style={styles.checklistTitle}>{title}</Text>
      <View style={styles.checklistList}>
        {items.map((item) => (
          <View key={item.type} style={styles.checklistRow}>
            <View style={[styles.checklistIconWrap, item.complete && styles.checklistIconWrapComplete]}>
              <MaterialCommunityIcons
                name={item.complete ? 'check' : 'minus'}
                size={16}
                color={item.complete ? colors.primary : colors.labelText}
              />
            </View>
            <Text style={[styles.checklistLabel, item.complete && styles.checklistLabelComplete]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function UploadNotice({ uploadState, uploadMessage, isUploadingDocument }) {
  if (!uploadMessage) {
    return null
  }

  const isUploaded = uploadState === 'document_uploaded'

  return (
    <View style={[styles.noticeCard, isUploaded && styles.noticeCardSuccess]}>
      <View style={styles.noticeIconWrap}>
        {isUploadingDocument || uploadState === 'document_uploading' ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <MaterialCommunityIcons
            name={isUploaded ? 'file-check-outline' : 'information-outline'}
            size={18}
            color={colors.primary}
          />
        )}
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>
          {isUploaded ? 'Document uploaded' : 'Document workspace update'}
        </Text>
        <Text style={styles.noticeText}>{uploadMessage}</Text>
      </View>
    </View>
  )
}

export default function InsuranceDocumentsPanel({
  checklist,
  latestInquiry,
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
  const missingRequiredDocuments = checklist.required.filter((item) => !item.complete)
  const currentRequestSummary = latestInquiry?.id
    ? missingRequiredDocuments.length
      ? `Still missing: ${missingRequiredDocuments.map((item) => item.label).join(', ')}.`
      : 'All required documents are currently marked as uploaded.'
    : 'Submit a request first, then come back here to attach files.'

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <InsurancePanelShell
          eyebrow="Documents"
          title="Manage supporting files"
          subtitle="Work through the checklist, attach the next file, and keep the current request tidy."
        >
          <InsuranceSummaryStrip
            label="Current request"
            value={latestInquiry?.subject || 'No request submitted yet'}
            helper={currentRequestSummary}
          />

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Checklist"
              helper="Keep the required files moving first, then add any optional support documents."
            >
              <ChecklistGroup title="Required" items={checklist.required} />
              <ChecklistGroup title="Optional" items={checklist.optional} />
            </InsuranceSectionDivider>
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Already on file"
              helper="Review the files already attached to this request before adding another upload."
            >
              {latestInquiry?.documents?.length ? (
                <View style={styles.attachedFileList}>
                  {latestInquiry.documents.map((document) => (
                    <View key={document.id ?? `${document.fileName}-${document.fileUrl}`} style={styles.attachedFileRow}>
                      <View style={styles.attachedFileCopy}>
                        <Text style={styles.attachedFileTitle}>{document.fileName}</Text>
                        <Text style={styles.attachedFileMeta}>
                          {[document.documentTypeLabel, document.createdAt].filter(Boolean).join(' • ')}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Nothing attached yet</Text>
                  <Text style={styles.emptyText}>Uploaded request files will appear here once they are on file.</Text>
                </View>
              )}
            </InsuranceSectionDivider>
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Upload target"
              helper="Choose which document type this file should satisfy before you pick or replace it."
            >
              <View style={styles.uploadTargetRow}>
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
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Selected file"
              helper="Pick a PDF or image from your device, then review the upload target before sending it."
            >
              {documentDraft.fileName ? (
                <View style={styles.selectedFileCard}>
                  <View style={styles.selectedFileHeader}>
                    <View style={styles.selectedFileIconWrap}>
                      <MaterialCommunityIcons
                        name={documentDraft.mimeType?.startsWith('image/') ? 'file-image-outline' : 'file-pdf-box'}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.selectedFileCopy}>
                      <Text style={styles.selectedFileTitle}>{documentDraft.fileName}</Text>
                      <Text style={styles.selectedFileMeta}>
                        {[documentDraft.mimeType, documentDraft.fileSizeLabel].filter(Boolean).join(' | ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fileActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={onPickDocument}
                      activeOpacity={0.88}
                      disabled={!canAcceptDocuments || isUploadingDocument}
                    >
                      <Text style={styles.secondaryButtonText}>Replace file</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={onClearPickedDocument}
                      activeOpacity={0.88}
                      disabled={!canAcceptDocuments || isUploadingDocument}
                    >
                      <Text style={styles.secondaryButtonText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No file selected</Text>
                  <Text style={styles.emptyText}>Pick a PDF or image from your device when you are ready.</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.pickButton, (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled]}
                onPress={onPickDocument}
                disabled={!canAcceptDocuments || isUploadingDocument}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons name="file-search-outline" size={18} color={colors.primary} />
                <Text style={styles.pickButtonText}>
                  {documentDraft.fileName ? 'Select another document' : 'Select document'}
                </Text>
              </TouchableOpacity>
            </InsuranceSectionDivider>
          </View>

          <View style={styles.sectionDivider}>
            <InsuranceSectionDivider
              title="Note for staff"
              helper="Add short context only when it helps someone reviewing the upload."
            >
              <TextInput
                value={documentDraft.notes}
                onChangeText={(value) => onChangeDocumentDraft?.({ notes: value })}
                placeholder="Optional note for staff review"
                placeholderTextColor={colors.mutedText}
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={canAcceptDocuments && !isUploadingDocument}
              />
            </InsuranceSectionDivider>
          </View>

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
    paddingBottom: 140,
  },
  sectionDivider: {
    gap: 12,
  },
  checklistGroup: {
    gap: 10,
  },
  checklistTitle: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklistList: {
    gap: 10,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checklistIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistIconWrapComplete: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
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
  attachedFileList: {
    gap: 10,
  },
  attachedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachedFileCopy: {
    flex: 1,
    gap: 4,
  },
  attachedFileTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  attachedFileMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  uploadTargetRow: {
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
  selectedFileCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: 14,
    gap: 14,
  },
  selectedFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedFileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFileCopy: {
    flex: 1,
    gap: 4,
  },
  selectedFileTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedFileMeta: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
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
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  pickButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
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
  noticeCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  noticeCardSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  noticeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
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
    opacity: 0.78,
  },
})
