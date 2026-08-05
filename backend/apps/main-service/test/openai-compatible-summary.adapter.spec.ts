import { AiSummaryConfig } from '@main-modules/vehicle-lifecycle/services/ai-summary-config';
import {
  AiSummaryProviderError,
  OpenAiCompatibleSummaryAdapter,
} from '@main-modules/vehicle-lifecycle/services/openai-compatible-summary.adapter';

const config = (overrides: Partial<AiSummaryConfig> = {}): AiSummaryConfig => ({
  provider: 'openai_compatible',
  baseUrl: 'http://summary.test/v1',
  model: 'summary-model',
  apiKey: 'test-key',
  timeoutMs: 50,
  maxOutputChars: 40,
  maxEvidenceEvents: 2,
  ...overrides,
});

const input = {
  vehicleLabel: '2023 Toyota Vios',
  timelineEvents: [
    {
      eventType: 'booking_confirmed',
      eventCategory: 'administrative' as const,
      sourceType: 'booking' as const,
      occurredAt: new Date('2026-05-10T08:00:00.000Z'),
      dedupeKey: 'booking:customer-secret-uuid',
    },
    {
      eventType: 'inspection_completion_completed',
      eventCategory: 'verified' as const,
      sourceType: 'inspection' as const,
      occurredAt: new Date('2026-05-11T08:00:00.000Z'),
      dedupeKey: 'inspection:internal-secret-uuid',
    },
    {
      eventType: 'job_order_completed',
      eventCategory: 'verified' as const,
      sourceType: 'job_order' as const,
      occurredAt: new Date('2026-05-12T08:00:00.000Z'),
      dedupeKey: 'job-order:latest-secret-uuid',
    },
  ],
};

describe('OpenAiCompatibleSummaryAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends bounded customer-safe evidence and persists provider provenance', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'Service history reviewed.' } }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await new OpenAiCompatibleSummaryAdapter(config()).generate(input);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const safePayload = JSON.parse(request.messages[1].content);

    expect(safePayload.evidence).toHaveLength(2);
    expect(safePayload.evidence[0]).toEqual({
      eventType: 'inspection_completion_completed',
      eventCategory: 'verified',
      sourceType: 'inspection',
      occurredOn: '2026-05-11',
    });
    expect(request.messages[1].content).not.toContain('secret-uuid');
    expect(request.messages[1].content).not.toContain('dedupeKey');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-key');
    expect(result).toEqual({
      summaryText: 'Service history reviewed.',
      provenance: expect.objectContaining({
        provider: 'openai_compatible',
        model: 'summary-model',
        evidenceRefs: [
          'inspection:inspection_completion_completed:2026-05-11',
          'job_order:job_order_completed:2026-05-12',
        ],
      }),
    });
  });

  it('caps and sanitizes model output', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Approved by reviewer <internal-id> ' + 'x'.repeat(200),
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await new OpenAiCompatibleSummaryAdapter(config()).generate(input);

    expect(result.summaryText).toHaveLength(40);
    expect(result.summaryText).not.toContain('<internal-id>');
  });

  it.each([
    ['non-success response', { ok: false, status: 502, json: async () => ({}) }],
    ['malformed response', { ok: true, status: 200, json: async () => ({ choices: [] }) }],
    ['empty response', {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '   ' } }] }),
    }],
  ])('converts %s into a provider error', async (_name, response) => {
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

    await expect(new OpenAiCompatibleSummaryAdapter(config()).generate(input)).rejects.toBeInstanceOf(
      AiSummaryProviderError,
    );
  });

  it('converts network failures and timeouts into provider errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('socket failure')) as unknown as typeof fetch;
    await expect(new OpenAiCompatibleSummaryAdapter(config()).generate(input)).rejects.toThrow(
      'AI summary provider request failed',
    );

    global.fetch = jest.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;
    await expect(
      new OpenAiCompatibleSummaryAdapter(config({ timeoutMs: 1 })).generate(input),
    ).rejects.toThrow('AI summary provider request timed out');
  });
});
