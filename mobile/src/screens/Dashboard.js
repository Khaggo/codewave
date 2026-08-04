import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildOwnedVehicleLabel } from '../lib/bookingDiscoveryClient';
import DeleteAccountModal from '../components/DeleteAccountModal';
import {
  buildInsuranceTrackingStorageKey,
  getRememberedInsuranceInquiryId,
  parseRememberedInsuranceInquiryMappings,
} from './insurance/insuranceTrackingModel.mjs';
import { radius } from '../theme';
import {
  buildMobileDeepLinkUrl,
  normalizeNavigationId,
} from './dashboard/dashboardNavigationModel.mjs';
import styles from './dashboard/dashboardStyles';
import { getBookingReference } from './dashboard/bookingSelectionModel.mjs';
import DashboardBottomNavigation from './dashboard/DashboardBottomNavigation';
import DashboardNotificationsPanel from './dashboard/DashboardNotificationsPanel';
import DashboardTabContent from './dashboard/DashboardTabContent';
import useDashboardBookingTrackingController from './dashboard/useDashboardBookingTrackingController';
import useDashboardBookingWorkflowController from './dashboard/useDashboardBookingWorkflowController';
import useDashboardAccountController from './dashboard/useDashboardAccountController';
import useDashboardGarageController from './dashboard/useDashboardGarageController';
import useDashboardLoyaltyController from './dashboard/useDashboardLoyaltyController';
import useDashboardNotificationController from './dashboard/useDashboardNotificationController';
import useDashboardServiceHistoryController from './dashboard/useDashboardServiceHistoryController';

