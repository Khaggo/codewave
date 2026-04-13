import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AdminAuthPortal from './src/components/AdminAuthPortal';
import ConfirmationModal from './src/components/ConfirmationModal';
import AdminDashboard from './src/screens/AdminDashboard';
import { colors } from './src/theme';
import {
  buildUsername,
  normalizeEmail,
  normalizePhoneNumber,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validatePhoneNumber,
} from './src/utils/validation';

const Stack = createStackNavigator();
const adminHeroBackground = require('./assets/bgadmin-2.jpg');
const OTP_CODE = '123456';
const VERIFIED_ADMIN_PREFIX = 'verified_admin_';
const STORAGE_KEYS = {
  activeAccount: 'autocare_admin_active_account',
  adminAccounts: 'autocare_admin_accounts',
  managedUsers: 'autocare_managed_users',
  serviceRequests: 'autocare_admin_service_requests',
};

const defaultAdminAccount = {
  id: 'admin-001',
  fullName: 'Cruisers Crib Administrator',
  department: 'Operations',
  email: 'admin@cruiserscrib.com',
  phoneNumber: '09123456780',
  username: 'admin',
  password: 'Admin@123',
  role: 'admin',
  isActive: true,
};

const initialManagedUsers = [
  {
    id: 'user-001',
    fullName: 'Jasper Sanchez',
    email: 'jasper@cruiserscrib.com',
    phoneNumber: '09123456789',
    vehicleModel: 'Toyota Vios',
    licensePlate: 'ABC-1234',
    isActive: true,
  },
  {
    id: 'user-002',
    fullName: 'Mia Rivera',
    email: 'mia@cruiserscrib.com',
    phoneNumber: '09182345671',
    vehicleModel: 'Honda City',
    licensePlate: 'QWE-5678',
    isActive: true,
  },
  {
    id: 'user-003',
    fullName: 'Ken Dela Cruz',
    email: 'ken@cruiserscrib.com',
    phoneNumber: '09987654321',
    vehicleModel: 'Ford Ranger',
    licensePlate: 'XYZ-9087',
    isActive: false,
  },
];

const initialServiceRequests = [
  {
    id: 'req-001',
    customerId: 'user-001',
    customerName: 'Jasper Sanchez',
    serviceType: 'Preventive Maintenance',
    vehicle: 'Toyota Vios',
    schedule: 'April 5, 2026 - 9:00 AM',
    status: 'Pending',
    notes: 'Requested oil change and brake inspection.',
  },
  {
    id: 'req-002',
    customerId: 'user-002',
    customerName: 'Mia Rivera',
    serviceType: 'Insurance Evaluation',
    vehicle: 'Honda City',
    schedule: 'April 6, 2026 - 1:30 PM',
    status: 'In Progress',
    notes: 'Needs quotation follow-up for comprehensive coverage.',
  },
  {
    id: 'req-003',
    customerId: 'user-003',
    customerName: 'Ken Dela Cruz',
    serviceType: 'Interior Detailing',
    vehicle: 'Ford Ranger',
    schedule: 'April 7, 2026 - 10:00 AM',
    status: 'Completed',
    notes: 'Vehicle released and payment confirmed.',
  },
];

const defaultLoginForm = { email: '', password: '' };
const defaultRegisterForm = {
  fullName: '',
  department: '',
  phoneNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
};
const defaultForgotPasswordForm = { email: '' };
const defaultResetPasswordForm = { password: '', confirmPassword: '' };

const getVerifiedAdminKey = (email) => `${VERIFIED_ADMIN_PREFIX}${normalizeEmail(email)}`;

const readStorage = (key) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
};

const writeStorage = (key, value) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
};

const removeStorage = (key) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
};

