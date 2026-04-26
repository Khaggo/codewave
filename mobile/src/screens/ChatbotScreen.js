import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ApiError } from '../lib/authClient';
import {
  appendManualEscalationToMessage,
  createCustomerChatbotEscalation,
  customerChatbotQuickPrompts,
  sendCustomerChatbotMessage,
} from '../lib/chatbotClient';
import { colors, radius } from '../theme';

const buildCustomerChatbotErrorMessage = (error, fallbackMessage) =>
  error instanceof ApiError && error.message ? error.message : fallbackMessage;

function SupportStatePanel({
  icon,
  title,
  message,
  tone = 'default',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  loading = false,
}) {
  return (
    <View
      style={[
        styles.statePanel,
        tone === 'danger' && styles.statePanelDanger,
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
        <View style={styles.statePanelActions}>
          <TouchableOpacity
            style={styles.statePanelPrimaryAction}
            onPress={onAction}
            activeOpacity={0.88}
          >
            <Text style={styles.statePanelPrimaryActionText}>{actionLabel}</Text>
          </TouchableOpacity>

          {secondaryActionLabel && onSecondaryAction ? (
            <TouchableOpacity
              style={styles.statePanelSecondaryAction}
              onPress={onSecondaryAction}
              activeOpacity={0.88}
            >
              <Text style={styles.statePanelSecondaryActionText}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PromptChip({ item, onPress, disabled = false }) {
  return (
    <TouchableOpacity
      style={[styles.promptChip, disabled && styles.promptChipDisabled]}
      onPress={() => onPress(item.prompt)}
      activeOpacity={0.88}
      disabled={disabled}
    >
      <Text style={[styles.promptChipLabel, disabled && styles.promptChipLabelDisabled]}>
        {item.label}
      </Text>
      <Text style={styles.promptChipHint}>{item.prompt}</Text>
    </TouchableOpacity>
  );
}

function MessageBadge({ label, tone = 'default' }) {
  return (
    <View
      style={[
        styles.messageBadge,
        tone === 'success' && styles.messageBadgeSuccess,
        tone === 'warning' && styles.messageBadgeWarning,
      ]}
    >
      <Text style={styles.messageBadgeText}>{label}</Text>
    </View>
  );
}

function LookupCard({ lookup, onAction }) {
  if (!lookup) {
    return null;
  }

  return (
    <View style={styles.lookupCard}>
      <View style={styles.lookupCardHeader}>
        <Text style={styles.lookupCardTitle}>{lookup.lookupTypeLabel}</Text>
        <MessageBadge label={lookup.statusLabel} tone="success" />
      </View>
      <Text style={styles.lookupCardText}>{lookup.message}</Text>
      {lookup.referenceId ? (
        <Text style={styles.lookupCardReference}>Reference: {lookup.referenceId}</Text>
      ) : null}
      {onAction ? (
        <TouchableOpacity style={styles.lookupActionButton} onPress={onAction} activeOpacity={0.88}>
          <Text style={styles.lookupActionButtonText}>Open related screen</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EscalationCard({ escalation, title = 'Staff follow-up opened' }) {
  if (!escalation) {
    return null;
  }

  return (
    <View style={styles.escalationCard}>
      <View style={styles.escalationHeader}>
        <Text style={styles.escalationTitle}>{title}</Text>
        <MessageBadge label={escalation.statusLabel} tone="warning" />
      </View>
      <Text style={styles.escalationText}>
        Reason: {escalation.reasonLabel}. Created {escalation.createdAtLabel}.
      </Text>
      {escalation.intentKey ? (
        <Text style={styles.escalationMeta}>Intent: {escalation.intentLabel}</Text>
      ) : null}
      <Text style={styles.escalationMeta}>Escalation ID: {escalation.id}</Text>
    </View>
  );
}

function ConversationCard({
  item,
  onSupportAction,
  onEscalate,
  escalationSubmitting = false,
}) {
  const deepLinkLabel = item.supportAction?.label ?? 'Open related screen';
  const visibleEscalation = item.escalation ?? item.manualEscalation;
  const canEscalate = Boolean(item.id && !visibleEscalation);

  return (
    <View style={styles.conversationCard}>
      <View style={styles.conversationHeader}>
        <View style={styles.conversationHeaderCopy}>
          <Text style={styles.conversationPromptLabel}>You asked</Text>
          <Text style={styles.conversationPrompt}>{item.prompt}</Text>
        </View>
        <MessageBadge
          label={item.responseTypeLabel}
          tone={
            item.responseType === 'escalation'
              ? 'warning'
              : item.responseType === 'lookup'
                ? 'success'
                : 'default'
          }
        />
      </View>

      <View style={styles.responseBlock}>
        <Text style={styles.responseLabel}>{item.matchedIntentLabel}</Text>
        <Text style={styles.responseText}>{item.responseText}</Text>
      </View>

      <LookupCard lookup={item.lookup} onAction={item.supportAction ? onSupportAction : null} />
      <EscalationCard
        escalation={item.escalation}
        title={item.responseType === 'escalation' ? 'Escalated automatically' : 'Staff follow-up opened'}
      />
      <EscalationCard
        escalation={item.manualEscalation}
        title="Manual staff follow-up opened"
      />

      <View style={styles.conversationMetaRow}>
        <Text style={styles.conversationMetaText}>{item.createdAtLabel}</Text>
        {item.supportAction ? (
          <TouchableOpacity
            style={styles.inlineActionButton}
            onPress={onSupportAction}
            activeOpacity={0.88}
          >
            <Text style={styles.inlineActionButtonText}>{deepLinkLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {canEscalate ? (
          <TouchableOpacity
            style={styles.inlineSecondaryButton}
            onPress={onEscalate}
            activeOpacity={0.88}
            disabled={escalationSubmitting}
          >
            {escalationSubmitting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.inlineSecondaryButtonText}>Need staff follow-up</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function ChatbotScreen({ account, navigation }) {
  const accessToken = account?.accessToken ?? null;
  const hasSession = Boolean(accessToken && account?.userId);
  const isCustomerSession = !account?.role || account?.role === 'customer';
  const [prompt, setPrompt] = useState('');
  const [conversationLog, setConversationLog] = useState([]);
  const [sendState, setSendState] = useState({ status: 'idle', message: '' });
  const [escalationState, setEscalationState] = useState({
    status: 'idle',
    message: '',
    conversationId: null,
  });

  const latestConversation = conversationLog[0] ?? null;
  const quickPromptCatalog = useMemo(
    () => customerChatbotQuickPrompts,
    [],
  );

  const navigateFromSupportAction = (supportAction) => {
    if (!supportAction) {
      return;
    }

    if (
      supportAction.type === 'open_booking_tracking' ||
      supportAction.type === 'open_booking_create'
    ) {
      navigation.navigate('Menu', {
        supportJump: {
          id: `${Date.now()}-${supportAction.type}`,
          activeTab: 'notifications',
          bookingMode:
            supportAction.type === 'open_booking_create' ? 'book' : 'track',
          selectedHistoryBookingId:
            supportAction.type === 'open_booking_tracking'
              ? supportAction.referenceId ?? null
              : null,
        },
      });
      return;
    }

    if (supportAction.type === 'open_insurance_tracking') {
      navigation.navigate('InsuranceInquiryScreen', {
        vehicleId: account?.primaryVehicleId ?? null,
        inquiryId: supportAction.referenceId ?? null,
      });
    }
  };

  const submitPrompt = async (nextPrompt) => {
    const normalizedPrompt = String(nextPrompt ?? prompt).trim();

    if (!hasSession) {
      setSendState({
        status: 'blocked',
        message: 'Sign in first so the support assistant can answer account-aware booking and insurance questions.',
      });
      return;
    }

    if (!isCustomerSession) {
      setSendState({
        status: 'blocked',
        message: 'This customer support surface is only for customer mobile sessions.',
      });
      return;
    }

    if (normalizedPrompt.length < 3) {
      setSendState({
        status: 'validation',
        message: 'Enter at least three characters so the deterministic FAQ router has enough context.',
      });
      return;
    }

    setSendState({ status: 'submitting', message: '' });

    try {
      const nextConversation = await sendCustomerChatbotMessage({
        message: normalizedPrompt,
        accessToken,
      });

      setConversationLog((currentLog) => [nextConversation, ...currentLog]);
      setPrompt('');
      setSendState({
        status: 'saved',
        message:
          nextConversation.responseType === 'escalation'
            ? 'Your prompt was escalated because it did not match an approved FAQ flow.'
            : 'Support response loaded from the live chatbot routes.',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSendState({
          status: 'blocked',
          message: 'Your session expired before support could load. Sign in again and retry.',
        });
        return;
      }

      setSendState({
        status: 'error',
        message: buildCustomerChatbotErrorMessage(
          error,
          'We could not process that support question right now.',
        ),
      });
    }
  };

  const handleManualEscalation = async (conversation) => {
    if (!conversation?.id || !hasSession) {
      return;
    }

    setEscalationState({
      status: 'submitting',
      message: '',
      conversationId: conversation.id,
    });

    try {
      const escalation = await createCustomerChatbotEscalation({
        prompt: conversation.prompt,
        reason: 'customer_requested_follow_up',
        conversationId: conversation.id,
        accessToken,
      });

      setConversationLog((currentLog) =>
        appendManualEscalationToMessage({
          messages: currentLog,
          conversationId: conversation.id,
          escalation,
        }),
      );
      setEscalationState({
        status: 'saved',
        message: 'A staff follow-up was opened for your selected conversation.',
        conversationId: conversation.id,
      });
    } catch (error) {
      setEscalationState({
        status: 'error',
        message: buildCustomerChatbotErrorMessage(
          error,
          'We could not open a staff follow-up right now.',
        ),
        conversationId: conversation.id,
      });
    }
  };

  const heroSubtitle = hasSession
    ? 'Ask deterministic support questions about booking, insurance, and workshop guidance without drifting into unsupported AI behavior.'
    : 'You can open customer support from the landing page, but account-aware booking and insurance answers need a signed-in customer session.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.eyebrow}>CUSTOMER SUPPORT</Text>
            <Text style={styles.title}>Ask AutoCare</Text>
            <Text style={styles.subtitle}>{heroSubtitle}</Text>
            <View style={styles.routePill}>
              <Text style={styles.routePillText}>
                Live routes: chatbot message routing and manual escalation handoff
              </Text>
            </View>
          </View>

          {!isCustomerSession ? (
            <SupportStatePanel
              icon="shield-alert-outline"
              title="Customer-only support surface"
              message="This chatbot screen is reserved for customer mobile sessions. Staff review and intent management stay out of scope here."
              tone="danger"
            />
          ) : null}

          {!hasSession ? (
            <>
              <SupportStatePanel
                icon="lock-outline"
                title="Sign in for account-aware support"
                message="The live chatbot can look up your latest booking or insurance inquiry only after customer authentication. Registration and OTP help stay informational here and do not bypass auth."
                tone="danger"
                actionLabel="Sign in"
                onAction={() => navigation.navigate('Login')}
                secondaryActionLabel="Create account"
                onSecondaryAction={() => navigation.navigate('Register')}
              />
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Sign-in and activation tips</Text>
                <Text style={styles.sectionSubtitle}>
                  Use the customer auth flow first, then come back here for personalized support.
                </Text>
                <View style={styles.tipRow}>
                  <MaterialCommunityIcons name="numeric-1-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.tipText}>Create a customer account from the Register screen.</Text>
                </View>
                <View style={styles.tipRow}>
                  <MaterialCommunityIcons name="numeric-2-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.tipText}>Verify the email OTP to activate the account safely.</Text>
                </View>
                <View style={styles.tipRow}>
                  <MaterialCommunityIcons name="numeric-3-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.tipText}>Sign in again so booking and insurance lookups can stay customer-owned.</Text>
                </View>
              </View>
            </>
          ) : null}

          {hasSession && isCustomerSession ? (
            <>
              <SupportStatePanel
                icon="robot-outline"
                title="Deterministic support only"
                message="This support flow is FAQ and rule based. Unsupported prompts escalate instead of pretending to reason autonomously about repairs, billing, or claims."
              />

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Quick prompts</Text>
                <Text style={styles.sectionSubtitle}>
                  These prompts match the current approved chatbot scope for customer mobile.
                </Text>
                <View style={styles.promptGrid}>
                  {quickPromptCatalog.map((item) => (
                    <PromptChip
                      key={item.key}
                      item={item}
                      onPress={submitPrompt}
                      disabled={sendState.status === 'submitting'}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Ask a support question</Text>
                <Text style={styles.sectionSubtitle}>
                  Booking and insurance lookups stay scoped to your own customer account.
                </Text>

                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Type your support question here"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {sendState.message ? (
                  <SupportStatePanel
                    icon={
                      sendState.status === 'saved'
                        ? 'check-decagram-outline'
                        : sendState.status === 'submitting'
                          ? 'progress-clock'
                          : 'alert-circle-outline'
                    }
                    title={
                      sendState.status === 'saved'
                        ? 'Support updated'
                        : sendState.status === 'submitting'
                          ? 'Sending prompt'
                          : 'Support state'
                    }
                    message={sendState.message}
                    tone={sendState.status === 'saved' ? 'success' : 'default'}
                    loading={sendState.status === 'submitting'}
                  />
                ) : null}

                {escalationState.message ? (
                  <SupportStatePanel
                    icon={
                      escalationState.status === 'saved'
                        ? 'check-decagram-outline'
                        : escalationState.status === 'submitting'
                          ? 'progress-clock'
                          : 'alert-circle-outline'
                    }
                    title={
                      escalationState.status === 'saved'
                        ? 'Escalation updated'
                        : escalationState.status === 'submitting'
                          ? 'Opening staff follow-up'
                          : 'Escalation state'
                    }
                    message={escalationState.message}
                    tone={escalationState.status === 'saved' ? 'success' : 'default'}
                    loading={escalationState.status === 'submitting'}
                  />
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    sendState.status === 'submitting' && styles.primaryButtonDisabled,
                  ]}
                  onPress={() => submitPrompt()}
                  disabled={sendState.status === 'submitting'}
                  activeOpacity={0.9}
                >
                  {sendState.status === 'submitting' ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send-outline" size={18} color={colors.onPrimary} />
                      <Text style={styles.primaryButtonText}>Send question</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Conversation responses</Text>
                    <Text style={styles.sectionSubtitle}>
                      Latest answers, lookups, and escalations stay local to this support session.
                    </Text>
                  </View>
                  {latestConversation ? (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() =>
                        latestConversation.supportAction
                          ? navigateFromSupportAction(latestConversation.supportAction)
                          : null
                      }
                      activeOpacity={0.88}
                      disabled={!latestConversation.supportAction}
                    >
                      <MaterialCommunityIcons
                        name="arrow-top-right"
                        size={18}
                        color={
                          latestConversation.supportAction ? colors.text : colors.mutedText
                        }
                      />
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          !latestConversation.supportAction && styles.secondaryButtonTextDisabled,
                        ]}
                      >
                        {latestConversation.supportAction?.label ?? 'No deep link yet'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {conversationLog.length ? (
                  conversationLog.map((item) => (
                    <ConversationCard
                      key={item.id}
                      item={item}
                      onSupportAction={() => navigateFromSupportAction(item.supportAction)}
                      onEscalate={() => handleManualEscalation(item)}
                      escalationSubmitting={
                        escalationState.status === 'submitting' &&
                        escalationState.conversationId === item.id
                      }
                    />
                  ))
                ) : (
                  <SupportStatePanel
                    icon="message-processing-outline"
                    title="No support messages yet"
                    message="Start with a quick prompt or type a question. Booking and insurance lookups will stay customer-safe and explicit."
                  />
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: {
        minHeight: '100vh',
        overflowX: 'hidden',
      },
    }),
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 22,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    marginBottom: 16,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  routePill: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  routePillText: {
    color: colors.labelText,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    padding: 20,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 520,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  tipText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  promptGrid: {
    gap: 12,
  },
  promptChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  promptChipDisabled: {
    opacity: 0.56,
  },
  promptChipLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  promptChipLabelDisabled: {
    color: colors.mutedText,
  },
  promptChipHint: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  multilineInput: {
    minHeight: 110,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButtonTextDisabled: {
    color: colors.mutedText,
  },
  statePanel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  statePanelDanger: {
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  statePanelSuccess: {
    borderColor: 'rgba(63, 215, 143, 0.35)',
  },
  statePanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statePanelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statePanelCopy: {
    flex: 1,
  },
  statePanelTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  statePanelText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  statePanelActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  statePanelPrimaryAction: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePanelPrimaryActionText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  statePanelSecondaryAction: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  statePanelSecondaryActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  conversationCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    marginBottom: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  conversationHeaderCopy: {
    flex: 1,
  },
  conversationPromptLabel: {
    color: colors.labelText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  conversationPrompt: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  messageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  messageBadgeSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(63, 215, 143, 0.35)',
  },
  messageBadgeWarning: {
    backgroundColor: 'rgba(255, 176, 103, 0.12)',
    borderColor: 'rgba(255, 176, 103, 0.35)',
  },
  messageBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  responseBlock: {
    marginBottom: 14,
  },
  responseLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  responseText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  lookupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 14,
    marginBottom: 12,
  },
  lookupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  lookupCardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  lookupCardText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  lookupCardReference: {
    color: colors.labelText,
    fontSize: 12,
    marginTop: 10,
  },
  lookupActionButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  lookupActionButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  escalationCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 176, 103, 0.35)',
    backgroundColor: 'rgba(255, 176, 103, 0.08)',
    borderRadius: radius.medium,
    padding: 14,
    marginBottom: 12,
  },
  escalationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  escalationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  escalationText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  escalationMeta: {
    color: colors.labelText,
    fontSize: 12,
    marginTop: 8,
  },
  conversationMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  conversationMetaText: {
    color: colors.mutedText,
    fontSize: 12,
    marginRight: 'auto',
  },
  inlineActionButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  inlineSecondaryButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSecondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