export default function Dashboard({
  account,
  navigation,
  route,
  onSignOut,
  onSaveProfile,
  onStartDeleteAccountOtp,
}) {
  const isWeb = Platform.OS === 'web';
  const insets = useSafeAreaInsets();
  const bottomInset = isWeb ? 0 : insets.bottom;
  const { width: windowWidth } = useWindowDimensions();
  const isTinyPhone = windowWidth < 360;
  const isVeryCompactPhone = windowWidth < 390;
  const isCompactPhone = windowWidth < 430;
  const bookingDateCardStyle = isCompactPhone
    ? { width: '100%', maxWidth: '100%' }
    : { width: '48%', maxWidth: '48%' };
  const [activeTab, setActiveTab] = useState('explore');
  const [menuScreen, setMenuScreen] = useState('root');
  const [bookingMode, setBookingMode] = useState('book');
  const [garageRefreshSignal, setGarageRefreshSignal] = useState(0);
  const [isProfileTooltipVisible, setIsProfileTooltipVisible] = useState(false);
  const accountController = useDashboardAccountController({
    account,
    navigation,
    onCloseProfileTooltip: () => setIsProfileTooltipVisible(false),
    onProfileSaved: () => setMenuScreen('settings'),
    onSaveProfile,
    onStartDeleteAccountOtp,
  });
  const {
    cancelDeleteAccount: handleCancelDeleteAccount,
    changeDeletePassword: handleDeletePasswordChange,
    confirmDeleteAccount: handleConfirmDeleteAccount,
    deletePassword,
    deletePasswordError,
    deleteSubmitting,
    isDeleteModalVisible,
  } = accountController;
  const buildMobileCheckoutReturnUrls = (kind, id = null) => {
    const normalizedId = String(id ?? '').trim() || undefined;
    const queryParams = normalizedId ? { bookingId: normalizedId } : undefined;

    return {
      successUrl: buildMobileDeepLinkUrl(`checkout/${kind}/success`, queryParams),
      cancelUrl: buildMobileDeepLinkUrl(`checkout/${kind}/cancel`, queryParams),
    };
  };
  const garageController = useDashboardGarageController({
    account,
    garageActive: activeTab === 'insurance',
    lifecycleActive: false,
  });
  const {
    selectVehicle: setSelectedGarageVehicleId,
    selectedVehicleId: selectedGarageVehicleId,
    selectedVehicleSummary: selectedGarageVehicleSummary,
  } = garageController;
  const accountPrimaryVehicle =
    account?.primaryVehicle ??
    account?.ownedVehicles?.find((vehicle) => vehicle.id === account?.primaryVehicleId) ??
    account?.ownedVehicles?.[0] ??
    null;
  const primaryVehicleLabel =
    selectedGarageVehicleSummary?.title ||
    buildOwnedVehicleLabel(accountPrimaryVehicle) ||
    account?.vehicleDisplayName ||
    account?.vehicleModel ||
    'No vehicle selected';
  const primaryVehicleMetaLabel =
    selectedGarageVehicleSummary?.subtitle ||
    [
      accountPrimaryVehicle?.plateNumber ?? account?.licensePlate,
      accountPrimaryVehicle?.color,
      accountPrimaryVehicle?.vin ? `VIN ${accountPrimaryVehicle.vin}` : null,
      accountPrimaryVehicle?.year ?? account?.vehicleYear
        ? `${accountPrimaryVehicle?.year ?? account?.vehicleYear} Model`
        : null,
    ]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' - ') ||
    'Add vehicle details to personalize this card.';
  const lastHandledSupportJumpRef = useRef(null);
  const notificationController = useDashboardNotificationController({ account });
  const {
    animation: notificationPanelAnim,
    close: closeNotifications,
    dismiss: handleDismissNotification,
    isVisible: isNotificationsVisible,
    markAllRead: handleMarkAllNotificationsRead,
    markOpened: markNotificationOpened,
    notificationsFeed,
  } = notificationController;
  const bookingTrackingController = useDashboardBookingTrackingController({
    account,
    historyActive:
      activeTab === 'explore' ||
      (activeTab === 'notifications' && bookingMode === 'track'),
    trackingActive: activeTab === 'notifications' && bookingMode === 'track',
    buildCheckoutReturnUrls: buildMobileCheckoutReturnUrls,
  });
  const {
    refresh: refreshBookingTracking,
    selectBookingId: selectHistoryBookingId,
    upsertBooking,
  } = bookingTrackingController;
  const bookingWorkflowController = useDashboardBookingWorkflowController({
    account,
    active: activeTab === 'notifications' && bookingMode === 'book',
    buildCheckoutReturnUrls: buildMobileCheckoutReturnUrls,
    onBookingCreated: upsertBooking,
    onBookingSubmitted: () => setBookingMode('track'),
  });
  const {
    refreshDiscovery: handleRefreshBookingDiscovery,
    selectVehicle: selectBookingVehicle,
  } = bookingWorkflowController;
  const serviceHistoryController = useDashboardServiceHistoryController({
    account,
    active: activeTab === 'explore',
  });
  const loyaltyController = useDashboardLoyaltyController({ account });
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const screenTranslateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const supportJump = route?.params?.supportJump;

    if (!supportJump?.id || lastHandledSupportJumpRef.current === supportJump.id) {
      return;
    }

    lastHandledSupportJumpRef.current = supportJump.id;

    if (supportJump.activeTab && supportJump.activeTab !== 'store') {
      setActiveTab(supportJump.activeTab);
    }

    if (supportJump.bookingMode) {
      setBookingMode(supportJump.bookingMode);
    }

    if (supportJump.menuScreen) {
      setMenuScreen(supportJump.menuScreen);
    }

    if (Object.prototype.hasOwnProperty.call(supportJump, 'selectedHistoryBookingId')) {
      selectHistoryBookingId(supportJump.selectedHistoryBookingId ?? null);
    }

    setIsProfileTooltipVisible(false);
  }, [
    route?.params?.supportJump,
    selectHistoryBookingId,
  ]);

  useEffect(() => {
    screenFadeAnim.stopAnimation();
    screenTranslateAnim.stopAnimation();
    screenFadeAnim.setValue(0);
    screenTranslateAnim.setValue(14);

    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(screenTranslateAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [activeTab, menuScreen, bookingMode, screenFadeAnim, screenTranslateAnim]);

  useEffect(() => {
    closeNotifications();
    setIsProfileTooltipVisible(false);
  }, [activeTab, closeNotifications, menuScreen]);

  const handleTabPress = (tabKey) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.activeElement?.blur?.();
    }

    if (tabKey === activeTab && tabKey === 'notifications') {
      if (bookingMode === 'book') {
        void handleRefreshBookingDiscovery();
        return;
      }

      void refreshBookingTracking();
      return;
    }

    if (tabKey === activeTab && tabKey === 'messages') {
      setGarageRefreshSignal((currentSignal) => currentSignal + 1);
      return;
    }

    if (tabKey === 'more') {
      setMenuScreen('root');
    }

    setActiveTab(tabKey);
  };

  const navigateToTimeline = () => {
    setActiveTab('messages');
  };

  const navigateToGarage = (vehicleId = null) => {
    if (vehicleId) {
      setSelectedGarageVehicleId(vehicleId);
    }

    setActiveTab('messages');
  };

  const navigateToBooking = (mode = 'book') => {
    setActiveTab('notifications');
    setBookingMode(mode);
  };

  const navigateToBookingForVehicle = (vehicleId) => {
    if (vehicleId) {
      selectBookingVehicle(vehicleId);
    }

    navigateToBooking('book');
  };

  const navigateToProfileSection = (sectionKey) => {
    setActiveTab(sectionKey === 'rewards' || sectionKey === 'insurance' ? sectionKey : 'menu');
    setMenuScreen('root');
    setIsProfileTooltipVisible(false);
  };

  const navigateToInsuranceInquiry = (vehicleId = null, { useRememberedInquiry = true } = {}) => {
    const loadRememberedInquiryMappings = async () => {
      try {
        const serializedMappings = await AsyncStorage.getItem(
          buildInsuranceTrackingStorageKey(account?.userId),
        );
        return parseRememberedInsuranceInquiryMappings(serializedMappings);
      } catch {
        // Ignore resume cache failures and fall back to the normal insurance home.
        return {};
      }
    };

    return loadRememberedInquiryMappings().then((rememberedInquiryMappings) => {
      const selectedVehicleId =
        normalizeNavigationId(vehicleId) ??
        normalizeNavigationId(selectedGarageVehicleId) ??
        normalizeNavigationId(account?.primaryVehicleId);
      const rememberedInquiryId = useRememberedInquiry
        ? getRememberedInsuranceInquiryId(
            rememberedInquiryMappings,
            selectedVehicleId,
          )
        : null;

      navigation.navigate('InsuranceInquiryScreen', {
        vehicleId: selectedVehicleId,
        inquiryId: rememberedInquiryId,
      });
    });
  };

  const navigateToSupport = () => {
    navigation.navigate('ChatbotScreen');
  };

  const navigateToProfileModule = () => {
    setActiveTab('menu');
    setMenuScreen('root');
    setIsProfileTooltipVisible(false);
  };

  const handleOpenNotification = (item) => {
    markNotificationOpened(item);

    if (item.action === 'booking' || item.category === 'booking_reminder') {
      navigateToBooking('track');
    } else if (item.action === 'insurance' || item.category === 'insurance_update') {
      navigateToInsuranceInquiry();
    } else if (item.action === 'rewards' || item.category === 'invoice_aging') {
      navigateToProfileSection('rewards');
    } else if (item.action === 'timeline') {
      navigateToTimeline();
    }

    closeNotifications();
  };

  const handleSignOut = () => {
    onSignOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  };

  const bottomNavItemInset = isTinyPhone ? 0 : isVeryCompactPhone ? 1 : isCompactPhone ? 3 : 6;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.flex}
      >
        <View style={styles.screen}>
          <Animated.View
            style={[
              styles.contentArea,
              {
                opacity: screenFadeAnim,
                transform: [{ translateY: screenTranslateAnim }],
              },
            ]}
          >
            <DashboardTabContent
              account={account}
              activeTab={activeTab}
              bookingMode={bookingMode}
              controllers={{
                account: accountController,
                bookingTracking: bookingTrackingController,
                bookingWorkflow: bookingWorkflowController,
                garage: garageController,
                loyalty: loyaltyController,
                notifications: notificationController,
                serviceHistory: serviceHistoryController,
              }}
              garageRefreshSignal={garageRefreshSignal}
              isProfileTooltipVisible={isProfileTooltipVisible}
              menuScreen={menuScreen}
              navigation={navigation}
              primaryVehicleLabel={primaryVehicleLabel}
              primaryVehicleMetaLabel={primaryVehicleMetaLabel}
              responsive={{
                bookingDateCardStyle,
                isCompactPhone,
                isVeryCompactPhone,
                isWeb,
              }}
              shellActions={{
                handleSignOut,
                navigateToBooking,
                navigateToBookingForVehicle,
                navigateToGarage,
                navigateToInsuranceInquiry,
                navigateToProfileModule,
                navigateToProfileSection,
                navigateToSupport,
                navigateToTimeline,
              }}
              shellSetters={{
                setActiveTab,
                setBookingMode,
                setIsProfileTooltipVisible,
                setMenuScreen,
              }}
            />
          </Animated.View>

          <DashboardNotificationsPanel
            visible={isNotificationsVisible}
            animation={notificationPanelAnim}
            notifications={notificationsFeed}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onClose={closeNotifications}
            onOpen={handleOpenNotification}
            onDismiss={handleDismissNotification}
          />

          <DashboardBottomNavigation
            activeTab={activeTab}
            bottomInset={bottomInset}
            isCompactPhone={isCompactPhone}
            isVeryCompactPhone={isVeryCompactPhone}
            itemInset={bottomNavItemInset}
            onTabPress={handleTabPress}
          />
        </View>
      </KeyboardAvoidingView>

      <DeleteAccountModal
        visible={isDeleteModalVisible}
        onCancel={handleCancelDeleteAccount}
        onConfirm={handleConfirmDeleteAccount}
        password={deletePassword}
        submitting={deleteSubmitting}
        onPasswordChange={handleDeletePasswordChange}
        error={deletePasswordError}
      />
    </SafeAreaView>
  );
}

