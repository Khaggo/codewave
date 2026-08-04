import http from 'node:http';
import https from 'node:https';

export function probeHealth(url, timeoutMs = 2_500) {
  if (!url) return Promise.resolve(false);

  return new Promise((resolve) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function probeHealthWithRetries(
  url,
  {
    timeoutMs = 2_500,
    attempts = 1,
    retryDelayMs = 150,
    probe = probeHealth,
    wait = sleep,
  } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
    throw new Error('Health probe attempts must be an integer from 1 to 5.');
  }
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 10_000) {
    throw new Error('Health probe retry delay must be an integer from 0 to 10000ms.');
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await probe(url, timeoutMs)) {
      return { healthy: true, attemptsUsed: attempt };
    }
    if (attempt < attempts && retryDelayMs > 0) {
      await wait(retryDelayMs);
    }
  }

  return { healthy: false, attemptsUsed: attempts };
}

export function getRuntimeProbe(definition, options = {}) {
  const useReadiness = options.readiness === true;
  const url = useReadiness
    ? definition.readinessUrl ?? definition.healthUrl
    : definition.healthUrl;
  const timeoutMs = useReadiness
    ? definition.readinessTimeoutMs ?? 2_500
    : definition.healthTimeoutMs ?? 2_500;

  return {
    url: url || null,
    timeoutMs,
  };
}

export async function probeRuntimeHealth(definition, options = {}) {
  if (!options.listenerPid) {
    return { healthy: false, attemptsUsed: 0 };
  }

  const probe = getRuntimeProbe(definition, {
    readiness: options.readiness === true,
  });
  if (!probe.url) {
    return { healthy: true, attemptsUsed: 0 };
  }
  if (options.enabled === false) {
    return { healthy: null, attemptsUsed: 0 };
  }

  return probeHealthWithRetries(probe.url, {
    timeoutMs: probe.timeoutMs,
    attempts: options.attempts ?? 1,
    retryDelayMs: options.retryDelayMs ?? 150,
  });
}
