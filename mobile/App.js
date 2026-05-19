import { createContext, useContext, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LandingPage from './src/screens/LandingPage';
import RegisterPage from './src/screens/RegisterPage';
import LoginPage from './src/screens/LoginPage';
import OTPScreen from './src/screens/OTPScreen';
import CompleteOnboardingPage from './src/screens/CompleteOnboardingPage';
import Dashboard from './src/screens/Dashboard';
import TechnicianDashboard from './src/screens/TechnicianDashboard';
import ForgotPasswordEmail from './src/screens/ForgotPasswordEmail';
import ForgotPasswordOTP from './src/screens/ForgotPasswordOTP';
import ResetPassword from './src/screens/ResetPassword';
import ManageProfile from './src/screens/ManageProfile';
import ChangePassword from './src/screens/ChangePassword';
import InsuranceInquiryScreen from './src/screens/InsuranceInquiryScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import VehicleLifecycleScreen from './src/screens/VehicleLifecycleScreen';
import {
  ApiError,
  buildMobileAccountProfile,
  confirmChangePasswordWithOtp,
  customerMobileGuardMessages,
  createCustomerVehicle,
  getCustomerMobileSessionAccessState,
  isAuthSessionResponse,
  loginAccount,
  setCustomerSessionExpiredHandler,
  requestChangePasswordOtp,
  registerAccount,
  startDeleteAccountOtp,
  updateCustomerProfile,
  updateCustomerVehicle,
  verifyDeleteAccountOtp,
  verifyRegistrationOtp,
} from './src/lib/authClient';
import {
  assertMobileAppSessionAllowed,
  getMobileAppSessionAccessState,
} from './src/lib/mobileSessionAccess';
import { cloneDate, formatVehicleDisplayName } from './src/utils/validation';
import { colors } from './src/theme';
import { ThemeProvider } from './src/theme/ThemeProvider';

enableScreens(false);

const Stack = createStackNavigator();
const AppSessionContext = createContext(null);
const navigationRef = createNavigationContainerRef();
const MOBILE_DEEP_LINK_SCHEME = 'autocarecc';

const parseMobileDeepLink = (url) => {
  if (!url) {
    return {
      hostname: '',
      path: '',
      queryParams: {},
    };
  }

  try {
    const parsedUrl = new URL(url);
    return {
      hostname: String(parsedUrl.hostname ?? '').trim().toLowerCase(),
      path: String(parsedUrl.pathname ?? '').trim().replace(/^\/+/, ''),
      queryParams: Object.fromEntries(parsedUrl.searchParams.entries()),
    };
  } catch (error) {
    const fallbackMatch = /^([a-z0-9+.-]+):\/\/([^/?#]+)?\/?([^?#]*)?(?:\?([^#]*))?/i.exec(
      String(url).trim(),
    );
    const queryParams = {};

    if (fallbackMatch?.[4]) {
      const searchParams = new URLSearchParams(fallbackMatch[4]);
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    }

    return {
      hostname: String(fallbackMatch?.[2] ?? '').trim().toLowerCase(),
      path: String(fallbackMatch?.[3] ?? '').trim().replace(/^\/+/, ''),
      queryParams,
    };
  }
};

const useAppSessionContext = () => {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error('App session context is unavailable.');
  }

  return context;
};

function CustomerSurfaceStateScreen({
  navigation,
  title,
  message,
  primaryActionLabel = 'Sign In',
  onPrimaryAction,
  secondaryActionLabel = 'Back to Home',
  onSecondaryAction,
}) {
  return (
    <View style={styles.guardScreen}>
      <View style={styles.guardCard}>
        <Text style={styles.guardEyebrow}>Customer Guardrail</Text>
        <Text style={styles.guardTitle}>{title}</Text>
        <Text style={styles.guardMessage}>{message}</Text>

        <View style={styles.guardActions}>
          <TouchableOpacity
            style={styles.guardPrimaryAction}
            onPress={onPrimaryAction ?? (() => navigation.replace('Login'))}
            activeOpacity={0.88}
          >
            <Text style={styles.guardPrimaryActionText}>{primaryActionLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guardSecondaryAction}
            onPress={onSecondaryAction ?? (() => navigation.replace('Landing'))}
            activeOpacity={0.88}
          >
            <Text style={styles.guardSecondaryActionText}>{secondaryActionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RegisterScreen(props) {
  const { handleRegisterRequest } = useAppSessionContext();

  return <RegisterPage {...props} onRegister={handleRegisterRequest} />;
}

function LoginScreen(props) {
  const { handleLoginRequest } = useAppSessionContext();

  return <LoginPage {...props} onLogin={handleLoginRequest} />;
}

function OtpScreen(props) {
  const { handleVerifyRegistrationOtp, handleOtpVerified, handleResendOtp } = useAppSessionContext();

  return (
    <OTPScreen
      {...props}
      onResend={handleResendOtp}
      onVerifyRegistrationOtp={handleVerifyRegistrationOtp}
      onVerified={handleOtpVerified}
    />
  );
}

function CompleteOnboardingScreen(props) {
  const { pendingOnboardingCompletion, handleCompleteOnboarding } = useAppSessionContext();

  return (
    <CompleteOnboardingPage
      {...props}
      onboardingDraft={pendingOnboardingCompletion?.draft}
      onboardingMessage={pendingOnboardingCompletion?.message}
      onComplete={handleCompleteOnboarding}
    />
  );
}

function ForgotPasswordEmailScreen(props) {
  return <ForgotPasswordEmail {...props} />;
}

function ResetPasswordScreen(props) {
  return <ResetPassword {...props} />;
}

function MenuScreen(props) {
  const {
    activeAccount,
    clearCustomerSession,
    registeredAccount,
    syncAccount,
    handleStartDeleteAccountOtp,
  } = useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getMobileAppSessionAccessState(currentAccount);

  if (accessState === 'technician_session_active') {
    return (
      <TechnicianDashboard
        {...props}
        account={currentAccount}
        onSignOut={() => {
          clearCustomerSession();
          props.navigation.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          });
        }}
      />
    );
  }

  if (accessState !== 'customer_session_active') {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title={
          accessState === 'unauthorized_session'
            ? 'Sign in required'
            : 'Customer-only workspace'
        }
        message={
          customerMobileGuardMessages[accessState] ??
          customerMobileGuardMessages.unauthorized_session
        }
        onPrimaryAction={() => {
          clearCustomerSession();
          props.navigation.replace('Login');
        }}
      />
    );
  }

  return (
    <Dashboard
      {...props}
      account={currentAccount}
      onSaveProfile={async (profileUpdates) => {
        const nextAccount = await persistCustomerProfile({
          currentAccount,
          profileUpdates,
        });
        syncAccount(() => nextAccount);
      }}
      onSignOut={() => {
        clearCustomerSession();
        props.navigation.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        });
      }}
      onStartDeleteAccountOtp={handleStartDeleteAccountOtp}
    />
  );
}

