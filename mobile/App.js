import { createContext, useContext, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import LandingPage from './src/screens/LandingPage';
import RegisterPage from './src/screens/RegisterPage';
import LoginPage from './src/screens/LoginPage';
import OTPScreen from './src/screens/OTPScreen';
import Dashboard from './src/screens/Dashboard';
import ForgotPasswordEmail from './src/screens/ForgotPasswordEmail';
import ForgotPasswordOTP from './src/screens/ForgotPasswordOTP';
import ResetPassword from './src/screens/ResetPassword';
import ManageProfile from './src/screens/ManageProfile';
import ChangePassword from './src/screens/ChangePassword';
import FeatureModuleScreen from './src/screens/FeatureModuleScreen';
import {
  buildMobileAccountProfile,
  loginAccount,
  registerAccount,
  verifyRegistrationOtp,
} from './src/lib/authClient';
import { colors } from './src/theme';

const Stack = createStackNavigator();
const AppSessionContext = createContext(null);

const useAppSessionContext = () => {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error('App session context is unavailable.');
  }

  return context;
};

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
  const { activeAccount, registeredAccount, syncAccount, handleDeleteAccount, setPendingAccount, setActiveAccount } =
    useAppSessionContext();

  return (
    <Dashboard
      {...props}
      account={activeAccount || registeredAccount}
      onSaveProfile={(profileUpdates) => {
        syncAccount((currentAccount) => ({
          ...currentAccount,
          ...profileUpdates,
        }));
      }}
      onSignOut={() => {
        setPendingAccount(null);
        setActiveAccount(null);
      }}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}

function ManageProfileScreen(props) {
  const { activeAccount, registeredAccount, syncAccount } = useAppSessionContext();

  return (
    <ManageProfile
      {...props}
      account={activeAccount || registeredAccount}
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
  const { activeAccount, registeredAccount, syncAccount } = useAppSessionContext();

  return (
    <ChangePassword
      {...props}
      account={activeAccount || registeredAccount}
      onChangePassword={(newPassword) => {
        syncAccount((currentAccount) => ({
          ...currentAccount,
          password: newPassword,
        }));
      }}
    />
  );
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

export default function App() {
  const [registeredAccount, setRegisteredAccount] = useState(null);
  const [pendingAccount, setPendingAccount] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);

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

      return nextAccount;
    });
  };

  const handleDeleteAccount = () => {
    setPendingAccount(null);
    setActiveAccount(null);
    setRegisteredAccount(null);
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
    setActiveAccount(null);

    return enrollment;
  };

  const handleVerifyRegistrationOtp = async ({ enrollmentId, otp, accountDraft }) => {
    const session = await verifyRegistrationOtp({
      enrollmentId,
      otp,
    });

    const verifiedAccount = buildMobileAccountProfile({
      session,
      password: accountDraft?.password ?? pendingAccount?.password ?? '',
      draftAccount: accountDraft ?? pendingAccount ?? undefined,
      existingAccount: registeredAccount,
    });

    rememberKnownAccount(verifiedAccount);
    setActiveAccount(verifiedAccount);
    setPendingAccount(null);

    return verifiedAccount;
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

    rememberKnownAccount(nextAccount);
    setActiveAccount(nextAccount);
    setPendingAccount(null);

    return nextAccount;
  };

  const handleOtpVerified = (otpParams) => {
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
      handleDeleteAccount();

      return {
        status: 'success',
        purpose: 'deleteAccount',
        nextRoute: 'Landing',
        resetStack: true,
      };
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
    activeAccount,
    setPendingAccount,
    setActiveAccount,
    syncAccount,
    handleDeleteAccount,
    handleRegisterRequest,
    handleVerifyRegistrationOtp,
    handleLoginRequest,
    handleOtpVerified,
  };

  return (
    <View style={styles.appRoot}>
      <StatusBar style="light" backgroundColor={colors.background} translucent={false} />
      <AppSessionContext.Provider value={appSessionContextValue}>
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            initialRouteName="Landing"
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

            <Stack.Screen name="VehicleLifecycleScreen">
            {(props) => (
              <FeatureModuleScreen
                {...props}
                title="Vehicle Lifecycle"
                subtitle="View your vehicle’s complete service and insurance timeline."
                bullets={[
                  'Check service milestones and repair history.',
                  'Review insurance touchpoints across the ownership journey.',
                  'Follow a complete status timeline for your vehicle.',
                ]}
              />
            )}
            </Stack.Screen>

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

            <Stack.Screen name="InsuranceInquiryScreen">
            {(props) => (
              <FeatureModuleScreen
                {...props}
                title="Insurance Inquiry"
                subtitle="Request quotations and track your insurance application status."
                bullets={[
                  'Submit quote requests from one guided flow.',
                  'Track policy inquiry updates and approvals.',
                  'Keep insurance communication tied to the vehicle lifecycle.',
                ]}
              />
            )}
            </Stack.Screen>

            <Stack.Screen name="ChatbotScreen">
            {(props) => (
              <FeatureModuleScreen
                {...props}
                title="Ask AutoCare"
                subtitle="Objective 10 chatbot support for quick service and account assistance."
                bullets={[
                  'Ask for help with bookings, services, and account tools.',
                  'Get guided responses for insurance and loyalty questions.',
                  'This mock screen represents the chatbot integration point.',
                ]}
              />
            )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </AppSessionContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
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