export default function App() {
  const redirectTimeoutRef = useRef(null);
  const [isHydrated, setIsHydrated] = useState(Platform.OS !== 'web');
  const [currentForm, setCurrentForm] = useState('login');
  const [adminAccounts, setAdminAccounts] = useState([defaultAdminAccount]);
  const [managedUsers, setManagedUsers] = useState(initialManagedUsers);
  const [serviceRequests, setServiceRequests] = useState(initialServiceRequests);
  const [activeAccount, setActiveAccount] = useState(null);
  const [pendingAuth, setPendingAuth] = useState(null);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
  const [forgotPasswordForm, setForgotPasswordForm] = useState(defaultForgotPasswordForm);
  const [resetPasswordForm, setResetPasswordForm] = useState(defaultResetPasswordForm);
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loginErrors, setLoginErrors] = useState({});
  const [registerErrors, setRegisterErrors] = useState({});
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [resetPasswordErrors, setResetPasswordErrors] = useState({});
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    intent: null,
  });
  const heroStats = {
    pendingBookings: serviceRequests.filter((request) => request.status === 'Pending').length,
    aiAlerts: 15,
    activeCustomers: managedUsers.filter((user) => user.isActive).length,
  };

  useEffect(() => () => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const previous = {
      htmlHeight: html.style.height,
      bodyMargin: body.style.margin,
      bodyMinHeight: body.style.minHeight,
      rootHeight: root?.style.height,
    };

    html.style.height = '100%';
    body.style.height = '100%';
    body.style.margin = '0';
    body.style.minHeight = '100%';

    if (root) {
      root.style.height = '100%';
    }

    return () => {
      html.style.height = previous.htmlHeight;
      body.style.margin = previous.bodyMargin;
      body.style.minHeight = previous.bodyMinHeight;

      if (root) {
        root.style.height = previous.rootHeight || '';
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    try {
      const storedAccounts = readStorage(STORAGE_KEYS.adminAccounts);
      const storedUsers = readStorage(STORAGE_KEYS.managedUsers);
      const storedRequests = readStorage(STORAGE_KEYS.serviceRequests);
      const storedActiveAccount = readStorage(STORAGE_KEYS.activeAccount);

      if (storedAccounts) {
        const parsedAccounts = JSON.parse(storedAccounts);
        if (Array.isArray(parsedAccounts) && parsedAccounts.length > 0) {
          setAdminAccounts(parsedAccounts);
        }
      }

      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        if (Array.isArray(parsedUsers)) {
          setManagedUsers(parsedUsers);
        }
      }

      if (storedRequests) {
        const parsedRequests = JSON.parse(storedRequests);
        if (Array.isArray(parsedRequests)) {
          setServiceRequests(parsedRequests);
        }
      }

      if (storedActiveAccount) {
        setActiveAccount(JSON.parse(storedActiveAccount));
      }
    } catch (error) {
      console.warn('Failed to restore admin portal state.', error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isHydrated) {
      return;
    }

    writeStorage(STORAGE_KEYS.adminAccounts, JSON.stringify(adminAccounts));
  }, [adminAccounts, isHydrated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isHydrated) {
      return;
    }

    writeStorage(STORAGE_KEYS.managedUsers, JSON.stringify(managedUsers));
  }, [isHydrated, managedUsers]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isHydrated) {
      return;
    }

    writeStorage(STORAGE_KEYS.serviceRequests, JSON.stringify(serviceRequests));
  }, [isHydrated, serviceRequests]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isHydrated) {
      return;
    }

    if (activeAccount) {
      writeStorage(STORAGE_KEYS.activeAccount, JSON.stringify(activeAccount));
      return;
    }

    removeStorage(STORAGE_KEYS.activeAccount);
  }, [activeAccount, isHydrated]);

  useEffect(() => {
    if (!activeAccount) {
      return;
    }

    const matchedAccount = adminAccounts.find((account) => account.email === activeAccount.email);

    if (!matchedAccount || matchedAccount.isActive === false) {
      setActiveAccount(null);
      return;
    }

    if (matchedAccount !== activeAccount) {
      setActiveAccount(matchedAccount);
    }
  }, [activeAccount, adminAccounts]);

  const clearAuthFeedback = () => {
    setNotice(null);
    setOtpError('');
    setOtpMessage('');
    setIsLoading(false);
    setLoginErrors({});
    setRegisterErrors({});
    setForgotPasswordError('');
    setResetPasswordErrors({});
  };

  const resetAuthForms = () => {
    setLoginForm(defaultLoginForm);
    setRegisterForm(defaultRegisterForm);
    setForgotPasswordForm(defaultForgotPasswordForm);
    setResetPasswordForm(defaultResetPasswordForm);
    setResetTargetEmail('');
    setPendingAuth(null);
    setOtpCode('');
  };

  const openForm = (formKey) => {
    clearAuthFeedback();
    setCurrentForm(formKey);

    if (formKey !== 'otp') {
      setPendingAuth(null);
      setOtpCode('');
    }
  };

  const handleLoginChange = (key, value) => {
    setLoginForm((current) => ({ ...current, [key]: value }));
    setLoginErrors((current) => ({ ...current, [key]: '' }));
    setNotice(null);
  };

  const handleRegisterChange = (key, value) => {
    const nextValue = key === 'phoneNumber' ? normalizePhoneNumber(value) : value;
    setRegisterForm((current) => ({ ...current, [key]: nextValue }));
    setRegisterErrors((current) => ({ ...current, [key]: '' }));
    setNotice(null);
  };

  const handleForgotPasswordChange = (value) => {
    setForgotPasswordForm({ email: value });
    setForgotPasswordError('');
    setNotice(null);
  };

  const handleResetPasswordChange = (key, value) => {
    setResetPasswordForm((current) => ({ ...current, [key]: value }));
    setResetPasswordErrors((current) => ({ ...current, [key]: '' }));
    setNotice(null);
  };

  const handleOtpChange = (value) => {
    setOtpCode(value.replace(/\D/g, '').slice(0, 6));
    setOtpError('');
    setOtpMessage('');
  };

  const navigateToDashboard = (navigation, account) => {
    setActiveAccount(account);
    navigation.reset({
      index: 0,
      routes: [{ name: 'AdminDashboard' }],
    });
  };

  const handleLoginSubmit = (navigation) => {
    clearAuthFeedback();

    const nextErrors = validateLoginForm(loginForm);
    if (Object.keys(nextErrors).length > 0) {
      setLoginErrors(nextErrors);
      return;
    }

    const normalizedEmail = normalizeEmail(loginForm.email);
    const matchedAccount = adminAccounts.find(
      (account) => account.email === normalizedEmail && account.role === 'admin',
    );

    if (!matchedAccount || matchedAccount.password !== loginForm.password) {
      setLoginErrors({ email: '', password: 'Incorrect admin email or password.' });
      return;
    }

    if (matchedAccount.isActive === false) {
      setLoginErrors({ email: '', password: 'This admin account is currently inactive.' });
      return;
    }

    if (readStorage(getVerifiedAdminKey(normalizedEmail)) === 'true') {
      setNotice({ tone: 'success', text: 'Trusted browser verified. Redirecting to the dashboard...' });
      navigateToDashboard(navigation, matchedAccount);
      return;
    }

    setPendingAuth({ purpose: 'login', account: matchedAccount });
    setOtpCode('');
    setOtpMessage('Credentials accepted. Enter the one-time prototype code to continue.');
    setCurrentForm('otp');
  };

  const handleRegisterSubmit = () => {
    clearAuthFeedback();
    const nextErrors = {};
    const normalizedEmail = normalizeEmail(registerForm.email);

    if (!registerForm.fullName.trim()) nextErrors.fullName = 'Enter the admin full name.';
    if (!registerForm.department.trim()) nextErrors.department = 'Enter the department.';

    const phoneError = validatePhoneNumber(registerForm.phoneNumber);
    if (phoneError) nextErrors.phoneNumber = phoneError;

    const emailError = validateEmail(registerForm.email);
    if (emailError) nextErrors.email = emailError;

    const passwordError = validatePassword(registerForm.password);
    if (passwordError) nextErrors.password = passwordError;

    if (!registerForm.confirmPassword) {
      nextErrors.confirmPassword = 'Re-enter the password.';
    } else if (registerForm.confirmPassword !== registerForm.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (adminAccounts.some((account) => account.email === normalizedEmail)) {
      nextErrors.email = 'An admin account with this email already exists.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setRegisterErrors(nextErrors);
      return;
    }

    const newAdminAccount = {
      id: `admin-${Date.now()}`,
      fullName: registerForm.fullName.trim(),
      department: registerForm.department.trim(),
      email: normalizedEmail,
      phoneNumber: normalizePhoneNumber(registerForm.phoneNumber),
      username: buildUsername(registerForm.email, registerForm.fullName, registerForm.department),
      password: registerForm.password,
      role: 'admin',
      isActive: true,
    };

    setPendingAuth({ purpose: 'register', account: newAdminAccount });
    setOtpCode('');
    setOtpMessage('Admin details saved. Enter the OTP code to finish account setup.');
    setCurrentForm('otp');
  };

  const handleOtpSubmit = (navigation) => {
    if (!pendingAuth?.account) {
      setOtpError('Your verification session expired. Return to login and try again.');
      return;
    }

    if (otpCode !== OTP_CODE) {
      setOtpError('Incorrect verification code. Use 123456 for this prototype.');
      return;
    }

    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    setIsLoading(true);
    setOtpError('');
    setOtpMessage('Verification successful. Opening the admin dashboard...');

    redirectTimeoutRef.current = setTimeout(() => {
      const verifiedAccount = pendingAuth.account;

      if (pendingAuth.purpose === 'register') {
        setAdminAccounts((current) => [...current, verifiedAccount]);
      }

      writeStorage(getVerifiedAdminKey(verifiedAccount.email), 'true');
      setIsLoading(false);
      resetAuthForms();
      setCurrentForm('login');
      navigateToDashboard(navigation, verifiedAccount);
    }, 1500);
  };

  const handleForgotPasswordSubmit = () => {
    clearAuthFeedback();
    const emailError = validateEmail(forgotPasswordForm.email);

    if (emailError) {
      setForgotPasswordError(emailError);
      return;
    }

    const normalizedEmail = normalizeEmail(forgotPasswordForm.email);
    const matchedAccount = adminAccounts.find((account) => account.email === normalizedEmail);

    if (!matchedAccount) {
      setForgotPasswordError('No admin account matches this email address.');
      return;
    }

    setResetTargetEmail(normalizedEmail);
    setResetPasswordForm(defaultResetPasswordForm);
    setNotice({ tone: 'info', text: 'Enter a strong new password for this admin account.' });
    setCurrentForm('reset_password');
  };

  const handleResetPasswordSubmit = () => {
    clearAuthFeedback();
    const nextErrors = {};
    const passwordError = validatePassword(resetPasswordForm.password);

    if (passwordError) {
      nextErrors.password = passwordError;
    }

    if (!resetPasswordForm.confirmPassword) {
      nextErrors.confirmPassword = 'Re-enter the new password.';
    } else if (resetPasswordForm.confirmPassword !== resetPasswordForm.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setResetPasswordErrors(nextErrors);
      return;
    }

    setAdminAccounts((current) =>
      current.map((account) =>
        account.email === resetTargetEmail
          ? { ...account, password: resetPasswordForm.password }
          : account,
      ),
    );

    removeStorage(getVerifiedAdminKey(resetTargetEmail));
    setLoginForm({ email: resetTargetEmail, password: '' });
    setResetPasswordForm(defaultResetPasswordForm);
    setCurrentForm('login');
    setNotice({
      tone: 'success',
      text: 'Password updated. Sign in again and complete OTP verification on this browser.',
    });
  };

  const handleToggleUserStatus = (userId) => {
    setManagedUsers((current) =>
      current.map((user) =>
        user.id === userId ? { ...user, isActive: user.isActive === false } : user,
      ),
    );
  };

  const handleAdvanceRequestStatus = (requestId) => {
    const statusFlow = ['Pending', 'In Progress', 'Completed'];

    setServiceRequests((current) =>
      current.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        const currentIndex = statusFlow.indexOf(request.status);
        return {
          ...request,
          status: statusFlow[(currentIndex + 1) % statusFlow.length],
        };
      }),
    );
  };

  const openConfirmation = (dialog) => {
    setConfirmationDialog({
      visible: true,
      title: dialog.title,
      message: dialog.message,
      confirmLabel: dialog.confirmLabel || 'Confirm',
      intent: dialog.intent,
    });
  };

  const closeConfirmation = () => {
    setConfirmationDialog({
      visible: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      intent: null,
    });
  };

  const handleConfirmAction = () => {
    const { intent } = confirmationDialog;

    if (!intent) {
      closeConfirmation();
      return;
    }

    if (intent.type === 'delete-user') {
      setManagedUsers((current) => current.filter((user) => user.id !== intent.userId));
      setServiceRequests((current) =>
        current.filter((request) => request.customerId !== intent.userId),
      );
    }

    if (intent.type === 'reset-data') {
      setManagedUsers(initialManagedUsers);
      setServiceRequests(initialServiceRequests);
    }

    closeConfirmation();
  };

  const handleSignOut = (navigation) => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    if (activeAccount?.email) {
      removeStorage(getVerifiedAdminKey(activeAccount.email));
    }

    setActiveAccount(null);
    resetAuthForms();
    clearAuthFeedback();
    setCurrentForm('login');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  };

  if (!isHydrated) {
    return (
      <View style={styles.bootScreen}>
        <Text style={styles.bootText}>Restoring admin portal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.appRoot}>
      <StatusBar style="light" backgroundColor="#050505" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={activeAccount ? 'AdminDashboard' : 'Landing'}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Landing">
            {(props) => (
              <AdminAuthPortal
                backgroundSource={adminHeroBackground}
                currentForm={currentForm}
                onOpenForm={openForm}
                heroStats={heroStats}
                loginForm={loginForm}
                loginErrors={loginErrors}
                onLoginChange={handleLoginChange}
                onLoginSubmit={() => handleLoginSubmit(props.navigation)}
                otpCode={otpCode}
                otpError={otpError}
                otpMessage={otpMessage}
                isLoading={isLoading}
                pendingEmail={pendingAuth?.account?.email || ''}
                onOtpChange={handleOtpChange}
                onOtpSubmit={() => handleOtpSubmit(props.navigation)}
                notice={notice}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="AdminDashboard">
            {(props) => (
              <AdminDashboard
                {...props}
                account={activeAccount || defaultAdminAccount}
                users={managedUsers}
                serviceRequests={serviceRequests}
                onToggleUserStatus={handleToggleUserStatus}
                onRequestDeleteUser={(user) =>
                  openConfirmation({
                    title: 'Delete Customer Account?',
                    message: `Delete ${user.fullName} from the admin portal? This also removes linked service requests.`,
                    confirmLabel: 'Delete Account',
                    intent: { type: 'delete-user', userId: user.id },
                  })
                }
                onAdvanceRequestStatus={handleAdvanceRequestStatus}
                onRequestResetData={() =>
                  openConfirmation({
                    title: 'Reset Demo Data?',
                    message: 'This restores the default customer list and service requests for the admin portal.',
                    confirmLabel: 'Reset Data',
                    intent: { type: 'reset-data' },
                  })
                }
                onSignOut={() => handleSignOut(props.navigation)}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>

      <ConfirmationModal
        visible={confirmationDialog.visible}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmLabel={confirmationDialog.confirmLabel}
        onCancel={closeConfirmation}
        onConfirm={handleConfirmAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#050505',
    ...Platform.select({
      web: {
        minHeight: '100vh',
      },
    }),
  },
  bootScreen: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
});
