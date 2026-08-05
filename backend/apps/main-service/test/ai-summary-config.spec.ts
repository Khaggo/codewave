import {
  AI_SUMMARY_DEFAULT_MAX_EVIDENCE_EVENTS,
  AI_SUMMARY_DEFAULT_MAX_OUTPUT_CHARS,
  AI_SUMMARY_DEFAULT_TIMEOUT_MS,
  readAiSummaryConfig,
} from '@main-modules/vehicle-lifecycle/services/ai-summary-config';

describe('AI summary configuration', () => {
  it('defaults to a disabled provider with bounded settings', () => {
    expect(readAiSummaryConfig({})).toEqual({
      provider: 'disabled',
      baseUrl: null,
      model: null,
      apiKey: null,
      timeoutMs: AI_SUMMARY_DEFAULT_TIMEOUT_MS,
      maxOutputChars: AI_SUMMARY_DEFAULT_MAX_OUTPUT_CHARS,
      maxEvidenceEvents: AI_SUMMARY_DEFAULT_MAX_EVIDENCE_EVENTS,
    });
  });

  it('normalizes the OpenAI-compatible configuration and caps unsafe values', () => {
    expect(
      readAiSummaryConfig({
        AI_SUMMARY_PROVIDER: 'OPENAI_COMPATIBLE',
        AI_SUMMARY_BASE_URL: 'http://summary.test/v1///',
        AI_SUMMARY_MODEL: '  summary-model ',
        AI_SUMMARY_API_KEY: ' secret ',
        AI_SUMMARY_TIMEOUT_MS: '999999',
        AI_SUMMARY_MAX_OUTPUT_CHARS: '999999',
        AI_SUMMARY_MAX_EVIDENCE_EVENTS: '999999',
      }),
    ).toEqual({
      provider: 'openai_compatible',
      baseUrl: 'http://summary.test/v1',
      model: 'summary-model',
      apiKey: 'secret',
      timeoutMs: 60_000,
      maxOutputChars: 4_000,
      maxEvidenceEvents: 100,
    });
  });

  it('rejects unsupported provider modes', () => {
    expect(() =>
      readAiSummaryConfig({ AI_SUMMARY_PROVIDER: 'local-summary-adapter' }),
    ).toThrow('AI_SUMMARY_PROVIDER must be one of');
  });
});
