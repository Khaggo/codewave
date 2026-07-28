import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { insurancePalette } from './InsurancePanelPrimitives'
import styles from './insuranceRequestPanelStyles'

export function InlineNotice({ state, message }) {
  if (!message) {
    return null
  }

  const isSuccess = state === 'submitted_inquiry'
  const isLoading = state === 'submitting'

  return (
    <View style={[styles.noticeRow, isSuccess && styles.noticeRowSuccess]}>
      {isLoading ? (
        <ActivityIndicator color={insurancePalette.amber} size="small" />
      ) : (
        <MaterialCommunityIcons
          name={isSuccess ? 'check-decagram-outline' : 'information-outline'}
          size={18}
          color={insurancePalette.amber}
        />
      )}
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  )
}

export const REQUEST_TITLES = {
  claim: 'Claim request',
  renewal: 'Renewal request',
  new_application: 'New application',
  quotation: 'Quotation request',
}

export function StagedDocumentRow({ item, onAttach, onRemove, disabled = false }) {
  const hasFile = Boolean(item.fileName)
  const hasOnFileDocument = Boolean(item.onFileName)

  return (
    <View style={styles.documentRow}>
      <View style={styles.documentCopy}>
        <Text style={styles.documentLabel}>{item.label}</Text>
        {hasOnFileDocument && !hasFile ? (
          <Text style={styles.documentMeta}>
            {[item.onFileName, 'Already on file'].filter(Boolean).join(' - ')}
          </Text>
        ) : null}
        <Text style={styles.documentMeta}>
          {hasFile
            ? [item.fileName, item.fileSizeLabel].filter(Boolean).join(' • ')
            : hasOnFileDocument
              ? ''
              : 'Not attached yet'}
        </Text>
      </View>
      <View style={styles.documentActions}>
        <TouchableOpacity
          style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
          onPress={() => onAttach(item.type)}
          disabled={disabled}
          activeOpacity={0.88}
        >
          <Text style={styles.secondaryButtonText}>
            {hasFile || hasOnFileDocument ? 'Replace' : 'Attach'}
          </Text>
        </TouchableOpacity>
        {hasFile ? (
          <TouchableOpacity
            style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
            onPress={() => onRemove(item.type)}
            disabled={disabled}
            activeOpacity={0.88}
          >
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}
