import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, View } from 'react-native'

import { radius } from '../../theme'
import {
  insuranceFonts,
  insurancePalette,
  InsuranceSectionDivider,
} from './InsurancePanelPrimitives'

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
            {[document.documentTypeLabel, document.createdAt]
              .filter(Boolean)
              .join(' | ')}
          </Text>
        </View>
      </View>

      <View style={styles.documentCardFooter}>
        {document.documentTypeLabel ? (
          <View style={styles.documentTypeBadge}>
            <Text style={styles.documentTypeBadgeText}>
              {document.documentTypeLabel}
            </Text>
          </View>
        ) : null}
        {document.notes ? (
          <Text style={styles.documentNoteText} numberOfLines={2}>
            {document.notes}
          </Text>
        ) : (
          <Text style={styles.documentNotePlaceholder}>
            No staff note attached.
          </Text>
        )}
      </View>
    </View>
  )
}

export default function InsuranceDocumentHistory({ documents }) {
  return (
    <InsuranceSectionDivider title="Already on file">
      <View style={styles.documentCollection}>
        {documents.length ? (
          documents.map((document, index) => (
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
  )
}

const styles = StyleSheet.create({
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
})
