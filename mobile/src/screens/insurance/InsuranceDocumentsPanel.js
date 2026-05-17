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
import { useMemo, useState } from 'react'
import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsurancePanelShell,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

function ChecklistSummaryCard({ label, value, helper, emphasis = false }) {
  return (
    <View style={[styles.summaryCard, emphasis && styles.summaryCardEmphasis]}>
      <Text style={styles.summaryCardLabel}>{label}</Text>
      <Text style={[styles.summaryCardValue, emphasis && styles.summaryCardValueEmphasis]}>
        {value}
      </Text>
      <Text style={styles.summaryCardHelper}>{helper}</Text>
    </View>
  )
}

function ChecklistItemRow({ item }) {
  return (
    <View style={styles.checklistRow}>
      <MaterialCommunityIcons
        name={item.complete ? 'check-circle' : 'minus-circle-outline'}
        size={18}
        color={item.complete ? insurancePalette.amber : insurancePalette.textDim}
      />
      <Text style={[styles.checklistLabel, item.complete && styles.checklistLabelComplete]}>
        {item.label}
      </Text>
      <View style={[styles.checklistBadge, item.complete && styles.checklistBadgeComplete]}>
        <Text style={[styles.checklistBadgeText, item.complete && styles.checklistBadgeTextComplete]}>
          {item.complete ? 'On file' : 'Needed'}
        </Text>
      </View>
    </View>
  )
}

function ChecklistGroup({ title, items }) {
  return (
    <View style={styles.checklistGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item) => (
        <ChecklistItemRow key={item.type} item={item} />
      ))}
    </View>
  )
}

function toggleChecklistItem() {
  return null
}

