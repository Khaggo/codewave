const INSURANCE_REQUEST_TIMEOUT_MS = 8000;
const INSURANCE_CLIENT_RUNTIME_KEY = '__insuranceClientRuntime';

let insuranceClientRuntimePromise = null;

export const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

export const getInsuranceClientRuntime = async () => {
  if (globalThis[INSURANCE_CLIENT_RUNTIME_KEY]) {
    return globalThis[INSURANCE_CLIENT_RUNTIME_KEY];
  }

  if (!insuranceClientRuntimePromise) {
    insuranceClientRuntimePromise = import('./authClient.js');
  }

  return insuranceClientRuntimePromise;
};

export const request = async (path, options = {}) => {
  const { ApiError, getApiBaseUrl, notifyCustomerSessionExpired } = await getInsuranceClientRuntime();
  const API_BASE_URL = getApiBaseUrl();
  const {
    body,
    headers,
    timeoutMs = INSURANCE_REQUEST_TIMEOUT_MS,
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
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: isFormData
          ? { ...(headers ?? {}) }
          : {
              'Content-Type': 'application/json',
              ...(headers ?? {}),
            },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
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
        if (response.status === 401) {
          notifyCustomerSessionExpired({
            path,
            source: 'insuranceClient',
          });
        }

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
