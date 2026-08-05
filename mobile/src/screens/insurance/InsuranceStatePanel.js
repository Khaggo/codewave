import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../theme';
import styles from '../insuranceInquiryStyles';

export default function InsuranceStatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'default',
  loading = false,
}) {
  return (
    <View
      style={[
        styles.statePanel,
        tone === 'danger' && styles.statePanelDanger,
        tone === 'warning' && styles.statePanelWarning,
        tone === 'success' && styles.statePanelSuccess,
      ]}
    >
      <View style={styles.statePanelHeader}>
        <View style={styles.statePanelIconWrap}>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.statePanelCopy}>
          <Text style={styles.statePanelTitle}>{title}</Text>
          <Text style={styles.statePanelText}>{message}</Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.statePanelButton}
          onPress={onAction}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.statePanelButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
