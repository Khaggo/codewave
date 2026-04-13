import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  editable = true,
  icon,
  fieldStyle,
}) {
  return (
    <View style={[styles.fieldWrap, fieldStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          error && styles.inputShellError,
          !editable && styles.inputShellDisabled,
        ]}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={18} color="#8B8B8B" style={styles.inputIcon} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6F6F74"
          style={styles.input}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          selectionColor={colors.primary}
          editable={editable}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Notice({ tone = 'info', text }) {
  if (!text) {
    return null;
  }

  return (
    <View style={[styles.notice, tone === 'success' ? styles.noticeSuccess : styles.noticeInfo]}>
      <MaterialCommunityIcons
        name={tone === 'success' ? 'shield-check-outline' : 'information-outline'}
        size={16}
        color={tone === 'success' ? '#A7F3D0' : '#FFD39F'}
      />
      <Text style={[styles.noticeText, tone === 'success' ? styles.noticeTextSuccess : styles.noticeTextInfo]}>
        {text}
      </Text>
    </View>
  );
}

function HeroStat({ value, label, showDivider = false }) {
  return (
    <View style={styles.heroStatItem}>
      {showDivider ? <Text style={styles.heroStatDivider}>||</Text> : null}
      <View>
        <Text style={styles.heroStatValue}>{value}</Text>
        <Text style={styles.heroStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TrustPill({ icon, label }) {
  return (
    <View style={styles.trustPill}>
      <MaterialCommunityIcons name={icon} size={14} color="#FFB55C" />
      <Text style={styles.trustPillText}>{label}</Text>
    </View>
  );
}

export default function AdminAuthPortal({
  backgroundSource,
  currentForm,
  onOpenForm,
  heroStats,
  loginForm,
  loginErrors,
  onLoginChange,
  onLoginSubmit,
  otpCode,
  otpError,
  otpMessage,
  isLoading,
  pendingEmail,
  onOtpChange,
  onOtpSubmit,
  notice,
}) {
  const { width } = useWindowDimensions();
  const showHeroPanel = width >= 840;
  const isCompact = width < 840;
  const isOtpMode = currentForm === 'otp';

  const renderLogin = () => (
    <View style={styles.formCard}>
      <Field
        label="Email Address"
        value={loginForm.email}
        onChangeText={(value) => onLoginChange('email', value)}
        placeholder="admin@cruiserscrib.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={loginErrors.email}
        icon="email-outline"
        fieldStyle={styles.firstField}
      />
      <Field
        label="Password"
        value={loginForm.password}
        onChangeText={(value) => onLoginChange('password', value)}
        placeholder="Enter your password"
        secureTextEntry
        autoCapitalize="none"
        error={loginErrors.password}
        icon="lock-outline"
      />
      <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
      <Notice tone={notice?.tone} text={notice?.text} />
      <Pressable style={styles.primaryButton} onPress={onLoginSubmit}>
        <Text style={styles.primaryButtonText}>SIGN IN</Text>
      </Pressable>
      <Text style={styles.footerHint}>Protected admin access for service operations and booking oversight.</Text>
    </View>
  );

  const renderOtp = () => (
    <View style={styles.formCard}>
      <View style={styles.otpCard}>
        <Text style={styles.otpLabel}>Prototype Security Code</Text>
        <Text style={styles.otpValue}>123456</Text>
        <Text style={styles.otpMeta}>
          Enter the OTP for {pendingEmail || 'your admin account'}. This browser will stay verified until sign out.
        </Text>
      </View>
      <Field
        label="6-Digit OTP"
        value={otpCode}
        onChangeText={onOtpChange}
        placeholder="123456"
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={6}
        error={otpError}
        icon="shield-key-outline"
        fieldStyle={styles.firstField}
      />
      <Notice tone={otpMessage ? 'success' : notice?.tone} text={otpMessage || notice?.text} />
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingStateText}>Securing session...</Text>
        </View>
      ) : null}
      <Pressable
        style={[styles.primaryButton, styles.loadingButton, isLoading && styles.buttonDisabled]}
        onPress={onOtpSubmit}
        disabled={isLoading}
      >
        <Text style={styles.primaryButtonText}>{isLoading ? 'PROCESSING...' : 'VERIFY ACCESS'}</Text>
      </Pressable>
      <Pressable onPress={() => onOpenForm('login')}>
        <Text style={styles.inlineLink}>Back to Login</Text>
      </Pressable>
    </View>
  );

  return (
    <ImageBackground
      source={backgroundSource}
      resizeMode="cover"
      style={styles.shellBackground}
      imageStyle={styles.shellBackgroundImage}
    >
      <View style={styles.shellBackgroundTint} />
      <View style={[styles.shell, isCompact && styles.shellStacked]}>
        {showHeroPanel ? (
          <View style={styles.heroPanel}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroGlow} />
            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View style={styles.brandBadge}>
                  <MaterialCommunityIcons name="shield-car" size={16} color="#FFB55C" />
                  <Text style={styles.brandBadgeText}>Cruisers Crib Operations</Text>
                </View>

                <View style={styles.heroCopyBlock}>
                  <Text style={styles.heroLogo}>CRUISERS CRIB</Text>
                  <Text style={styles.heroTagline}>Welcome Back, Admin.</Text>
                  <Text style={styles.heroDescription}>
                    Manage users, bookings, and predictive service alerts from a focused control surface built for daily operations.
                  </Text>
                </View>

                <View style={styles.trustRow}>
                  <TrustPill icon="shield-check-outline" label="Verified Access" />
                </View>
              </View>

              <View style={styles.heroBottom}>
                <HeroStat value={heroStats.pendingBookings} label="Pending" />
                <HeroStat value={heroStats.aiAlerts} label="AI Alerts" showDivider />
                <HeroStat value={heroStats.activeCustomers} label="Customers" showDivider />
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.formPanel, isCompact && styles.formPanelCompact]}>
          <View style={styles.formPanelOverlay} />
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={[styles.formPanelContent, isCompact && styles.formPanelContentCompact]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formShell}>
              <View style={styles.formSurface}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Admin Access Portal</Text>
                </View>

                <Text style={styles.panelTitle}>{isOtpMode ? 'Verify Access' : 'Admin Login'}</Text>
                <Text style={styles.panelSubtitle}>
                  {isOtpMode
                    ? 'Confirm the one-time security code to continue to the dashboard.'
                    : 'Use your administrator credentials to open the Cruisers Crib control center.'}
                </Text>

                <View style={styles.formInner}>
                  {isOtpMode ? renderOtp() : renderLogin()}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  shellBackground: {
    flex: 1,
    backgroundColor: '#050505',
  },
  shellBackgroundImage: {
    ...Platform.select({
      web: {
        objectFit: 'cover',
        objectPosition: 'center',
      },
    }),
  },
  shellBackgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    ...Platform.select({
      web: {
        backgroundImage:
          'linear-gradient(180deg, rgba(8,8,10,0.16) 0%, rgba(8,8,10,0.26) 100%)',
      },
    }),
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  shellStacked: {
    flexDirection: 'column',
  },
  heroPanel: {
    flex: 1.25,
    minHeight: 460,
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.10)',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.14) 100%)',
      },
    }),
  },
  heroGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 140, 0, 0.03)',
    right: -90,
    bottom: -50,
  },
  heroContent: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 58,
    paddingVertical: 54,
  },
  heroTop: {
    flex: 1,
    justifyContent: 'center',
  },
  brandBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 92, 0.22)',
    backgroundColor: 'rgba(15, 15, 16, 0.38)',
    marginBottom: 28,
  },
  brandBadgeText: {
    color: '#FFE2BA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroCopyBlock: {
    maxWidth: 520,
  },
  heroLogo: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  heroTagline: {
    color: '#FFC37A',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 16,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.76)',
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 430,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 30,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 15, 16, 0.44)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 92, 0.16)',
  },
  trustPillText: {
    color: '#E5E5E5',
    fontSize: 12,
    fontWeight: '600',
  },
  heroBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 26,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroStatDivider: {
    color: '#FFB55C',
    fontSize: 14,
    fontWeight: '800',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  formPanel: {
    flex: 0.95,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
       
      },
    }),
  },
  formPanelCompact: {
    flex: 1,
  },
  formPanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        backgroundImage:
          'linear-gradient(90deg, rgba(6,6,7,0) 0%, rgba(6,6,7,0.14) 18%, rgba(6,6,7,0.4) 100%)',
      },
    }),
  },
  formScroll: {
    flex: 1,
  },
  formPanelContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 46,
    paddingVertical: 54,
  },
  formPanelContentCompact: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  formShell: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  formSurface: {
    width: '100%',
    backgroundColor: 'rgba(18, 18, 18, 0.36)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 24,
    paddingHorizontal: 30,
    paddingVertical: 30,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 20 },
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.25)',
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    marginBottom: 18,
  },
  badgeText: {
    color: '#FFB866',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  panelSubtitle: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 15,
    lineHeight: 25,
    marginBottom: 32,
  },
  formInner: {
    width: '100%',
  },
  formCard: {
    width: '100%',
  },
  fieldWrap: {
    marginBottom: 22,
  },
  firstField: {
    marginTop: 8,
  },
  fieldLabel: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 9,
    letterSpacing: 0.2,
  },
  inputShell: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    backgroundColor: 'rgba(24, 24, 27, 0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputShellError: {
    borderColor: 'rgba(248, 113, 113, 0.78)',
  },
  inputShellDisabled: {
    opacity: 0.7,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 0,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    color: '#F4A74B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 16,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  noticeInfo: {
    backgroundColor: 'rgba(49, 27, 9, 0.9)',
    borderColor: 'rgba(255, 140, 0, 0.18)',
  },
  noticeSuccess: {
    backgroundColor: 'rgba(12, 48, 33, 0.92)',
    borderColor: 'rgba(16, 185, 129, 0.18)',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  noticeTextInfo: {
    color: '#FFD3A0',
  },
  noticeTextSuccess: {
    color: '#C7F9DF',
  },
  otpCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(23, 23, 25, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  otpLabel: {
    color: '#FFBA67',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  otpValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: 10,
  },
  otpMeta: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 20,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#171719',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.12)',
  },
  loadingStateText: {
    color: '#FFD39E',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#F28123',
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#F58A15',
    shadowOpacity: 0.20,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  loadingButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.76,
  },
  primaryButtonText: {
    color: '#1C1103',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  inlineLink: {
    alignSelf: 'flex-start',
    color: '#FFBE73',
    fontSize: 13,
    fontWeight: '700',
  },
  footerHint: {
    color: '#8A8A93',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
