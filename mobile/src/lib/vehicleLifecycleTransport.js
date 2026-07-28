import { ApiError, getApiBaseUrl } from './authClient';

const VEHICLE_LIFECYCLE_REQUEST_TIMEOUT_MS = 8000;

export const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

export const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = VEHICLE_LIFECYCLE_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const apiBaseUrl = getApiBaseUrl();
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
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
                  `Timed out reaching ${apiBaseUrl}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl,
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
      `Unable to reach ${apiBaseUrl}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl,
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
