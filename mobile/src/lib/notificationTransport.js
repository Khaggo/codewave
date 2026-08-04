const NOTIFICATION_REQUEST_TIMEOUT_MS = 8000;

let authClientModulePromise = null;

const loadAuthClientModule = async () => {
  if (!authClientModulePromise) {
    authClientModulePromise = import('./authClient.js');
  }

  return authClientModulePromise;
};

export const createNotificationApiError = async (message, status, details) => {
  const { ApiError } = await loadAuthClientModule();
  return new ApiError(message, status, details);
};

const getNotificationApiBaseUrl = async () => {
  const { getApiBaseUrl } = await loadAuthClientModule();
  return getApiBaseUrl();
};

export const requestNotificationApi = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = NOTIFICATION_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const { ApiError } = await loadAuthClientModule();
  const API_BASE_URL = await getNotificationApiBaseUrl();
  const buildApiError = (message, status, details) => new ApiError(message, status, details);
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

        throw buildApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                buildApiError(
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

    throw await createNotificationApiError(
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
