import DashboardAccountPanel from './DashboardAccountPanel'
import DashboardBookingWorkspacePanel from './DashboardBookingWorkspacePanel'
import DashboardHomePanel from './DashboardHomePanel'
import DashboardInsuranceEntryPanel from './DashboardInsuranceEntryPanel'
import DashboardMoreRootPanel from './DashboardMoreRootPanel'
import DashboardRewardsPanel from './DashboardRewardsPanel'
import { getDashboardContentKey } from './dashboardNavigationModel.mjs'
import { normalizeProfileMenuScreen } from './profileMenuPresentationModel.mjs'
import VehicleLifecycleScreen from '../VehicleLifecycleScreen'

export default function DashboardTabContent({
  account,
  activeTab,
  bookingMode,
  controllers,
  garageRefreshSignal,
  isProfileTooltipVisible,
  menuScreen,
  navigation,
  primaryVehicleLabel,
  primaryVehicleMetaLabel,
  responsive,
  shellActions,
  shellSetters,
}) {
  const {
    account: accountController,
    bookingTracking,
    bookingWorkflow,
    garage,
    loyalty,
    notifications,
    serviceHistory,
  } = controllers
  const {
    isCompactPhone,
    isVeryCompactPhone,
    isWeb,
    bookingDateCardStyle,
  } = responsive
  const {
    handleSignOut,
    navigateToBooking,
    navigateToBookingForVehicle,
    navigateToGarage,
    navigateToInsuranceInquiry,
    navigateToProfileModule,
    navigateToProfileSection,
    navigateToSupport,
    navigateToTimeline,
  } = shellActions
  const { setBookingMode, setIsProfileTooltipVisible, setMenuScreen } = shellSetters
  const notificationCount = notifications.notificationsFeed.filter((item) => item.unread).length
  const contentKey = getDashboardContentKey(activeTab)

  if (contentKey === 'booking') {
    const {
      dateKey: selectedDateKey,
      notes,
      serviceIds: selectedServiceIds,
      servicePage,
      timeKey: selectedTimeKey,
      vehicleId: selectedVehicleId,
    } = bookingWorkflow.draft

    return (
      <DashboardBookingWorkspacePanel
        isWeb={isWeb}
        isCompactPhone={isCompactPhone}
        isVeryCompactPhone={isVeryCompactPhone}
        mode={bookingMode}
        discovery={bookingWorkflow.discovery}
        selectedServiceIds={selectedServiceIds}
        selectedVehicleId={selectedVehicleId}
        selectedTimeKey={selectedTimeKey}
        selectedDateKey={selectedDateKey}
        servicePage={servicePage}
        dateCardStyle={bookingDateCardStyle}
        notes={notes}
        createState={bookingWorkflow.createState}
        history={bookingTracking.historyState}
        selectedHistoryBookingId={bookingTracking.selectedBookingId}
        detailState={bookingTracking.detailState}
        reservationPaymentState={bookingTracking.paymentState}
        onChangeMode={setBookingMode}
        onRefreshDiscovery={bookingWorkflow.refreshDiscovery}
        onPreviousServicePage={bookingWorkflow.previousServicePage}
        onNextServicePage={bookingWorkflow.nextServicePage}
        onToggleService={bookingWorkflow.toggleService}
        onSelectVehicle={bookingWorkflow.selectVehicle}
        onSelectTime={bookingWorkflow.selectTime}
        onShiftAvailabilityWindow={(direction) => {
          void bookingWorkflow.shiftAvailabilityWindow(direction)
        }}
        onRetryAvailability={() => {
          void bookingWorkflow.refreshAvailability()
        }}
        onSelectDate={bookingWorkflow.selectDate}
        onChangeDate={(nextDate) => {
          void bookingWorkflow.changeDate(nextDate)
        }}
        onChangeNotes={bookingWorkflow.setNotes}
        onRefreshConflict={() => {
          void bookingWorkflow.refreshAvailability()
        }}
        onSubmit={bookingWorkflow.submit}
        onRefreshHistory={() => {
          void bookingTracking.refresh()
        }}
        onSelectHistoryBooking={bookingTracking.selectBookingId}
        onOpenReservationPayment={() => {
          void bookingTracking.openReservationPayment()
        }}
        onRetryReservationPayment={() => {
          void bookingTracking.retryReservationPayment()
        }}
      />
    )
  }

  if (contentKey === 'rewards') {
    return (
      <DashboardRewardsPanel
        isWeb={isWeb}
        isVeryCompactPhone={isVeryCompactPhone}
        notificationCount={notificationCount}
        loyaltyState={loyalty.state}
        rewards={loyalty.rewards}
        pointsBalance={loyalty.pointsBalance}
        tier={loyalty.tier}
        transactions={loyalty.transactions}
        onToggleNotifications={notifications.toggle}
        onRedeemReward={loyalty.redeem}
      />
    )
  }

  if (contentKey === 'insurance') {
    return (
      <DashboardInsuranceEntryPanel
        isWeb={isWeb}
        isVeryCompactPhone={isVeryCompactPhone}
        garageState={garage.garageState}
        fallbackVehicles={account?.ownedVehicles ?? []}
        selectedVehicleId={garage.selectedVehicleId ?? ''}
        notificationCount={notificationCount}
        onToggleNotifications={notifications.toggle}
        onSelectVehicle={garage.selectVehicle}
        onOpenInsurance={(vehicleId) =>
          navigateToInsuranceInquiry(vehicleId, { useRememberedInquiry: false })
        }
        onAddVehicle={() =>
          navigation.navigate('VehicleLifecycleScreen', {
            openAddVehicle: true,
          })
        }
        onRetry={() => {
          void garage.refreshGarage()
        }}
      />
    )
  }

  if (contentKey === 'home') {
    return (
      <DashboardHomePanel
        isWeb={isWeb}
        isCompactPhone={isCompactPhone}
        isVeryCompactPhone={isVeryCompactPhone}
        account={account}
        notificationsFeed={notifications.notificationsFeed}
        bookingHistory={bookingTracking.historyState}
        bookingCreateState={bookingWorkflow.createState}
        bookingVehicles={bookingWorkflow.discovery.vehicles}
        serviceHistoryState={serviceHistory.state}
        primaryVehicleLabel={primaryVehicleLabel}
        primaryVehicleMetaLabel={primaryVehicleMetaLabel}
        selectedGarageVehicleId={garage.selectedVehicle?.id ?? account?.primaryVehicleId ?? ''}
        loyaltyPointsBalance={loyalty.pointsBalance}
        loyaltyTier={loyalty.tier}
        featuredReward={loyalty.featuredReward}
        isProfileTooltipVisible={isProfileTooltipVisible}
        onToggleNotifications={notifications.toggle}
        onOpenProfile={navigateToProfileModule}
        onChangeProfilePhoto={accountController.selectProfileImage}
        onProfileHoverIn={() => setIsProfileTooltipVisible(true)}
        onProfileHoverOut={() => setIsProfileTooltipVisible(false)}
        onDismissNotification={notifications.dismiss}
        onOpenBooking={navigateToBooking}
        onOpenAccessories={() => navigation.navigate('AccessoriesCatalog')}
        onOpenInsurance={() =>
          navigateToInsuranceInquiry(null, { useRememberedInquiry: false })
        }
        onOpenRewards={() => navigateToProfileSection('rewards')}
        onOpenGarage={navigateToGarage}
        onOpenSupport={navigateToSupport}
        onOpenTimeline={navigateToTimeline}
        onRedeemReward={loyalty.redeem}
      />
    )
  }

  if (contentKey === 'garage') {
    return (
      <VehicleLifecycleScreen
        account={account}
        embedded
        navigation={navigation}
        onBookVehicle={navigateToBookingForVehicle}
        onOpenInsurance={(vehicleId) =>
          navigateToInsuranceInquiry(vehicleId, { useRememberedInquiry: false })
        }
        onSelectedVehicleChange={garage.selectVehicle}
        refreshSignal={garageRefreshSignal}
        route={{
          params: {
            vehicleId: garage.selectedVehicleId,
          },
        }}
      />
    )
  }

  const normalizedMenuScreen = normalizeProfileMenuScreen(menuScreen)

  if (normalizedMenuScreen === 'root') {
    return (
      <DashboardMoreRootPanel
        isWeb={isWeb}
        isVeryCompactPhone={isVeryCompactPhone}
        account={account}
        notificationsFeed={notifications.notificationsFeed}
        loyaltyState={loyalty.state}
        loyaltyRewards={loyalty.rewards}
        loyaltyPointsBalance={loyalty.pointsBalance}
        loyaltyTier={loyalty.tier}
        onToggleNotifications={notifications.toggle}
        onOpenSettings={() => setMenuScreen('settings')}
        onOpenRewards={() => shellSetters.setActiveTab('rewards')}
        onOpenAccessories={() => navigation.navigate('AccessoriesCatalog')}
        onOpenNotificationPreferences={() => setMenuScreen('notificationPreferences')}
        onRedeemReward={loyalty.redeem}
        onSignOut={handleSignOut}
      />
    )
  }

  return (
    <DashboardAccountPanel
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
      screen={normalizedMenuScreen}
      account={account}
      isProfileEditing={accountController.isProfileEditing}
      profileForm={accountController.profileForm}
      profileErrors={accountController.profileErrors}
      securityForm={accountController.securityForm}
      securityErrors={accountController.securityErrors}
      passwordVisibility={accountController.passwordVisibility}
      securitySubmitting={accountController.securitySubmitting}
      loyaltyTransactions={loyalty.transactions}
      notificationModuleState={notifications.moduleState}
      onNavigate={setMenuScreen}
      onChangeProfilePhoto={accountController.selectProfileImage}
      onStartProfileEdit={accountController.startProfileEdit}
      onProfileFieldChange={accountController.changeProfileField}
      onSaveProfile={accountController.saveProfile}
      onCancelProfileEdit={accountController.cancelProfileEdit}
      onDeleteAccount={accountController.openDeleteAccount}
      onSecurityFieldChange={accountController.changeSecurityField}
      onTogglePasswordVisibility={accountController.togglePasswordVisibility}
      onSavePassword={() => {
        void accountController.savePassword()
      }}
      onGiftBack={() => {
        setMenuScreen('settings')
        navigation.navigate('Menu')
      }}
      onUpdateNotificationPreference={notifications.updatePreference}
    />
  )
}
