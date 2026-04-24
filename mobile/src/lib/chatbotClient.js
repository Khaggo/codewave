import { ApiError, getApiBaseUrl } from './authClient';

const API_BASE_URL = getApiBaseUrl();
const CHATBOT_REQUEST_TIMEOUT_MS = 8000;

export const customerChatbotQuickPrompts = [
  {
    key: 'booking-how-to-book',
    label: 'How do I book?',
    prompt: 'How do I book a service appointment?',
    intentKey: 'booking.how_to_book',
    category: 'booking',
  },
  {
    key: 'booking-latest-status',
    label: 'Latest booking status',
    prompt: 'What is my booking status?',
    intentKey: 'booking.latest_status',
    category: 'booking',
  },
  {
    key: 'insurance-required-documents',
    label: 'Insurance documents',
    prompt: 'What documents do I need for insurance?',
    intentKey: 'insurance.required_documents',
    category: 'insurance',
  },
  {
    key: 'insurance-latest-status',
    label: 'Latest insurance status',
    prompt: 'What is my insurance inquiry status?',
    intentKey: 'insurance.latest_status',
    category: 'insurance',
  },
  {
    key: 'workshop-support-window',
    label: 'Workshop support hours',
    prompt: 'When can I contact the workshop?',
    intentKey: 'workshop.support_window',
    category: 'support',
  },
];

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const formatLabel = (value, fallback = 'Unknown') => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .split(/[._]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatTimestampLabel = (value) => {
  if (!value) {
    return 'Not available';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = CHATBOT_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!response.ok) {
        const message =
          data?.message && typeof data.message === 'string'
            ? data.message
            : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${API_BASE_URL}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl: API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the API server.';

    throw new ApiError(
      `Unable to reach ${API_BASE_URL}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const buildSupportAction = (message) => {
  const lookupType = message?.lookup?.lookupType ?? null;
  const referenceId = message?.lookup?.referenceId ?? null;
  const matchedIntentKey = message?.matchedIntentKey ?? null;

  if (lookupType === 'booking_status') {
    return {
      type: 'open_booking_tracking',
      label: referenceId ? 'Open booking tracker' : 'Open booking tab',
      referenceId,
    };
  }

  if (lookupType === 'insurance_status') {
    return {
      type: 'open_insurance_tracking',
      label: referenceId ? 'Open insurance tracking' : 'Open insurance inquiry',
      referenceId,
    };
  }

  if (matchedIntentKey === 'booking.how_to_book') {
    return {
      type: 'open_booking_create',
      label: 'Start a booking',
      referenceId: null,
    };
  }

  if (matchedIntentKey === 'insurance.required_documents') {
    return {
      type: 'open_insurance_tracking',
      label: 'Open insurance inquiry',
      referenceId: null,
    };
  }

  return null;
};

export const normalizeChatbotEscalation = (escalation) => {
  if (!escalation || typeof escalation !== 'object') {
    return null;
  }

  return {
    id: escalation.id ?? null,
    userId: escalation.userId ?? null,
    intentKey: trimOrNull(escalation.intentKey),
    intentLabel: escalation.intentKey ? formatLabel(escalation.intentKey) : 'Manual escalation',
    prompt: trimOrNull(escalation.prompt) ?? '',
    reason: trimOrNull(escalation.reason) ?? 'manual_escalation',
    reasonLabel: formatLabel(escalation.reason ?? 'manual_escalation'),
    status: trimOrNull(escalation.status) ?? 'open',
    statusLabel: formatLabel(escalation.status ?? 'open'),
    createdAt: escalation.createdAt ?? null,
    updatedAt: escalation.updatedAt ?? null,
    createdAtLabel: formatTimestampLabel(escalation.createdAt),
    updatedAtLabel: formatTimestampLabel(escalation.updatedAt),
  };
};

export const normalizeChatbotMessage = (message) => {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const normalizedLookup =
    message.lookup && typeof message.lookup === 'object'
      ? {
          lookupType: trimOrNull(message.lookup.lookupType),
          lookupTypeLabel: formatLabel(message.lookup.lookupType),
          referenceId: trimOrNull(message.lookup.referenceId),
          status: trimOrNull(message.lookup.status),
          statusLabel: formatLabel(message.lookup.status, 'No status yet'),
          message: trimOrNull(message.lookup.message) ?? '',
        }
      : null;

  const normalizedEscalation = normalizeChatbotEscalation(message.escalation);

  return {
    id: message.id ?? null,
    userId: message.userId ?? null,
    prompt: trimOrNull(message.prompt) ?? '',
    matchedIntentKey: trimOrNull(message.matchedIntentKey),
    matchedIntentLabel: message.matchedIntentKey
      ? formatLabel(message.matchedIntentKey)
      : 'Unsupported prompt',
    responseType: trimOrNull(message.responseType) ?? 'answer',
    responseTypeLabel: formatLabel(message.responseType),
    responseText: trimOrNull(message.responseText) ?? '',
    lookup: normalizedLookup,
    escalation: normalizedEscalation,
    manualEscalation: null,
    createdAt: message.createdAt ?? null,
    updatedAt: message.updatedAt ?? null,
    createdAtLabel: formatTimestampLabel(message.createdAt),
    updatedAtLabel: formatTimestampLabel(message.updatedAt),
    supportAction: buildSupportAction({
      matchedIntentKey: message.matchedIntentKey,
      lookup: normalizedLookup,
    }),
  };
};

export const appendManualEscalationToMessage = ({
  messages,
  conversationId,
  escalation,
}) =>
  Array.isArray(messages)
    ? messages.map((message) =>
        message?.id === conversationId
          ? {
              ...message,
              manualEscalation: escalation,
            }
          : message,
      )
    : [];

export const sendCustomerChatbotMessage = async ({ message, accessToken }) =>
  normalizeChatbotMessage(
    await request('/api/chatbot/messages', {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: {
        message,
      },
    }),
  );

export const createCustomerChatbotEscalation = async ({
  prompt,
  reason,
  conversationId,
  accessToken,
}) =>
  normalizeChatbotEscalation(
    await request('/api/chatbot/escalations', {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: {
        prompt,
        reason,
        conversationId,
      },
    }),
  );
