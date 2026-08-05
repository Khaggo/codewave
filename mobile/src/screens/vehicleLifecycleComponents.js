import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../theme';
import styles from './vehicleLifecycleStyles';
import {
  getVehicleLabel,
  getVehiclePlate,
  getVehicleReference,
} from './vehicleLifecyclePresentation.mjs';

export function StateCard({
  icon = 'timeline-clock-outline',
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconWrap}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          activeOpacity={0.86}
          onPress={onAction}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ActionButton({ icon, label, emphasis = 'secondary', onPress }) {
  const isPrimary = emphasis === 'primary';

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.86}
      onPress={onPress}
      style={[
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={isPrimary ? colors.onPrimary : colors.text}
      />
      <Text
        style={[
          styles.actionButtonText,
          isPrimary ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function VehiclePickerRow({ vehicle, isActive, onPress }) {
  return (
    <TouchableOpacity
      accessibilityLabel={`${getVehicleLabel(vehicle)}, reference ${getVehicleReference(vehicle)}, ${getVehiclePlate(vehicle)}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.vehiclePickerRow, isActive && styles.vehiclePickerRowActive]}
    >
      <View style={styles.vehiclePickerRowIcon}>
        <MaterialCommunityIcons name="car-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.vehiclePickerRowCopy}>
        <Text style={styles.vehiclePickerRowTitle}>{getVehicleLabel(vehicle)}</Text>
        <Text style={styles.vehiclePickerRowMeta}>
          {getVehicleReference(vehicle)} - {getVehiclePlate(vehicle)}
        </Text>
      </View>
      <MaterialCommunityIcons
        name={isActive ? 'check-circle' : 'chevron-right'}
        size={21}
        color={isActive ? colors.primary : colors.mutedText}
      />
    </TouchableOpacity>
  );
}

export function MetricCard({ icon = 'chart-box-outline', label, value, tone = 'default', helper }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <MaterialCommunityIcons
          name={icon}
          size={17}
          color={tone === 'warm' ? colors.primary : colors.text}
        />
      </View>
      <Text style={[styles.metricValue, tone === 'warm' && styles.metricValueWarm]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </View>
  );
}

export function ShowcaseBadge({ icon, label, tone = 'neutral' }) {
  return (
    <View
      style={[
        styles.showcaseBadge,
        tone === 'accent' ? styles.showcaseBadgeAccent : styles.showcaseBadgeNeutral,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={14}
        color={tone === 'accent' ? colors.primary : colors.labelText}
      />
      <Text
        style={[
          styles.showcaseBadgeText,
          tone === 'accent' ? styles.showcaseBadgeTextAccent : styles.showcaseBadgeTextNeutral,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function SectionHeading({ eyebrow, title, description }) {
  return (
    <View style={styles.sectionHeading}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionText}>{description}</Text> : null}
    </View>
  );
}

export function InlineEmptyState({ icon = 'tray-remove', title, message }) {
  return (
    <View style={styles.inlineEmptyState}>
      <View style={styles.inlineEmptyStateIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.inlineEmptyStateCopy}>
        <Text style={styles.inlineEmptyStateTitle}>{title}</Text>
        <Text style={styles.inlineEmptyStateText}>{message}</Text>
      </View>
    </View>
  );
}

export function TimelineEventCard({ event }) {
  return (
    <View style={styles.timelineEventCard}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot}>
          <MaterialCommunityIcons name={event.icon} size={16} color={colors.onPrimary} />
        </View>
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.timelineEventContent}>
        <View style={styles.timelineEventHeader}>
          <Text style={styles.timelineEventDate}>{event.dateLabel}</Text>
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>{event.typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.timelineEventTitle}>{event.title}</Text>
        <Text style={styles.timelineEventSummary}>{event.summary}</Text>
        <Text style={styles.timelineEventMeta}>{event.metaLabel}</Text>
      </View>
    </View>
  );
}

export function InsightCard({ icon, title, message }) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.insightCopy}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightText}>{message}</Text>
      </View>
    </View>
  );
}
