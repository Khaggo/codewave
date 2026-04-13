import { Injectable } from '@nestjs/common';

import type { QualityGateFindingProvenance } from '../schemas/quality-gates.schema';

const QUALITY_GATE_SEMANTIC_PROVIDER = 'local-rule-auditor';
const QUALITY_GATE_SEMANTIC_MODEL = 'token-overlap-v1';
const QUALITY_GATE_SEMANTIC_PROMPT_VERSION = 'quality-gates.gate1.v1';
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'with',
  'work',
  'works',
]);

type SemanticAuditSourceType = 'booking' | 'back_job';
type SemanticAuditRecommendation = QualityGateFindingProvenance['recommendation'];
type SemanticAuditConfidence = QualityGateFindingProvenance['confidence'];

export type SemanticAuditInput = {
  sourceType: SemanticAuditSourceType;
  concernText: string;
  completedWorkText: string;
};

export type SemanticAuditFinding = {
  severity: 'info' | 'warning';
  code: string;
  message: string;
  provenance: QualityGateFindingProvenance;
};

@Injectable()
export class QualityGateSemanticAuditorService {
  audit(input: SemanticAuditInput): SemanticAuditFinding {
    const concernText = normalizeWhitespace(input.concernText);
    const completedWorkText = normalizeWhitespace(input.completedWorkText);
    const concernTokens = tokenize(concernText);
    const completedWorkTokens = tokenize(completedWorkText);
    const matchedKeywords = concernTokens.filter((token) => completedWorkTokens.includes(token)).slice(0, 8);
    const coverageRatio = concernTokens.length === 0
      ? 0
      : Number((matchedKeywords.length / concernTokens.length).toFixed(2));

    let recommendation: SemanticAuditRecommendation;
    let confidence: SemanticAuditConfidence;
    let severity: 'info' | 'warning';
    let code: string;
    let message: string;

    if (!concernText || !completedWorkText || concernTokens.length === 0 || completedWorkTokens.length === 0) {
      recommendation = 'insufficient_context';
      confidence = 'low';
      severity = 'warning';
      code = 'semantic_resolution_input_missing';
      message = 'Gate 1 could not confidently compare the recorded concern with the completed-work evidence.';
    } else if (matchedKeywords.length >= 2 || coverageRatio >= 0.35) {
      recommendation = 'supported';
      confidence = coverageRatio >= 0.6 ? 'high' : 'medium';
      severity = 'info';
      code = 'semantic_resolution_supported';
      message = 'Gate 1 found enough concern-to-work overlap to support the repair narrative for staff review.';
    } else {
      recommendation = 'review_needed';
      confidence = concernTokens.length >= 3 ? 'medium' : 'low';
      severity = 'warning';
      code = 'semantic_resolution_review_needed';
      message = 'Gate 1 found weak overlap between the recorded concern and the completed-work evidence, so staff review is recommended.';
    }

    return {
      severity,
      code,
      message,
      provenance: {
        provider: QUALITY_GATE_SEMANTIC_PROVIDER,
        model: QUALITY_GATE_SEMANTIC_MODEL,
        promptVersion: QUALITY_GATE_SEMANTIC_PROMPT_VERSION,
        sourceType: input.sourceType,
        ruleId: `gate_1.${code}`,
        recommendation,
        confidence,
        concernSummary: summarize(concernText),
        completedWorkSummary: summarize(completedWorkText),
        matchedKeywords,
        coverageRatio,
        evidenceRefs: [],
        evidenceSummary: 'Gate 1 compares booking or back-job concern text against the completed-work narrative.',
        riskContribution: code === 'semantic_resolution_supported'
          ? 10
          : code === 'semantic_resolution_review_needed'
            ? 35
            : 30,
      },
    };
  }
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeToken = (rawToken: string) => {
  let token = rawToken.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (token.length <= 2 || STOP_WORDS.has(token)) {
    return '';
  }

  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      token = token.slice(0, -suffix.length);
      break;
    }
  }

  if (STOP_WORDS.has(token)) {
    return '';
  }

  return token;
};

const tokenize = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[^a-zA-Z0-9]+/)
        .map(normalizeToken)
        .filter((token) => token.length >= 3),
    ),
  );

const summarize = (value: string, maxLength = 220) => {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
};
