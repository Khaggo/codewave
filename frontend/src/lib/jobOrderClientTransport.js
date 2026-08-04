import { ApiError } from './authClient.js';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000'
).replace(/\/$/, '');

export const trimOrUndefined = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : undefined;
};

export const requestJobOrderApi = async (path, options = {}) => {
  const { body, headers, responseType = 'json', ...rest } = options;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: isFormData
      ? {
          ...(headers ?? {}),
        }
      : {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (responseType === 'blob') {
    if (!response.ok) {
      const rawText = await response.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      const message =
        data?.message && typeof data.message === 'string'
          ? data.message
          : `Request failed with status ${response.status}`;

      throw new ApiError(message, response.status, data);
    }

    return response.blob();
  }

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
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

export const buildAuthorizedHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

export const getJobOrderAssetUrl = (path) => {
  const normalizedPath = trimOrUndefined(path);
  if (!normalizedPath) {
    return '';
  }

  return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
};