function ManageProfileScreen(props) {
  const { activeAccount, clearCustomerSession, registeredAccount, syncAccount } =
    useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  if (accessState !== 'customer_session_active') {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer session required"
        message={
          customerMobileGuardMessages[accessState] ??
          customerMobileGuardMessages.unauthorized_session
        }
        onPrimaryAction={() => {
          clearCustomerSession();
          props.navigation.replace('Login');
        }}
      />
    );
  }

  return (
    <ManageProfile
      {...props}
      account={currentAccount}
      onSaveProfile={async (profileUpdates) => {
        const nextAccount = await persistCustomerProfile({
          currentAccount,
          profileUpdates,
        });
        syncAccount(() => nextAccount);
      }}
    />
  );
}

function ChangePasswordScreen(props) {
  const { activeAccount, clearCustomerSession, registeredAccount, syncAccount } =
    useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  if (accessState !== 'customer_session_active') {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer session required"
        message={
          customerMobileGuardMessages[accessState] ??
          customerMobileGuardMessages.unauthorized_session
        }
        onPrimaryAction={() => {
          clearCustomerSession();
          props.navigation.replace('Login');
        }}
      />
    );
  }

  return (
    <ChangePassword
      {...props}
      account={currentAccount}
    />
  );
}

function InsuranceInquiryMobileScreen(props) {
  const { activeAccount, registeredAccount } = useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  if (
    accessState === 'staff_session_blocked' ||
    accessState === 'deactivated_customer_blocked'
  ) {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer-only workspace"
        message={customerMobileGuardMessages[accessState]}
      />
    );
  }

  return (
    <InsuranceInquiryScreen
      {...props}
      account={currentAccount}
    />
  );
}

function ChatbotMobileScreen(props) {
  const { activeAccount, registeredAccount } = useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  if (
    accessState === 'staff_session_blocked' ||
    accessState === 'deactivated_customer_blocked'
  ) {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer-only support"
        message={customerMobileGuardMessages[accessState]}
      />
    );
  }

  return (
    <ChatbotScreen
      {...props}
      account={currentAccount}
    />
  );
}

function VehicleLifecycleMobileScreen(props) {
  const { activeAccount, registeredAccount } = useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  if (accessState !== 'customer_session_active') {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer session required"
        message={
          customerMobileGuardMessages[accessState] ??
          customerMobileGuardMessages.unauthorized_session
        }
        onPrimaryAction={() => props.navigation.replace('Login')}
      />
    );
  }

  return <VehicleLifecycleScreen {...props} account={currentAccount} />;
}

function BookingMobileScreen(props) {
  const { activeAccount, clearCustomerSession, registeredAccount } = useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  useEffect(() => {
    if (accessState === 'customer_session_active') {
      props.navigation.replace('Menu', {
        supportJump: {
          id: `booking-${Date.now()}`,
          activeTab: 'notifications',
          bookingMode: 'book',
        },
      });
    }
  }, [accessState, props.navigation]);

  if (accessState !== 'customer_session_active') {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer session required"
        message={
          customerMobileGuardMessages[accessState] ??
          customerMobileGuardMessages.unauthorized_session
        }
        primaryActionLabel="Sign In"
        onPrimaryAction={() => {
          clearCustomerSession();
          props.navigation.replace('Login');
        }}
      />
    );
  }

  return null;
}

