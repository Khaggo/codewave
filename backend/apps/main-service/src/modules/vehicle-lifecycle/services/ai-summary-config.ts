export const AI_SUMMARY_PROVIDER_MODES = ['disabled', 'openai_compatible'] as const;
export type AiSummaryProviderMode = (typeof AI_SUMMARY_PROVIDER_MODES)[number];

export const AI_SUMMARY_CONFIG = Symbol('AI_SUMMARY_CONFIG');
export const AI_SUMMARY_PROMPT_VERSION = 'vehicle-lifecycle.summary.v2';
export const AI_SUMMARY_UNAVAILABLE_CODE = 'AI_SUMMARY_UNAVAILABLE';
export const AI_SUMMARY_DEFAULT_TIMEOUT_MS = 15_000;
export const AI_SUMMARY_DEFAULT_MAX_OUTPUT_CHARS = 1_200;
export const AI_SUMMARY_DEFAULT_MAX_EVIDENCE_EVENTS = 50;

export type AiSummaryConfig = {
  provider: AiSummaryProviderMode;
  baseUrl: string | null;
  model: string | null;
  apiKey: string | null;
  timeoutMs: number;
  maxOutputChars: number;
  maxEvidenceEvents: number;
};

const readPositiveInteger = (
  value: string | undefined,
  fallback: number,
  maximum: number,
) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
};

export const readAiSummaryConfig = (
  env: NodeJS.ProcessEnv = process.env,
): AiSummaryConfig => {
  const rawProvider = env.AI_SUMMARY_PROVIDER?.trim().toLowerCase() || 'disabled';
  if (!AI_SUMMARY_PROVIDER_MODES.includes(rawProvider as AiSummaryProviderMode)) {
    throw new Error(
      'AI_SUMMARY_PROVIDER must be one of: ' + AI_SUMMARY_PROVIDER_MODES.join(', '),
    );
  }

  return {
    provider: rawProvider as AiSummaryProviderMode,
    baseUrl: env.AI_SUMMARY_BASE_URL?.trim().replace(/\/+$/, '') || null,
    model: env.AI_SUMMARY_MODEL?.trim() || null,
    apiKey: env.AI_SUMMARY_API_KEY?.trim() || null,
    timeoutMs: readPositiveInteger(
      env.AI_SUMMARY_TIMEOUT_MS ?? env.AI_SUMMARY_REQUEST_TIMEOUT_MS,
      AI_SUMMARY_DEFAULT_TIMEOUT_MS,
      60_000,
    ),
    maxOutputChars: readPositiveInteger(
      env.AI_SUMMARY_MAX_OUTPUT_CHARS,
      AI_SUMMARY_DEFAULT_MAX_OUTPUT_CHARS,
      4_000,
    ),
    maxEvidenceEvents: readPositiveInteger(
      env.AI_SUMMARY_MAX_EVIDENCE_EVENTS,
      AI_SUMMARY_DEFAULT_MAX_EVIDENCE_EVENTS,
      100,
    ),
  };
};

export const isAiSummaryConfigured = (config: AiSummaryConfig) =>
  config.provider === 'openai_compatible' &&
  Boolean(config.baseUrl && config.model);
