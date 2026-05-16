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
import { useEffect, useMemo, useState } from 'react'
import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsurancePanelShell,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

function ChecklistItemRow({ item, onToggle }) {
  return (
    <TouchableOpacity style={styles.checklistRow} onPress={() => onToggle(item.type)} activeOpacity={0.86}>
      <MaterialCommunityIcons
        name={item.complete ? 'check-circle' : 'minus-circle-outline'}
        size={18}
        color={item.complete ? insurancePalette.amber : insurancePalette.textDim}
      />
      <Text style={[styles.checklistLabel, item.complete && styles.checklistLabelComplete]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  )
}

function ChecklistGroup({ title, items, onToggle }) {
  return (
    <View style={styles.checklistGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.map((item) => (
        <ChecklistItemRow key={item.type} item={item} onToggle={onToggle} />
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

const mergeChecklistItems = (items, toggledState) =>
  items.map((item) => ({
    ...item,
    complete: typeof toggledState[item.type] === 'boolean' ? toggledState[item.type] : item.complete,
  }))

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
}) {
  const [toggledChecklist, setToggledChecklist] = useState({})

  useEffect(() => {
    setToggledChecklist({})
  }, [latestInquiry?.id, purposeLabel])

  const toggleChecklistItem = (itemType) => {
    setToggledChecklist((current) => ({
      ...current,
      [itemType]: !(current[itemType] ?? getItemCompletion(itemType, checklist)),
    }))
  }

  const checklistGroups = useMemo(
    () => ({
      required: mergeChecklistItems(checklist.required, toggledChecklist),
      supporting: mergeChecklistItems(checklist.supporting ?? [], toggledChecklist),
      optional: mergeChecklistItems(checklist.optional ?? [], toggledChecklist),
    }),
    [checklist, toggledChecklist],
  )

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
            tintColor={insurancePalette.amber}
          />
        }
      >
        <InsurancePanelShell eyebrow="Documents" title="Documents">
          <InsuranceSectionDivider
            title="Checklist"
            helper={`${purposeLabel || 'Insurance'} files stay tied to this vehicle request.`}
            leading
          >
            <ChecklistGroup
              title="Required now"
              items={checklistGroups.required}
              onToggle={toggleChecklistItem}
            />
            {checklistGroups.supporting.length ? (
              <ChecklistGroup
                title="Helpful next"
                items={checklistGroups.supporting}
                onToggle={toggleChecklistItem}
              />
            ) : null}
            {checklistGroups.optional.length ? (
              <ChecklistGroup
                title="Optional later"
                items={checklistGroups.optional}
                onToggle={toggleChecklistItem}
              />
            ) : null}
          </InsuranceSectionDivider>

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
            <View style={styles.fileCard}>
              {latestInquiry?.documents?.length ? (
                latestInquiry.documents.map((document, index) => (
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
                      color={insurancePalette.amber}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No files on this request yet.</Text>
              )}
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Upload target">
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
                    <Text style={[styles.targetChipText, isSelected && styles.targetChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Selected file">
            <View style={styles.selectedFileCard}>
              {documentDraft.fileName ? (
                <View style={styles.selectedFileRow}>
                  <MaterialCommunityIcons
                    name={documentDraft.mimeType?.startsWith('image/') ? 'file-image-outline' : 'file-pdf-box'}
                    size={20}
                    color={insurancePalette.amber}
                  />
                  <View style={styles.fileCopy}>
                    <Text style={styles.fileTitle}>{documentDraft.fileName}</Text>
                    <Text style={styles.fileMeta}>
                      {[documentDraft.mimeType, documentDraft.fileSizeLabel].filter(Boolean).join(' • ')}
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
                  <Text style={styles.secondaryButtonText}>Select file</Text>
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
            </View>
          </InsuranceSectionDivider>

          <InsuranceSectionDivider title="Note">
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
          </InsuranceSectionDivider>

          <UploadNotice
            uploadState={uploadState}
            uploadMessage={uploadMessage}
            isUploadingDocument={isUploadingDocument}
          />
        </InsurancePanelShell>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 14) }]}>
        <TouchableOpacity
          style={[styles.uploadButton, (!canAcceptDocuments || isUploadingDocument) && styles.buttonDisabled]}
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

function getItemCompletion(itemType, checklist) {
  const allItems = [
    ...(checklist.required ?? []),
    ...(checklist.supporting ?? []),
    ...(checklist.optional ?? []),
  ]
  return allItems.find((item) => item.type === itemType)?.complete ?? false
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
  notesCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: insurancePalette.border,
    backgroundColor: insurancePalette.card,
    padding: 16,
    gap: 8,
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
