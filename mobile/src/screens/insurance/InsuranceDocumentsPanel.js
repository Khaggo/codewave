import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { InsurancePanelShell } from './InsurancePanelPrimitives'
import { colors, radius } from '../../theme'

function ChecklistGroup({ title, items }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupList}>
        {items.map((item) => (
          <View key={item.type} style={styles.groupRow}>
            <View style={[styles.groupIconWrap, item.complete && styles.groupIconWrapComplete]}>
              <MaterialCommunityIcons
                name={item.complete ? 'check' : 'minus'}
                size={16}
                color={item.complete ? colors.primary : colors.labelText}
              />
            </View>
            <Text style={[styles.groupLabel, item.complete && styles.groupLabelComplete]}>{item.label}</Text>
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
  onBack,
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

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.88}>
        <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
        <Text style={styles.backLinkText}>Back to home</Text>
      </TouchableOpacity>

      <InsurancePanelShell
        eyebrow="Documents"
        title="Manage supporting files"
        subtitle="Review the checklist, confirm what is already on file, then upload the next document you need."
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current request</Text>
          <Text style={styles.summaryTitle}>
            {latestInquiry?.subject || 'No request submitted yet'}
          </Text>
          <Text style={styles.summaryText}>
            {latestInquiry?.id
              ? missingRequiredDocuments.length
                ? `Still missing: ${missingRequiredDocuments.map((item) => item.label).join(', ')}.`
                : 'All required documents are currently marked as uploaded.'
              : 'Submit a request first, then come back here to attach files.'}
          </Text>
        </View>

        <ChecklistGroup title="Required" items={checklist.required} />
        <ChecklistGroup title="Optional" items={checklist.optional} />

        <View style={styles.uploadedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Uploaded files</Text>
            <Text style={styles.sectionMeta}>{latestInquiry?.documentCount ?? 0}</Text>
          </View>

          {latestInquiry?.documents?.length ? (
            <View style={styles.fileList}>
              {latestInquiry.documents.map((document) => (
                <View key={document.id ?? `${document.fileName}-${document.fileUrl}`} style={styles.fileCard}>
                  <View style={styles.fileHeader}>
                    <View style={styles.fileCopy}>
                      <Text style={styles.fileTitle}>{document.fileName}</Text>
                      <Text style={styles.fileText}>{document.documentTypeLabel}</Text>
                    </View>
                    <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
                  </View>
                  {document.notes ? <Text style={styles.fileMeta}>Notes: {document.notes}</Text> : null}
                  {document.createdAt ? <Text style={styles.fileMeta}>Uploaded: {document.createdAt}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No uploaded files yet</Text>
              <Text style={styles.emptyText}>
                The checklist stays visible so you can prepare files before attaching them.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.workspaceCard}>
          <Text style={styles.sectionTitle}>Document actions</Text>
          <Text style={styles.workspaceText}>
            Choose the document type, pick a PDF or image, add an optional note, then upload it to the current request.
          </Text>

          <View style={styles.typeRow}>
            {documentTypeOptions.map((option) => {
              const isSelected = documentDraft.documentType === option.value

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                  onPress={() => onChangeDocumentDraft?.('documentType', option.value)}
                  activeOpacity={0.88}
                  disabled={!canAcceptDocuments || isUploadingDocument}
                >
                  <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {documentDraft.fileName ? (
            <View style={styles.selectedFileCard}>
              <View style={styles.fileHeader}>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>{documentDraft.fileName}</Text>
                  <Text style={styles.fileText}>
                    {[documentDraft.mimeType, documentDraft.fileSizeLabel].filter(Boolean).join(' | ')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={documentDraft.mimeType?.startsWith('image/') ? 'file-image-outline' : 'file-pdf-box'}
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.fileActionRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onPickDocument}
                  activeOpacity={0.88}
                  disabled={!canAcceptDocuments || isUploadingDocument}
                >
                  <Text style={styles.secondaryButtonText}>Replace</Text>
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

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Document notes</Text>
            <TextInput
              value={documentDraft.notes}
              onChangeText={(value) => onChangeDocumentDraft?.('notes', value)}
              placeholder="Optional note for staff review"
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={canAcceptDocuments && !isUploadingDocument}
            />
          </View>

          <UploadNotice
            uploadState={uploadState}
            uploadMessage={uploadMessage}
            isUploadingDocument={isUploadingDocument}
          />

          <TouchableOpacity
            style={[styles.primaryButton, (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled]}
            onPress={onUploadDocument}
            disabled={!canAcceptDocuments || isUploadingDocument}
            activeOpacity={0.9}
          >
            {isUploadingDocument ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="file-upload-outline"
                  size={18}
                  color={colors.onPrimary}
                />
                <Text style={styles.primaryButtonText}>
                  {documentDraft.documentType === 'proof_of_payment' ? 'Upload proof of payment' : 'Upload document'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </InsurancePanelShell>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  backLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 6,
  },
  summaryLabel: {
    color: colors.labelText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  summaryText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  group: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  groupList: { gap: 10 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconWrapComplete: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
  },
  groupLabel: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  groupLabelComplete: {
    color: colors.primary,
    fontWeight: '700',
  },
  uploadedSection: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionMeta: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  fileList: { gap: 12 },
  fileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: 14,
    gap: 6,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  fileCopy: { flex: 1, gap: 4 },
  fileTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  fileText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  fileMeta: {
    color: colors.labelText,
    fontSize: 12,
    lineHeight: 18,
  },
  workspaceCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  workspaceText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  typeChipTextSelected: {
    color: colors.primary,
  },
  selectedFileCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    padding: 14,
    gap: 12,
  },
  fileActionRow: {
    flexDirection: 'row',
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
  fieldBlock: { gap: 8 },
  fieldLabel: {
    color: colors.labelText,
    fontSize: 13,
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
  noticeCopy: { flex: 1, gap: 4 },
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
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.78,
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
})