function StoreMobileScreen(props) {
  const { activeAccount, clearCustomerSession, registeredAccount } = useAppSessionContext();
  const currentAccount = activeAccount || registeredAccount;
  const accessState = getCustomerMobileSessionAccessState(currentAccount);

  useEffect(() => {
    if (accessState === 'customer_session_active') {
      props.navigation.replace('Menu', {
        supportJump: {
          id: `store-${Date.now()}`,
          activeTab: 'store',
        },
      });
    }
  }, [accessState, props.navigation]);

  if (accessState !== 'customer_session_active') {
    return (
      <CustomerSurfaceStateScreen
        navigation={props.navigation}
        title="Customer session required"
        message={
          customerMobileGuardMessages[accessState] ??
          customerMobileGuardMessages.unauthorized_session
        }
        primaryActionLabel="Sign In"
        onPrimaryAction={() => {
          clearCustomerSession();
          props.navigation.replace('Login');
        }}
      />
    );
  }

  return null;
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.background,
    primary: colors.primary,
  },
};

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
const buildVehicleSnapshot = (draftAccount = {}) => {
  const vehicleMake = String(draftAccount.vehicleMake ?? '').trim();
  const vehicleModel = String(draftAccount.vehicleModel ?? '').trim();
  const vehicleYear = draftAccount.vehicleYear ?? null;

  return {
    licensePlate: String(draftAccount.licensePlate ?? '').trim().toUpperCase(),
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleDisplayName: formatVehicleDisplayName({
      vehicleMake,
      vehicleModel,
      vehicleYear,
    }),
  };
};

const mergeAccountWithOnboarding = (account, draftAccount = {}) => {
  const vehicleSnapshot = buildVehicleSnapshot(draftAccount);

  return {
    ...account,
    birthday: cloneDate(draftAccount?.birthday ?? account?.birthday),
    phoneNumber: draftAccount.phoneNumber ?? account?.phoneNumber ?? '',
    ...vehicleSnapshot,
  };
};

