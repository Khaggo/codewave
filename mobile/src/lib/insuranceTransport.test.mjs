import assert from 'node:assert/strict';
import test from 'node:test';

import { request, shouldUseBrowserNoStoreCache } from './insuranceTransport.js';

class TestApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

test('insurance transport preserves caller cancellation as AbortError', async (context) => {
  const previousRuntime = globalThis.__insuranceClientRuntime;
  const previousFetch = globalThis.fetch;
  const controller = new AbortController();

  context.after(() => {
    globalThis.__insuranceClientRuntime = previousRuntime;
    globalThis.fetch = previousFetch;
  });

  globalThis.__insuranceClientRuntime = {
    ApiError: TestApiError,
    getApiBaseUrl: () => 'http://local.test',
    notifyCustomerSessionExpired: () => {},
  };
  globalThis.fetch = async (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => {
          const error = new Error('aborted by test');
          error.name = 'AbortError';
          reject(error);
        },
        { once: true },
      );
    });

  const pendingRequest = request('/api/insurance/test', {
    method: 'GET',
    signal: controller.signal,
    timeoutMs: 0,
  });

  await Promise.resolve();
  controller.abort();

  await assert.rejects(pendingRequest, {
    name: 'AbortError',
  });
});

test('insurance transport prevents authenticated GET responses from using browser cache', async (context) => {
  const previousRuntime = globalThis.__insuranceClientRuntime;
  const previousFetch = globalThis.fetch;
  let capturedOptions = null;

  context.after(() => {
    globalThis.__insuranceClientRuntime = previousRuntime;
    globalThis.fetch = previousFetch;
  });

  globalThis.__insuranceClientRuntime = {
    ApiError: TestApiError,
    getApiBaseUrl: () => 'http://local.test',
    notifyCustomerSessionExpired: () => {},
  };
  globalThis.fetch = async (_url, options) => {
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      text: async () => '{"items":[]}',
    };
  };

  await request('/api/insurance/test', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer test-token',
    },
    timeoutMs: 0,
  });

  assert.equal(capturedOptions.cache, 'no-store');
});

test('insurance transport omits browser cache directives in React Native', () => {
  assert.equal(
    shouldUseBrowserNoStoreCache('GET', { product: 'ReactNative' }),
    false,
  );
  assert.equal(
    shouldUseBrowserNoStoreCache('GET', { product: 'Gecko' }),
    true,
  );
  assert.equal(
    shouldUseBrowserNoStoreCache('POST', { product: 'Gecko' }),
    false,
  );
});
