import {
  AI_SUMMARY_PROMPT_VERSION,
  AiSummaryConfig,
  isAiSummaryConfigured,
} from './ai-summary-config';
import {
  LifecycleSummaryInput,
  LifecycleSummaryOutput,
} from './vehicle-lifecycle-summary-provider.types';

const SUMMARY_SYSTEM_PROMPT = [
  'You write a short, factual customer-facing vehicle service history summary.',
  'Use only the supplied normalized lifecycle evidence.',
  'Do not invent details, diagnoses, prices, dates, people, or outcomes.',
  'Do not mention internal identifiers, staff, reviewers, prompts, models, or confidence.',
  'Return plain text only, with no title, markdown, JSON, or bullet list.',
].join(' ');

export class AiSummaryProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiSummaryProviderError';
  }
}

export class OpenAiCompatibleSummaryAdapter {
  constructor(private readonly config: AiSummaryConfig) {}

  async generate(input: LifecycleSummaryInput): Promise<LifecycleSummaryOutput> {
    if (!isAiSummaryConfigured(this.config)) {
      throw new AiSummaryProviderError('AI summary provider is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        this.config.baseUrl + '/chat/completions',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(this.config.apiKey
              ? { Authorization: 'Bearer ' + this.config.apiKey }
              : {}),
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
              {
                role: 'user',
                content: JSON.stringify(this.toSafeRequest(input)),
              },
            ],
            temperature: 0.2,
            max_tokens: 400,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new AiSummaryProviderError(
          'AI summary provider returned HTTP ' + response.status,
        );
      }

      const body = await response.json().catch(() => null);
      const rawSummary = this.readContent(body);
      const summaryText = sanitizeSummaryText(
        rawSummary,
        this.config.maxOutputChars,
      );

      return {
        summaryText,
        provenance: {
          provider: this.config.provider,
          model: this.config.model as string,
          promptVersion: AI_SUMMARY_PROMPT_VERSION,
          evidenceRefs: this.toSafeEvidenceRefs(input),
          evidenceSummary:
            'Generated from customer-safe normalized lifecycle milestones. The draft remains hidden until staff review.',
        },
      };
    } catch (error) {
      if (error instanceof AiSummaryProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiSummaryProviderError('AI summary provider request timed out');
      }

      throw new AiSummaryProviderError('AI summary provider request failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private toSafeRequest(input: LifecycleSummaryInput) {
    return {
      vehicle: sanitizeLabel(input.vehicleLabel),
      evidence: input.timelineEvents
        .slice(-this.config.maxEvidenceEvents)
        .map((event) => ({
          eventType: sanitizeToken(event.eventType),
          eventCategory: event.eventCategory,
          sourceType: event.sourceType,
          occurredOn: event.occurredAt.toISOString().slice(0, 10),
        })),
    };
  }

  private toSafeEvidenceRefs(input: LifecycleSummaryInput) {
    return input.timelineEvents
      .slice(-this.config.maxEvidenceEvents)
      .map(
        (event) =>
          event.sourceType +
          ':' +
          sanitizeToken(event.eventType) +
          ':' +
          event.occurredAt.toISOString().slice(0, 10),
      );
  }

  private readContent(body: unknown): string {
    if (!body || typeof body !== 'object') {
      throw new AiSummaryProviderError('AI summary provider returned malformed output');
    }

    const choices = (body as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new AiSummaryProviderError('AI summary provider returned malformed output');
    }

    const message = (
      choices[0] as { message?: { content?: unknown } } | undefined
    )?.message;
    const content = message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      const textParts = content
        .filter(
          (part): part is { text: string } =>
            Boolean(part) &&
            typeof part === 'object' &&
            typeof (part as { text?: unknown }).text === 'string',
        )
        .map((part) => part.text);
      if (textParts.length > 0) {
        return textParts.join(' ');
      }
    }

    throw new AiSummaryProviderError('AI summary provider returned malformed output');
  }
}

const sanitizeLabel = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

const sanitizeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'lifecycle_event';

const sanitizeSummaryText = (value: string, maxLength: number) => {
  const sanitized = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/<[^>]{0,200}>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!sanitized) {
    throw new AiSummaryProviderError('AI summary provider returned empty output');
  }

  return sanitized.slice(0, maxLength);
};
