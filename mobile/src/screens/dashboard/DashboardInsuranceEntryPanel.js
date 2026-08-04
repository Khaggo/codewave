import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Text, TouchableOpacity, View } from 'react-native'

import { colors } from '../../theme'
import { NotificationIconButton } from './DashboardProfileComponents'
import DashboardScrollRegion from './DashboardScrollRegion'
import MotionPressable from './MotionPressable'
import styles from './dashboardStyles'
import {
  buildInsuranceEntryVehicles,
  getInsuranceEntryView,
} from './insuranceEntryPresentationModel.mjs'

export default function DashboardInsuranceEntryPanel({
  isWeb,
  isVeryCompactPhone,
  garageState,
  fallbackVehicles,
  selectedVehicleId,
  notificationCount,
  onToggleNotifications,
  onSelectVehicle,
  onOpenInsurance,
  onAddVehicle,
  onRetry,
}) {
  const vehicles = buildInsuranceEntryVehicles(
    garageState.vehicleSummaries,
    garageState.vehicles?.length ? garageState.vehicles : fallbackVehicles,
  )
  const view = getInsuranceEntryView({
    status: garageState.status,
    errorMessage: garageState.errorMessage,
    vehicles,
    selectedVehicleId,
  })

  return (
    <DashboardScrollRegion
      contentStyle={styles.menuRootContent}
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
    >
      <View style={styles.profileHomeHeader}>
        <Text style={styles.profileHomeTitle}>Insurance</Text>
        <NotificationIconButton
          count={notificationCount}
          onPress={onToggleNotifications}
        />
      </View>

      <Text style={styles.sectionHeading}>Select Vehicle</Text>
      {view.state === 'loading' ? (
        <View style={styles.infoPanel} accessibilityLiveRegion="polite">
          <Text style={styles.infoPanelTitle}>Loading vehicles</Text>
          <Text style={styles.infoPanelText}>
            Loading your vehicles for insurance.
          </Text>
        </View>
      ) : null}

      {view.state === 'error' ? (
        <View style={styles.infoPanel} accessibilityRole="alert">
          <Text style={styles.infoPanelTitle}>Vehicles unavailable</Text>
          <Text style={styles.infoPanelText}>{view.errorMessage}</Text>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.infoPanelPrimaryAction]}
            onPress={onRetry}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Retry loading vehicles"
          >
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {view.state === 'empty' ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Add your first vehicle</Text>
          <Text style={styles.infoPanelText}>
            Insurance requests must be connected to one of your vehicles.
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.editProfileButton,
              styles.infoPanelPrimaryAction,
            ]}
            onPress={onAddVehicle}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="Add a vehicle for insurance"
          >
            <Text style={styles.primaryButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {view.state === 'ready' ? (
        <>
          <View style={styles.garageVehicleList}>
            {vehicles.map((vehicle) => {
              const isSelected = vehicle.id === selectedVehicleId
              return (
                <MotionPressable
                  key={vehicle.id}
                  style={[
                    styles.garageVehicleCard,
                    isSelected && styles.garageVehicleCardSelected,
                  ]}
                  onPress={() => onSelectVehicle(vehicle.id)}
                  scaleTo={0.99}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${vehicle.title}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.garageVehicleHeader}>
                    <View style={styles.garageVehicleIconWrap}>
                      <MaterialCommunityIcons
                        name="shield-car"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.garageVehicleCopy}>
                      <View style={styles.garageVehicleTitleRow}>
                        <Text style={styles.garageVehicleTitle}>{vehicle.title}</Text>
                        {isSelected ? (
                          <View style={styles.garagePrimaryPill}>
                            <Text style={styles.garagePrimaryPillText}>Selected</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.garageVehicleMeta}>{vehicle.subtitle}</Text>
                    </View>
                  </View>
                </MotionPressable>
              )
            })}
          </View>

          <Text style={styles.insuranceSelectionMeta}>
            {view.selectedVehicle
              ? `Selected: ${view.selectedVehicle.title}`
              : 'Choose a vehicle to continue.'}
          </Text>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.editProfileButton,
              styles.infoPanelPrimaryAction,
              !view.canOpen && styles.insuranceLauncherDisabled,
            ]}
            onPress={() => view.canOpen && onOpenInsurance(view.selectedVehicle.id)}
            activeOpacity={view.canOpen ? 0.86 : 1}
            disabled={!view.canOpen}
            accessibilityRole="button"
            accessibilityLabel="Open insurance home"
            accessibilityState={{ disabled: !view.canOpen }}
          >
            <Text style={styles.primaryButtonText}>Open Insurance Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.infoPanelPrimaryAction]}
            onPress={onAddVehicle}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Add another vehicle"
          >
            <Text style={styles.secondaryButtonText}>Add Another Vehicle</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </DashboardScrollRegion>
  )
}
