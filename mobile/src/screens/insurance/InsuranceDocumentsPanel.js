import { useMemo } from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import InsuranceDocumentChecklist from './InsuranceDocumentChecklist'
import InsuranceDocumentHistory from './InsuranceDocumentHistory'
import {
  InsuranceDocumentUploadContent,
  InsuranceDocumentUploadFooter,
} from './InsuranceDocumentUploader'
import { buildInsuranceDocumentsViewModel } from './insuranceDocumentsModel.mjs'
import {
  insurancePalette,
  InsurancePanelShell,
} from './InsurancePanelPrimitives'

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
  onStartRequest,
}) {
  const view = useMemo(
    () =>
      buildInsuranceDocumentsViewModel({
        checklist,
        documentTypeOptions,
        latestInquiry,
        pendingUploads,
      }),
    [checklist, documentTypeOptions, latestInquiry, pendingUploads],
  )
  const contentPaddingBottom = Math.max(bottomInset, 14) + 200

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: contentPaddingBottom },
        ]}
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
          <InsuranceDocumentChecklist
            checklistGroups={view.checklistGroups}
            guidance={view.guidance}
            onFileCount={view.onFileCount}
            pendingCount={view.pendingUploadRows.length}
            purposeLabel={purposeLabel}
            requiredCompleteCount={view.requiredCompleteCount}
            requiredTotalCount={view.requiredTotalCount}
          />
          {!latestInquiry?.id ? (
            <View style={styles.startRequestNotice} accessibilityLiveRegion="polite">
              <Text style={styles.startRequestTitle}>Start the request first</Text>
              <Text style={styles.startRequestText}>
                Submit the request details before attaching files to this vehicle.
              </Text>
              <TouchableOpacity
                style={styles.startRequestButton}
                onPress={onStartRequest}
                accessibilityRole="button"
                accessibilityLabel="Start insurance request"
              >
                <Text style={styles.startRequestButtonText}>Start request</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <InsuranceDocumentHistory documents={view.documents} />
          <InsuranceDocumentUploadContent
            canAcceptDocuments={canAcceptDocuments}
            documentDraft={documentDraft}
            documentTypeOptions={documentTypeOptions}
            isUploadingDocument={isUploadingDocument}
            onChangeDocumentDraft={onChangeDocumentDraft}
            onClearPickedDocument={onClearPickedDocument}
            onDiscardPendingUpload={onDiscardPendingUpload}
            onPickDocument={onPickDocument}
            onUsePendingUpload={onUsePendingUpload}
            pendingUploadRows={view.pendingUploadRows}
            uploadMessage={uploadMessage}
            uploadState={uploadState}
          />
        </InsurancePanelShell>
      </ScrollView>

      <InsuranceDocumentUploadFooter
        bottomInset={bottomInset}
        canAcceptDocuments={canAcceptDocuments}
        isUploadingDocument={isUploadingDocument}
        onUploadDocument={onUploadDocument}
      />
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
  startRequestNotice: {
    padding: 16,
    borderWidth: 1,
    borderColor: insurancePalette.amberBorder,
    borderRadius: 8,
    backgroundColor: insurancePalette.amberSoft,
  },
  startRequestTitle: {
    color: insurancePalette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  startRequestText: {
    marginTop: 6,
    color: insurancePalette.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  startRequestButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: insurancePalette.amber,
    justifyContent: 'center',
  },
  startRequestButtonText: {
    color: insurancePalette.onAmber,
    fontSize: 14,
    fontWeight: '800',
  },
})
