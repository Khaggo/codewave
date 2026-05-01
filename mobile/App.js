import { createContext, useContext, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
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
import FeatureModuleScreen from './src/screens/FeatureModuleScreen';
import InsuranceInquiryScreen from './src/screens/InsuranceInquiryScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import VehicleLifecycleScreen from './src/screens/VehicleLifecycleScreen';
import {
  ApiError,
  buildMobileAccountProfile,
  customerMobileGuardMessages,
  createCustomerVehicle,
  getCustomerMobileSessionAccessState,
  loginAccount,
  registerAccount,
  startDeleteAccountOtp,
  updateCustomerProfile,
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
  primaryActionLabel = 'Sign in',
  onPrimaryAction,
  secondaryActionLabel = 'Back to home',
  onSecondaryAction,
}) {
  return (
    <View style={styles.guardScreen}>
      <View style={styles.guardCard}>
        <Text style={styles.guardEyebrow}>Customer guardrail</Text>
        <Text style={styles.guardTitle}>{title}</Text>
        <Text style={styles.guardMessage}>{message}</Text>

        <View style={styles.guardActions}>
          <TouchableOpacity
            style={styles.guardPrimaryAction}
            onPress={onPrimaryAction ?? (() => navigation.replace('Login'))}
            activeOpacity={0.9}
          >
            <Text style={styles.guardPrimaryActionText}>{primaryActionLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guardSecondaryAction}
            onPress={onSecondaryAction ?? (() => navigation.replace('Landing'))}
            activeOpacity={0.9}
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
  const { handleVerifyRegistrationOtp, handleOtpVerified } = useAppSessionContext();

  return (
    <OTPScreen
      {...props}
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
  const { registeredAccount } = useAppSessionContext();

  return <ForgotPasswordEmail {...props} registeredAccount={registeredAccount} />;
}

function ResetPasswordScreen(props) {
  const { syncAccount } = useAppSessionContext();

  return (
    <ResetPassword
      {...props}
      onResetPassword={(newPassword) => {
        syncAccount((currentAccount) => ({
          ...currentAccount,
          password: newPassword,
        }));
      }}
    />
  );
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
      onSaveProfile={(profileUpdates) => {
        syncAccount((currentAccount) => ({
          ...currentAccount,
          ...profileUpdates,
        }));
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
      onSaveProfile={(profileUpdates) => {
        syncAccount((currentAccount) => ({
          ...currentAccount,
          ...profileUpdates,
        }));
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
      onChangePassword={(newPassword) => {
        syncAccount((currentAccount) => ({
          ...currentAccount,
          password: newPassword,
        }));
      }}
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
    html.style.overflow = 'hidden';
    html.style.overflowX = 'hidden';
    body.style.minHeight = '100%';
    body.style.height = '100%';
    body.style.width = '100%';
    body.style.margin = '0';
    body.style.backgroundColor = colors.background;
    body.style.overflow = 'hidden';
    body.style.overflowX = 'hidden';

    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '100%';
      root.style.width = '100%';
      root.style.backgroundColor = colors.background;
      root.style.overflow = 'hidden';
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
        vehicleYear: vehicle?.year ?? draftAccount?.vehicleYear,
      },
    );
  };

  const handleRegisterRequest = async (draftAccount) => {
    const enrollment = await registerAccount({
      email: draftAccount.email,
      password: draftAccount.password,
      firstName: draftAccount.firstName,
      lastName: draftAccount.lastName,
      phone: draftAccount.phoneNumber || undefined,
    });

    setPendingAccount(draftAccount);
    setPendingOnboardingCompletion(null);
    setActiveAccount(null);

    return enrollment;
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

    try {
      assertMobileAppSessionAllowed(nextAccount);
    } catch (error) {
      const accessState = getMobileAppSessionAccessState(nextAccount);

      throw new ApiError(
        error instanceof Error && error.message
          ? error.message
          : customerMobileGuardMessages[accessState] ??
              customerMobileGuardMessages.staff_session_blocked,
        accessState === 'unauthorized_session' ? 401 : 403,
        {
          reason: accessState,
          surface: 'customer-mobile',
        },
      );
    }

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
        role: activeAccount?.role ?? registeredAccount?.role ?? 'customer',
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
      syncAccount((currentAccount) => ({
        ...currentAccount,
        password: otpParams.pendingPassword,
      }));

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
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            initialRouteName="Landing"
            detachInactiveScreens={false}
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.surface,
                shadowColor: 'transparent',
                elevation: 0,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSoft,
              },
              headerTintColor: colors.text,
              headerTitleAlign: 'center',
              headerBackTitleVisible: false,
              title: 'CRUISERS CRIB',
              headerTitleStyle: {
                fontWeight: '700',
                letterSpacing: 0.6,
                fontSize: 16,
                color: colors.text,
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

            <Stack.Screen name="BookingScreen">
            {(props) => (
              <FeatureModuleScreen
                {...props}
                title="Service Booking"
                subtitle="Schedule appointments and monitor real-time status."
                bullets={[
                  'Book preventive maintenance and inspections.',
                  'Track service progress from drop-off to release.',
                  'Review appointment details in one place.',
                ]}
              />
            )}
            </Stack.Screen>

            <Stack.Screen
              name="VehicleLifecycleScreen"
              component={VehicleLifecycleMobileScreen}
              options={{ headerShown: false }}
            />
            {/*

                subtitle="View your vehicle’s complete service and insurance timeline."

            */}
            <Stack.Screen name="StoreScreen">
            {(props) => (
              <FeatureModuleScreen
                {...props}
                title="E-commerce Store"
                subtitle="Browse and order genuine automotive parts and products."
                bullets={[
                  'Explore curated parts, fluids, and accessories.',
                  'Preview product categories for future orders.',
                  'Track shopping and fulfillment status in later phases.',
                ]}
              />
            )}
            </Stack.Screen>

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
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 4,
  },
  guardEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  guardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  guardMessage: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  guardActions: {
    marginTop: 8,
    gap: 10,
  },
  guardPrimaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardPrimaryActionText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  guardSecondaryAction: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  guardSecondaryActionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