export default function App() {
  const [registeredAccount, setRegisteredAccount] = useState(null);
  const [pendingAccount, setPendingAccount] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [pendingOnboardingCompletion, setPendingOnboardingCompletion] = useState(null);
  const [pendingSupportJump, setPendingSupportJump] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const previousStyles = {
      htmlHeight: html.style.height,
      htmlMinHeight: html.style.minHeight,
      htmlWidth: html.style.width,
      htmlBackgroundColor: html.style.backgroundColor,
      htmlOverflow: html.style.overflow,
      htmlOverflowX: html.style.overflowX,
      bodyMinHeight: body.style.minHeight,
      bodyHeight: body.style.height,
      bodyWidth: body.style.width,
      bodyMargin: body.style.margin,
      bodyBackgroundColor: body.style.backgroundColor,
      bodyOverflow: body.style.overflow,
      bodyOverflowX: body.style.overflowX,
      rootHeight: root?.style.height,
      rootMinHeight: root?.style.minHeight,
      rootWidth: root?.style.width,
      rootBackgroundColor: root?.style.backgroundColor,
      rootOverflow: root?.style.overflow,
      rootOverflowX: root?.style.overflowX,
    };

    html.style.height = '100%';
    html.style.minHeight = '100%';
    html.style.width = '100%';
    html.style.backgroundColor = colors.background;
    html.style.overflow = 'auto';
    html.style.overflowX = 'hidden';
    body.style.minHeight = '100%';
    body.style.height = '100%';
    body.style.width = '100%';
    body.style.margin = '0';
    body.style.backgroundColor = colors.background;
    body.style.overflow = 'auto';
    body.style.overflowX = 'hidden';

    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '100%';
      root.style.width = '100%';
      root.style.backgroundColor = colors.background;
      root.style.overflow = 'auto';
      root.style.overflowX = 'hidden';
    }

    return () => {
      html.style.height = previousStyles.htmlHeight;
      html.style.minHeight = previousStyles.htmlMinHeight;
      html.style.width = previousStyles.htmlWidth;
      html.style.backgroundColor = previousStyles.htmlBackgroundColor;
      html.style.overflow = previousStyles.htmlOverflow;
      html.style.overflowX = previousStyles.htmlOverflowX;
      body.style.minHeight = previousStyles.bodyMinHeight;
      body.style.height = previousStyles.bodyHeight;
      body.style.width = previousStyles.bodyWidth;
      body.style.margin = previousStyles.bodyMargin;
      body.style.backgroundColor = previousStyles.bodyBackgroundColor;
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overflowX = previousStyles.bodyOverflowX;

      if (root) {
        root.style.height = previousStyles.rootHeight || '';
        root.style.minHeight = previousStyles.rootMinHeight || '';
        root.style.width = previousStyles.rootWidth || '';
        root.style.backgroundColor = previousStyles.rootBackgroundColor || '';
        root.style.overflow = previousStyles.rootOverflow || '';
        root.style.overflowX = previousStyles.rootOverflowX || '';
      }
    };
  }, []);

  useEffect(() => {
    setCustomerSessionExpiredHandler(() => {
      setPendingAccount(null);
      setPendingOnboardingCompletion(null);
      setActiveAccount(null);
      setRegisteredAccount((currentAccount) =>
        currentAccount
          ? {
              ...currentAccount,
              accessToken: null,
              refreshToken: null,
            }
          : currentAccount,
      );
    });

    return () => {
      setCustomerSessionExpiredHandler(null);
    };
  }, []);

  useEffect(() => {
    const buildSupportJumpFromUrl = (url) => {
      if (!url) {
        return null;
      }

      const { hostname, path, queryParams } = parseMobileDeepLink(url);
      const normalizedPath = String(path ?? '').trim().replace(/^\/+/, '');
      const normalizedHost = String(hostname ?? '').trim().toLowerCase();
      const normalizedOrderId = String(queryParams?.orderId ?? '').trim() || null;
      const normalizedBookingId = String(queryParams?.bookingId ?? '').trim() || null;

      if (
        normalizedHost === 'checkout' ||
        normalizedPath.startsWith('checkout/') ||
        url.startsWith(`${MOBILE_DEEP_LINK_SCHEME}://checkout/`)
      ) {
        const checkoutPath =
          normalizedHost === 'checkout' ? normalizedPath : `checkout/${normalizedPath}`;

        if (checkoutPath.startsWith('checkout/store/')) {
          return {
            id: `${Date.now()}-store-${normalizedOrderId ?? 'none'}`,
            activeTab: 'store',
            storeSection: 'orders',
            selectedStoreOrderId: normalizedOrderId,
            showStoreOrderDetail: Boolean(normalizedOrderId),
          };
        }

        if (checkoutPath.startsWith('checkout/booking/')) {
          return {
            id: `${Date.now()}-booking-${normalizedBookingId ?? 'none'}`,
            activeTab: 'notifications',
            bookingMode: 'track',
            selectedHistoryBookingId: normalizedBookingId,
          };
        }
      }

      return null;
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const supportJump = buildSupportJumpFromUrl(url);

      if (!supportJump) {
        return;
      }

      if (navigationRef.isReady()) {
        navigationRef.navigate('Menu', { supportJump });
        return;
      }

      setPendingSupportJump(supportJump);
    });

    void Linking.getInitialURL().then((url) => {
      const supportJump = buildSupportJumpFromUrl(url);

      if (supportJump) {
        setPendingSupportJump(supportJump);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!pendingSupportJump || !activeAccount || !navigationRef.isReady()) {
      return;
    }

    navigationRef.navigate('Menu', { supportJump: pendingSupportJump });
    setPendingSupportJump(null);
  }, [activeAccount, pendingSupportJump]);

  const rememberKnownAccount = (nextAccount) => {
    setRegisteredAccount((currentAccount) => {
      if (
        currentAccount &&
        normalizeEmail(currentAccount.email) === normalizeEmail(nextAccount?.email)
      ) {
        return {
          ...currentAccount,
          ...nextAccount,
        };
      }

      return nextAccount;
    });
  };

  const syncAccount = (nextAccountOrUpdater) => {
    setRegisteredAccount((currentAccount) => {
      if (!currentAccount) {
        return currentAccount;
      }

      const nextAccount =
        typeof nextAccountOrUpdater === 'function'
          ? nextAccountOrUpdater(currentAccount)
          : nextAccountOrUpdater;

      if (pendingAccount?.email === currentAccount.email) {
        setPendingAccount(nextAccount);
      }

      if (activeAccount?.email === currentAccount.email) {
        setActiveAccount(nextAccount);
      }

      if (
        pendingOnboardingCompletion?.draft?.email &&
        normalizeEmail(pendingOnboardingCompletion.draft.email) === normalizeEmail(currentAccount.email)
      ) {
        setPendingOnboardingCompletion((currentState) =>
          currentState
            ? {
                ...currentState,
                draft: {
                  ...currentState.draft,
                  ...nextAccount,
                },
              }
            : currentState,
        );
      }

      return nextAccount;
    });
  };

  const clearCustomerSession = () => {
    setPendingAccount(null);
    setPendingOnboardingCompletion(null);
    setActiveAccount(null);
    setRegisteredAccount((currentAccount) =>
      currentAccount
        ? {
            ...currentAccount,
            accessToken: null,
            refreshToken: null,
          }
        : currentAccount,
    );
  };

  const handleDeleteAccount = () => {
    setPendingAccount(null);
    setPendingOnboardingCompletion(null);
    setActiveAccount(null);
    setRegisteredAccount(null);
  };

  const handleStartDeleteAccountOtp = async ({ currentPassword }) => {
    const currentAccount = activeAccount ?? registeredAccount;
    const accessToken = currentAccount?.accessToken;

    if (!accessToken) {
      throw new Error('Your session expired before we could start account deletion. Please sign in again and retry.');
    }

    return startDeleteAccountOtp({
      currentPassword,
      accessToken,
    });
  };

  const handleResendOtp = async (otpParams) => {
    const currentAccount = activeAccount ?? registeredAccount;
    const accessToken = currentAccount?.accessToken;

    if (otpParams?.otpPurpose === 'passwordChange') {
      if (!accessToken) {
        throw new Error('Your session expired before we could resend the password change code. Please sign in again and retry.');
      }

      if (!otpParams?.currentPassword) {
        throw new Error('We no longer have your current-password confirmation. Restart the password change flow to request a new code.');
      }

      const enrollment = await requestChangePasswordOtp({
        currentPassword: otpParams.currentPassword,
        accessToken,
      });

      return {
        email: currentAccount?.email ?? otpParams?.email ?? null,
        maskedEmail: enrollment.maskedEmail,
        enrollmentId: enrollment.enrollmentId,
        otpExpiresAt: enrollment.otpExpiresAt ?? null,
      };
    }

    if (otpParams?.otpPurpose === 'deleteAccount') {
      if (!accessToken) {
        throw new Error('Your session expired before we could resend the delete-account code. Please sign in again and retry.');
      }

      if (!otpParams?.currentPassword) {
        throw new Error('We no longer have your password confirmation. Restart account deletion to request a new code.');
      }

      const enrollment = await startDeleteAccountOtp({
        currentPassword: otpParams.currentPassword,
        accessToken,
      });

      return {
        email: currentAccount?.email ?? otpParams?.email ?? null,
        maskedEmail: enrollment.maskedEmail,
        enrollmentId: enrollment.enrollmentId,
        otpExpiresAt: enrollment.otpExpiresAt ?? null,
      };
    }

    throw new Error('This verification code cannot be resent from this screen. Go back and request a new code.');
  };

  const persistCustomerOnboarding = async ({ session, draftAccount, existingAccount, password }) => {
    const userId = session?.user?.id ?? existingAccount?.userId;
    const accessToken = session?.accessToken ?? existingAccount?.accessToken;

    if (!userId || !accessToken) {
      throw new Error('Your session is missing the required onboarding credentials.');
    }

    const updatedUser = await updateCustomerProfile({
      userId,
      birthday: draftAccount?.birthday,
      phoneNumber: draftAccount?.phoneNumber,
      accessToken,
    });

    const vehicle = await createCustomerVehicle({
      userId,
      licensePlate: draftAccount?.licensePlate,
      vehicleMake: draftAccount?.vehicleMake,
      vehicleModel: draftAccount?.vehicleModel,
      color: draftAccount?.vehicleColor,
      vehicleYear: draftAccount?.vehicleYear,
      accessToken,
    });

    return mergeAccountWithOnboarding(
      buildMobileAccountProfile({
        session: {
          ...session,
          user: updatedUser,
        },
        password,
        draftAccount: {
          ...draftAccount,
          ownedVehicles: vehicle ? [vehicle] : [],
          primaryVehicleId: vehicle?.id ?? null,
        },
        existingAccount,
      }),
      {
        ...draftAccount,
        ownedVehicles: vehicle ? [vehicle] : [],
        primaryVehicleId: vehicle?.id ?? null,
        licensePlate: vehicle?.plateNumber ?? draftAccount?.licensePlate,
        vehicleMake: vehicle?.make ?? draftAccount?.vehicleMake,
        vehicleModel: vehicle?.model ?? draftAccount?.vehicleModel,
        vehicleColor: vehicle?.color ?? draftAccount?.vehicleColor,
        vehicleYear: vehicle?.year ?? draftAccount?.vehicleYear,
      },
    );
  };

  const persistCustomerProfile = async ({ currentAccount, profileUpdates }) => {
    const userId = currentAccount?.userId;
    const accessToken = currentAccount?.accessToken;

    if (!userId || !accessToken) {
      throw new Error('Your session is missing the credentials required to save profile changes.');
    }

    const hasUserProfileChanges = [
      'firstName',
      'lastName',
      'birthday',
      'phoneNumber',
    ].some((key) => profileUpdates?.[key] !== undefined);

    const hasVehicleChanges = [
      'licensePlate',
      'vehicleMake',
      'vehicleModel',
      'vehicleColor',
      'vehicleYear',
    ].some((key) => profileUpdates?.[key] !== undefined);

    let updatedUser = null;
    if (hasUserProfileChanges) {
      updatedUser = await updateCustomerProfile({
        userId,
        firstName: profileUpdates?.firstName ?? currentAccount?.firstName,
        lastName: profileUpdates?.lastName ?? currentAccount?.lastName,
        birthday: profileUpdates?.birthday ?? currentAccount?.birthday,
        phoneNumber: profileUpdates?.phoneNumber ?? currentAccount?.phoneNumber,
        accessToken,
      });
    }

    let savedVehicle = null;
    if (hasVehicleChanges) {
      const ownedVehicles = Array.isArray(currentAccount?.ownedVehicles)
        ? currentAccount.ownedVehicles.filter(Boolean)
        : [];
      const vehicleId =
        currentAccount?.primaryVehicleId ??
        (ownedVehicles.length === 1 ? ownedVehicles[0]?.id ?? null : null);
      const vehiclePayload = {
        plateNumber: profileUpdates?.licensePlate ?? currentAccount?.licensePlate,
        make: profileUpdates?.vehicleMake ?? currentAccount?.vehicleMake,
        model: profileUpdates?.vehicleModel ?? currentAccount?.vehicleModel,
        year: profileUpdates?.vehicleYear ?? currentAccount?.vehicleYear,
        color: profileUpdates?.vehicleColor ?? currentAccount?.vehicleColor,
      };

      if (vehicleId) {
        savedVehicle = await updateCustomerVehicle({
          vehicleId,
          vehicle: vehiclePayload,
          accessToken,
        });
      } else if (ownedVehicles.length > 1) {
        throw new Error(
          'Choose a primary vehicle before editing vehicle details so we do not update the wrong record.',
        );
      } else if (
        vehiclePayload.plateNumber ||
        vehiclePayload.make ||
        vehiclePayload.model ||
        vehiclePayload.year ||
        vehiclePayload.color
      ) {
        savedVehicle = await createCustomerVehicle({
          userId,
          licensePlate: vehiclePayload.plateNumber,
          vehicleMake: vehiclePayload.make,
          vehicleModel: vehiclePayload.model,
          vehicleYear: vehiclePayload.year,
          color: vehiclePayload.color,
          accessToken,
        });
      }
    }

    const nextAccount = {
      ...currentAccount,
    };

    if (updatedUser) {
      nextAccount.firstName = updatedUser?.firstName ?? nextAccount.firstName;
      nextAccount.lastName = updatedUser?.lastName ?? nextAccount.lastName;
      nextAccount.email = updatedUser?.email ?? nextAccount.email;
      nextAccount.phoneNumber = updatedUser?.phone ?? nextAccount.phoneNumber;
      nextAccount.birthday = updatedUser?.birthday ?? nextAccount.birthday;
      nextAccount.username = updatedUser?.username ?? nextAccount.username;
    }

    if (savedVehicle) {
      const existingVehicles = Array.isArray(currentAccount?.ownedVehicles)
        ? currentAccount.ownedVehicles.filter((vehicle) => vehicle?.id !== savedVehicle.id)
        : [];
      nextAccount.ownedVehicles = [savedVehicle, ...existingVehicles];
      nextAccount.primaryVehicleId = savedVehicle.id ?? nextAccount.primaryVehicleId ?? null;
      nextAccount.licensePlate = savedVehicle.plateNumber ?? nextAccount.licensePlate;
      nextAccount.vehicleMake = savedVehicle.make ?? nextAccount.vehicleMake;
      nextAccount.vehicleModel = savedVehicle.model ?? nextAccount.vehicleModel;
      nextAccount.vehicleColor = savedVehicle.color ?? nextAccount.vehicleColor;
      nextAccount.vehicleYear = savedVehicle.year ?? nextAccount.vehicleYear;
      nextAccount.vehicleDisplayName =
        formatVehicleDisplayName({
          vehicleMake: savedVehicle.make,
          vehicleModel: savedVehicle.model,
          vehicleYear: savedVehicle.year,
        }) || nextAccount.vehicleDisplayName;
    }

    return nextAccount;
  };

  const handleRegisterRequest = async (draftAccount) => {
    const registrationResult = await registerAccount({
      email: draftAccount.email,
      password: draftAccount.password,
      firstName: draftAccount.firstName,
      lastName: draftAccount.lastName,
      phone: draftAccount.phoneNumber || undefined,
    });

    setPendingAccount(draftAccount);
    setPendingOnboardingCompletion(null);
    setActiveAccount(null);

    if (!isAuthSessionResponse(registrationResult)) {
      return {
        mode: 'otp',
        enrollment: registrationResult,
      };
    }

    const verifiedAccount = mergeAccountWithOnboarding(
      buildMobileAccountProfile({
        session: registrationResult,
        password: draftAccount.password,
        draftAccount,
        existingAccount: registeredAccount,
      }),
      draftAccount,
    );
    const verifiedAccessState = getCustomerMobileSessionAccessState(verifiedAccount);

    if (verifiedAccessState !== 'customer_session_active') {
      throw new ApiError(
        customerMobileGuardMessages[verifiedAccessState] ??
          customerMobileGuardMessages.staff_session_blocked,
        verifiedAccessState === 'unauthorized_session' ? 401 : 403,
        {
          reason: verifiedAccessState,
          surface: 'customer-mobile',
        },
      );
    }

    rememberKnownAccount(verifiedAccount);
    setActiveAccount(verifiedAccount);

    const completedAccount = await persistCustomerOnboarding({
      session: registrationResult,
      draftAccount,
      existingAccount: verifiedAccount,
      password: draftAccount.password,
    });

    rememberKnownAccount(completedAccount);
    setActiveAccount(completedAccount);
    setPendingAccount(null);
    setPendingOnboardingCompletion(null);

    return {
      mode: 'session',
      account: completedAccount,
      nextRoute: 'Menu',
      resetStack: true,
    };
  };

  const handleVerifyRegistrationOtp = async ({ enrollmentId, otp, accountDraft }) => {
    const session = await verifyRegistrationOtp({
      enrollmentId,
      otp,
    });

    const onboardingDraft = accountDraft ?? pendingAccount ?? undefined;
    const verifiedAccount = mergeAccountWithOnboarding(
      buildMobileAccountProfile({
        session,
        password: onboardingDraft?.password ?? pendingAccount?.password ?? '',
        draftAccount: onboardingDraft,
        existingAccount: registeredAccount,
      }),
      onboardingDraft,
    );
    const verifiedAccessState = getCustomerMobileSessionAccessState(verifiedAccount);

    if (verifiedAccessState !== 'customer_session_active') {
      throw new ApiError(
        customerMobileGuardMessages[verifiedAccessState] ??
          customerMobileGuardMessages.staff_session_blocked,
        verifiedAccessState === 'unauthorized_session' ? 401 : 403,
        {
          reason: verifiedAccessState,
          surface: 'customer-mobile',
        },
      );
    }

    rememberKnownAccount(verifiedAccount);
    setActiveAccount(verifiedAccount);
    setPendingAccount(null);

    try {
      const completedAccount = await persistCustomerOnboarding({
        session,
        draftAccount: onboardingDraft,
        existingAccount: verifiedAccount,
        password: onboardingDraft?.password ?? pendingAccount?.password ?? '',
      });

      rememberKnownAccount(completedAccount);
      setActiveAccount(completedAccount);
      setPendingOnboardingCompletion(null);

      return {
        status: 'success',
        nextRoute: 'Menu',
        resetStack: true,
        account: completedAccount,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Your account is verified, but we still need to finish saving your profile details.';

      setPendingOnboardingCompletion({
        draft: onboardingDraft,
        message,
      });

      return {
        status: 'success',
        nextRoute: 'CompleteOnboarding',
        resetStack: true,
        account: verifiedAccount,
        onboardingRequired: true,
        onboardingMessage: message,
      };
    }
  };

  const handleLoginRequest = async ({ email, password }) => {
    const session = await loginAccount({
      email,
      password,
    });

    const nextAccount = buildMobileAccountProfile({
      session,
      password,
      existingAccount: registeredAccount,
    });
    const accessState = assertMobileAppSessionAllowed(nextAccount);

    rememberKnownAccount(nextAccount);
    setActiveAccount(nextAccount);
    setPendingAccount(null);
    setPendingOnboardingCompletion(null);

    return nextAccount;
  };

  const handleCompleteOnboarding = async (draftAccount) => {
    const session = {
      accessToken: activeAccount?.accessToken ?? registeredAccount?.accessToken,
      refreshToken: activeAccount?.refreshToken ?? registeredAccount?.refreshToken,
      user: {
        id: activeAccount?.userId ?? registeredAccount?.userId,
        email: activeAccount?.email ?? registeredAccount?.email,
        role: activeAccount?.role ?? registeredAccount?.role ?? null,
        staffCode: activeAccount?.staffCode ?? registeredAccount?.staffCode ?? null,
        isActive: activeAccount?.isActive ?? registeredAccount?.isActive ?? true,
        profile: {
          firstName: activeAccount?.firstName ?? registeredAccount?.firstName ?? '',
          lastName: activeAccount?.lastName ?? registeredAccount?.lastName ?? '',
          phone: activeAccount?.phoneNumber ?? registeredAccount?.phoneNumber ?? '',
          birthday: activeAccount?.birthday ?? registeredAccount?.birthday ?? null,
        },
      },
    };

    const completedAccount = await persistCustomerOnboarding({
      session,
      draftAccount,
      existingAccount: activeAccount ?? registeredAccount,
      password: activeAccount?.password ?? registeredAccount?.password ?? '',
    });

    rememberKnownAccount(completedAccount);
    setActiveAccount(completedAccount);
    setPendingOnboardingCompletion(null);

    return completedAccount;
  };

  const handleOtpVerified = async (otpParams) => {
    if (otpParams?.otpPurpose === 'passwordChange' && otpParams?.pendingPassword) {
      const currentAccount = activeAccount ?? registeredAccount;
      const accessToken = currentAccount?.accessToken;

      if (!accessToken) {
        return {
          status: 'error',
          title: 'Password Change Failed',
          message: 'Your session expired before we could finish the password change. Please sign in again and retry.',
        };
      }

      if (!otpParams?.enrollmentId || !otpParams?.otp || !otpParams?.currentPassword) {
        return {
          status: 'error',
          title: 'Password Change Failed',
          message: 'The password change verification session is incomplete. Start the change-password flow again and use the new email code.',
        };
      }

      try {
        await confirmChangePasswordWithOtp({
          enrollmentId: otpParams.enrollmentId,
          otp: otpParams.otp,
          currentPassword: otpParams.currentPassword,
          newPassword: otpParams.pendingPassword,
          accessToken,
        });

        syncAccount((currentSessionAccount) => ({
          ...currentSessionAccount,
          password: otpParams.pendingPassword,
        }));
      } catch (error) {
        return {
          status: 'error',
          title: 'Password Change Failed',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'We could not update your password right now. Please try again.',
        };
      }

      return {
        status: 'success',
        purpose: 'passwordChange',
        nextRoute: 'Menu',
        resetStack: true,
      };
    }

    if (otpParams?.otpPurpose === 'deleteAccount') {
      const currentAccount = activeAccount ?? registeredAccount;
      const accessToken = currentAccount?.accessToken;

      if (!accessToken) {
        return {
          status: 'error',
          title: 'Delete Failed',
          message: 'Your session expired before we could archive the account. Please sign in again and retry.',
        };
      }

      if (!otpParams?.enrollmentId || !otpParams?.otp) {
        return {
          status: 'error',
          title: 'Delete Failed',
          message: 'The delete verification session is incomplete. Start account deletion again and use the new email code.',
        };
      }

      try {
        await verifyDeleteAccountOtp({
          enrollmentId: otpParams.enrollmentId,
          otp: otpParams.otp,
          accessToken,
        });

        handleDeleteAccount();

        return {
          status: 'success',
          purpose: 'deleteAccount',
          nextRoute: 'Landing',
          resetStack: true,
        };
      } catch (error) {
        return {
          status: 'error',
          title: 'Delete Failed',
          message:
            error instanceof Error && error.message
              ? error.message
              : 'We could not archive your account right now. Please try again.',
        };
      }
    }

    return {
      status: 'success',
      purpose: otpParams?.otpPurpose || 'default',
      nextRoute: 'Menu',
      resetStack: true,
    };
  };

  const appSessionContextValue = {
    registeredAccount,
    pendingAccount,
    pendingOnboardingCompletion,
    activeAccount,
    setPendingAccount,
    setActiveAccount,
    setPendingOnboardingCompletion,
    syncAccount,
    clearCustomerSession,
    handleDeleteAccount,
    handleStartDeleteAccountOtp,
    handleResendOtp,
    handleRegisterRequest,
    handleVerifyRegistrationOtp,
    handleLoginRequest,
    handleCompleteOnboarding,
    handleOtpVerified,
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={styles.appRoot}>
          <StatusBar style="light" backgroundColor={colors.background} translucent={false} />
          <AppSessionContext.Provider value={appSessionContextValue}>
            <NavigationContainer
              ref={navigationRef}
              theme={navigationTheme}
              onReady={() => {
                if (pendingSupportJump) {
                  navigationRef.navigate('Menu', { supportJump: pendingSupportJump });
                  setPendingSupportJump(null);
                }
              }}
            >
          <Stack.Navigator
            initialRouteName="Landing"
            detachInactiveScreens={false}
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.primary,
                shadowColor: 'transparent',
                elevation: 0,
              },
              headerTintColor: colors.onPrimary,
              headerTitleAlign: 'center',
              headerBackTitleVisible: false,
              title: 'CRUISERS CRIB',
              headerTitleStyle: {
                fontWeight: '800',
                letterSpacing: 1.1,
                fontFamily: Platform.select({
                  ios: 'System',
                  android: 'Roboto',
                  default: 'sans-serif',
                }),
              },
              cardStyle: {
                backgroundColor: colors.background,
              },
            }}
          >
            <Stack.Screen name="Landing" component={LandingPage} options={{ headerShown: false }} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OTP" component={OtpScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="CompleteOnboarding"
              component={CompleteOnboardingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPasswordEmail"
              component={ForgotPasswordEmailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPasswordOTP"
              component={ForgotPasswordOTP}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageProfile" component={ManageProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />

            <Stack.Screen name="BookingScreen" component={BookingMobileScreen} />

            <Stack.Screen
              name="VehicleLifecycleScreen"
              component={VehicleLifecycleMobileScreen}
              options={{ headerShown: false }}
            />
            {/*

                subtitle="View your vehicle’s complete service and insurance timeline."

            */}
            <Stack.Screen name="StoreScreen" component={StoreMobileScreen} />

            <Stack.Screen
              name="InsuranceInquiryScreen"
              component={InsuranceInquiryMobileScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="ChatbotScreen"
              component={ChatbotMobileScreen}
              options={{ headerShown: false }}
            />
              </Stack.Navigator>
            </NavigationContainer>
          </AppSessionContext.Provider>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  guardScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  guardCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  guardEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  guardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  guardMessage: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 23,
  },
  guardActions: {
    marginTop: 8,
    gap: 12,
  },
  guardPrimaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardPrimaryActionText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  guardSecondaryAction: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  guardSecondaryActionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  appRoot: {
    flex: 1,
    minHeight: 0,
    flexShrink: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        overflow: 'hidden',
        overflowX: 'hidden',
      },
    }),
  },
});