function UploadNotice({ uploadState, uploadMessage, isUploadingDocument }) {
  if (!uploadMessage) {
    return null
  }

  const isUploaded = uploadState === 'document_uploaded'

  return (
    <View style={styles.noticeRow}>
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

function PendingUploadRow({ item, onUse, onDiscard, disabled = false }) {
  return (
    <View style={styles.pendingRow}>
      <View style={styles.fileCopy}>
        <Text style={styles.fileTitle}>{item.fileName}</Text>
        <Text style={styles.fileMeta}>
          {[item.documentTypeLabel, item.fileSizeLabel].filter(Boolean).join(' | ')}
        </Text>
      </View>
      <View style={styles.fileActionRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
          onPress={() => onUse(item.documentType)}
          disabled={disabled}
          activeOpacity={0.88}
        >
          <Text style={styles.secondaryButtonText}>Prepare upload</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
          onPress={() => onDiscard(item.documentType)}
          disabled={disabled}
          activeOpacity={0.88}
        >
          <Text style={styles.secondaryButtonText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function DocumentFileCard({ document }) {
  return (
    <View style={styles.documentCard}>
      <View style={styles.documentCardHeader}>
        <View style={styles.documentIconWrap}>
          <MaterialCommunityIcons
            name={
              document.mimeType?.startsWith('image/')
                ? 'file-image-outline'
                : 'file-document-outline'
            }
            size={18}
            color={insurancePalette.amber}
          />
        </View>
        <View style={styles.fileCopy}>
          <Text style={styles.fileTitle} numberOfLines={2}>
            {document.fileName}
          </Text>
          <Text style={styles.fileMeta}>
            {[document.documentTypeLabel, document.createdAt].filter(Boolean).join(' | ')}
          </Text>
        </View>
      </View>

      <View style={styles.documentCardFooter}>
        {document.documentTypeLabel ? (
          <View style={styles.documentTypeBadge}>
            <Text style={styles.documentTypeBadgeText}>{document.documentTypeLabel}</Text>
          </View>
        ) : null}
        {document.notes ? (
          <Text style={styles.documentNoteText} numberOfLines={2}>
            {document.notes}
          </Text>
        ) : (
          <Text style={styles.documentNotePlaceholder}>No staff note attached.</Text>
        )}
      </View>
    </View>
  )
}

export default function InsuranceDocumentsPanel({
  bottomInset = 0,
  checklist,
  latestInquiry,
  purposeLabel,
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
  pendingUploads = [],
  onUsePendingUpload,
  onDiscardPendingUpload,
}) {
  useState(null)
  const documentTypeLabelLookup = useMemo(
    () => new Map(documentTypeOptions.map((option) => [option.value, option.label])),
    [documentTypeOptions],
  )
  const pendingUploadRows = useMemo(
    () =>
      pendingUploads.map((item) => ({
        ...item,
        documentTypeLabel:
          documentTypeLabelLookup.get(item.documentType) ?? item.documentType,
      })),
    [documentTypeLabelLookup, pendingUploads],
  )

  const checklistGroups = useMemo(
    () => ({
      required: checklist.required ?? [],
      supporting: checklist.supporting ?? [],
      optional: checklist.optional ?? [],
    }),
    [checklist],
  )

  const footerPaddingBottom = Math.max(bottomInset, 14)
  const contentPaddingBottom = footerPaddingBottom + 200
  const requiredCompleteCount = checklistGroups.required.filter((item) => item.complete).length
  const requiredTotalCount = checklistGroups.required.length
  const onFileCount = latestInquiry?.documents?.length ?? 0

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={insurancePalette.amber}
          />
        }
      >
        <InsurancePanelShell eyebrow="Documents" title="Documents">
          <InsuranceSectionDivider
            title="Document status"
            helper={`${purposeLabel || 'Insurance'} files stay tied to this vehicle request.`}
            leading
          >
            <View style={styles.summaryGrid}>
              <ChecklistSummaryCard
                label="Required"
                value={`${requiredCompleteCount}/${requiredTotalCount || 0}`}
                helper={
                  requiredTotalCount
                    ? requiredCompleteCount === requiredTotalCount
                      ? 'Ready for review'
                      : 'Still missing required files'
                    : 'No required upload blockers'
                }
                emphasis={Boolean(requiredTotalCount) && requiredCompleteCount === requiredTotalCount}
              />
              <ChecklistSummaryCard
                label="On file"
                value={String(onFileCount)}
                helper="Already attached to this case"
              />
              <ChecklistSummaryCard
                label="Pending"
                value={String(pendingUploadRows.length)}
                helper="Still staged on this device"
              />
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Required now">
            <View style={styles.notesCard}>
              <ChecklistGroup title="Required now" items={checklistGroups.required} />
            </View>
          </InsuranceSectionDivider>

          {checklistGroups.supporting.length ? (
            <InsuranceSectionDivider title="Helpful next">
              <View style={styles.notesCard}>
                <ChecklistGroup title="Helpful next" items={checklistGroups.supporting} />
              </View>
            </InsuranceSectionDivider>
          ) : null}

          {checklistGroups.optional.length ? (
            <InsuranceSectionDivider title="Optional later">
              <View style={styles.notesCard}>
                <ChecklistGroup title="Optional later" items={checklistGroups.optional} />
              </View>
            </InsuranceSectionDivider>
          ) : null}

          <InsuranceSectionDivider title="Upload notes">
            <View style={styles.notesCard}>
              {checklist.guidance?.map((item) => (
                <Text key={item} style={styles.guidanceText}>
                  {item}
                </Text>
              ))}
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Already on file">
            <View style={styles.documentCollection}>
              {latestInquiry?.documents?.length ? (
                latestInquiry.documents.map((document, index) => (
                  <View
                    key={document.id ?? `${document.fileName}-${document.fileUrl}`}
                    style={index > 0 ? styles.documentCollectionItem : null}
                  >
                    <DocumentFileCard document={document} />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No files on this request yet.</Text>
              )}
            </View>
          </InsuranceSectionDivider>

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
                      style={[styles.targetChip, isSelected && styles.targetChipSelected]}
                      onPress={() => onChangeDocumentDraft?.({ documentType: option.value })}
                      activeOpacity={0.88}
                      disabled={!canAcceptDocuments || isUploadingDocument}
                    >
                      <Text
                        style={[styles.targetChipText, isSelected && styles.targetChipTextSelected]}
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
                        {[documentDraft.mimeType, documentDraft.fileSizeLabel].filter(Boolean).join(' | ')}
                      </Text>
                    </View>
                  </View>
                </View>
                  ) : (
                    <Text style={styles.emptyText}>
                      No file selected. Choose a file first, then upload it to this insurance request.
                    </Text>
                  )}

              <View style={styles.fileActionRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled,
                  ]}
                  onPress={onPickDocument}
                  disabled={!canAcceptDocuments || isUploadingDocument}
                  activeOpacity={0.88}
                >
                  <Text style={styles.secondaryButtonText}>Select file</Text>
                </TouchableOpacity>
                {documentDraft.fileName ? (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled,
                    ]}
                    onPress={onClearPickedDocument}
                    disabled={!canAcceptDocuments || isUploadingDocument}
                    activeOpacity={0.88}
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
                editable={canAcceptDocuments && !isUploadingDocument}
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
                    <PendingUploadRow
                      item={item}
                      onUse={onUsePendingUpload}
                      onDiscard={onDiscardPendingUpload}
                      disabled={!canAcceptDocuments || isUploadingDocument}
                    />
                  </View>
                ))}
              </View>
            </InsuranceSectionDivider>
          ) : null}

          <UploadNotice
            uploadState={uploadState}
            uploadMessage={uploadMessage}
            isUploadingDocument={isUploadingDocument}
          />
        </InsurancePanelShell>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 14) }]}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled,
          ]}
          onPress={onUploadDocument}
          disabled={!canAcceptDocuments || isUploadingDocument}
          activeOpacity={0.88}
        >
          {isUploadingDocument ? <ActivityIndicator color={insurancePalette.onAmber} size="small" /> : null}
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
    paddingBottom: 128,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 14,
    gap: 6,
  },
  summaryCardEmphasis: {
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
  },
  summaryCardLabel: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  summaryCardValue: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  summaryCardValueEmphasis: {
    color: insurancePalette.amber,
  },
  summaryCardHelper: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  checklistGroup: {
    gap: 10,
  },
  groupTitle: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checklistLabel: {
    color: insurancePalette.text,
    fontFamily: insuranceFonts.body,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  checklistLabelComplete: {
    color: insurancePalette.amber,
    fontWeight: '700',
  },
  checklistBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checklistBadgeComplete: {
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
  },
  checklistBadgeText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '700',
  },
  checklistBadgeTextComplete: {
    color: insurancePalette.amber,
  },
  notesCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 16,
    gap: 10,
  },
  guidanceText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
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
  documentCollection: {
    gap: 12,
  },
  documentCollectionItem: {
    marginTop: 0,
  },
  documentCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 14,
    gap: 12,
  },
  documentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  documentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: insurancePalette.amberSoft,
  },
  documentCardFooter: {
    gap: 10,
  },
  documentTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: insurancePalette.amberBorder,
    backgroundColor: insurancePalette.amberSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  documentTypeBadgeText: {
    color: insurancePalette.amber,
    fontFamily: insuranceFonts.body,
    fontSize: 11,
    fontWeight: '700',
  },
  documentNoteText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  documentNotePlaceholder: {
    color: insurancePalette.textDim,
    fontFamily: insuranceFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  pendingRow: {
    flex: 1,
    gap: 12,
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
    minHeight: 40,
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
    minHeight: 40,
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
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.cardSoft,
    padding: 14,
  },
  noticeText: {
    color: insurancePalette.textMuted,
    fontFamily: insuranceFonts.body,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
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

