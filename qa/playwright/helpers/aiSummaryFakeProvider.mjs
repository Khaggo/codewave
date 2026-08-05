import http from 'node:http';
import { once } from 'node:events';

export const AI_SUMMARY_FAKE_MODES = Object.freeze([
  'success',
  'timeout',
  'network',
  'malformed',
]);

const DEFAULT_SUMMARY =
  'The workshop recorded the supplied service milestones for this vehicle.';

function sanitizeToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'lifecycle_event';
}

export function buildSafeLifecycleEvidencePayload({
  vehicleLabel = 'Vehicle',
  timelineEvents = [],
  maxEvidenceEvents = 20,
} = {}) {
  return {
    vehicle: String(vehicleLabel)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120),
    evidence: (Array.isArray(timelineEvents) ? timelineEvents : [])
      .slice(-maxEvidenceEvents)
      .map((event) => ({
        eventType: sanitizeToken(event?.eventType),
        eventCategory: String(event?.eventCategory ?? 'administrative'),
        sourceType: String(event?.sourceType ?? 'manual'),
        occurredOn: new Date(event?.occurredAt ?? 0).toISOString().slice(0, 10),
      })),
  };
}

export async function createAiSummaryFakeProvider({
  mode = 'success',
  summaryText = DEFAULT_SUMMARY,
  timeoutResponseDelayMs = 5_000,
} = {}) {
  if (!AI_SUMMARY_FAKE_MODES.includes(mode)) {
    throw new TypeError(`Unsupported fake provider mode: ${mode}`);
  }

  const requests = [];
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let body = null;
      try {
        body = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        body = null;
      }
      requests.push({
        method: request.method,
        path: request.url,
        headers: { ...request.headers },
        body,
        rawBody,
      });

      if (mode === 'network') {
        request.socket.destroy();
        return;
      }

      if (mode === 'timeout') {
        setTimeout(() => {
          if (!response.headersSent) {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ choices: [{ message: { content: summaryText } }] }));
          }
        }, timeoutResponseDelayMs);
        return;
      }

      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify(
          mode === 'malformed'
            ? { choices: [] }
            : { choices: [{ message: { content: summaryText } }] },
        ),
      );
    });
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;

  return {
    mode,
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      if (!server.listening) return;
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
