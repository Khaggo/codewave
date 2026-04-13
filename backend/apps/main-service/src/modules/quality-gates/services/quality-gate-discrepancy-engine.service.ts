import { Injectable } from '@nestjs/common';

import type { QualityGateFindingProvenance } from '../schemas/quality-gates.schema';

const QUALITY_GATE_RULE_PROVIDER = 'local-rule-engine';
const QUALITY_GATE_RULE_MODEL = 'evidence-discrepancy-v1';
const QUALITY_GATE_RULE_PROMPT_VERSION = 'quality-gates.gate2.v1';
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
  'inspection',
  'it',
  'of',
  'on',
  'or',
  'qa',
  'ready',
  'release',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'with',
  'final',
  'complete',
  'completed',
  'check',
]);

type InspectionStatus = 'pending' | 'completed' | 'needs_followup' | 'void';
type InspectionType = 'intake' | 'pre_repair' | 'completion' | 'return';
type FindingSeverity = 'info' | 'low' | 'medium' | 'high';

export type QualityGateInspectionFindingInput = {
  id: string;
  category: string;
  label: string;
  severity: FindingSeverity;
  notes: string | null;
  isVerified: boolean;
};

export type QualityGateInspectionInput = {
  id: string;
  bookingId: string | null;
  inspectionType: InspectionType;
  status: InspectionStatus;
  notes: string | null;
  createdAt: Date;
  findings: QualityGateInspectionFindingInput[];
};

export type QualityGateDiscrepancyFinding = {
  gate: 'gate_2';
  severity: 'warning' | 'critical';
  code: string;
  message: string;
  provenance: QualityGateFindingProvenance;
};

type GateTwoInput = {
  sourceType: 'booking' | 'back_job';
  sourceId: string;
  completedWorkText: string;
  inspections: QualityGateInspectionInput[];
};

@Injectable()
export class QualityGateDiscrepancyEngineService {
  evaluate(input: GateTwoInput): QualityGateDiscrepancyFinding[] {
    const relevantInspections = this.findRelevantInspections(input);
    const latestRelevantInspection = relevantInspections[0];
    const completedWorkTokens = tokenize(input.completedWorkText);
    const findings: QualityGateDiscrepancyFinding[] = [];

    if (!latestRelevantInspection) {
      findings.push(
        this.createFinding({
          sourceType: input.sourceType,
          severity: 'warning',
          code: 'inspection_evidence_missing',
          message: 'Gate 2 did not find a relevant completion or return inspection for this QA review.',
          ruleId: 'gate_2.inspection_evidence_missing',
          riskContribution: 20,
          evidenceRefs: input.sourceType === 'booking' ? [`booking:${input.sourceId}`] : [`back-job:${input.sourceId}`],
          evidenceSummary: 'No relevant completion or return inspection is attached to the current QA context yet.',
          confidence: 'medium',
          recommendation: 'review_needed',
        }),
      );

      return findings;
    }

    if (latestRelevantInspection.status === 'needs_followup' || latestRelevantInspection.status === 'pending') {
      findings.push(
        this.createFinding({
          sourceType: input.sourceType,
          severity: 'critical',
          code: 'inspection_requires_followup',
          message: `Gate 2 found inspection ${latestRelevantInspection.id} still marked ${latestRelevantInspection.status}, so release must stay blocked.`,
          ruleId: 'gate_2.inspection_requires_followup',
          riskContribution: 70,
          evidenceRefs: [`inspection:${latestRelevantInspection.id}`],
          evidenceSummary: `Inspection ${latestRelevantInspection.id} is not yet in a release-ready completed state.`,
          confidence: 'high',
          recommendation: 'review_needed',
        }),
      );
    }

    const priorInspectionExists = input.inspections.some((inspection) =>
      ['intake', 'pre_repair'].includes(inspection.inspectionType)
      && inspection.status !== 'void'
      && inspection.createdAt.getTime() <= latestRelevantInspection.createdAt.getTime(),
    );

    if (!priorInspectionExists) {
      findings.push(
        this.createFinding({
          sourceType: input.sourceType,
          severity: 'warning',
          code: 'inspection_history_gap',
          message: `Gate 2 found no intake or pre-repair inspection history before inspection ${latestRelevantInspection.id}.`,
          ruleId: 'gate_2.inspection_history_gap',
          riskContribution: 15,
          evidenceRefs: [`inspection:${latestRelevantInspection.id}`],
          evidenceSummary: 'Release review is proceeding without earlier inspection history to compare against.',
          confidence: 'medium',
          recommendation: 'review_needed',
        }),
      );
    }

    const unresolvedInspectionFindings = latestRelevantInspection.findings
      .filter((finding) => finding.isVerified && ['medium', 'high'].includes(finding.severity))
      .filter((finding) => !this.findingMatchesCompletedWork(finding, completedWorkTokens));

    for (const finding of unresolvedInspectionFindings) {
      const isHighSeverity = finding.severity === 'high';
      findings.push(
        this.createFinding({
          sourceType: input.sourceType,
          severity: isHighSeverity ? 'critical' : 'warning',
          code: isHighSeverity
            ? 'verified_high_severity_unresolved'
            : 'verified_medium_severity_unresolved',
          message: `Gate 2 found verified ${finding.severity}-severity inspection evidence "${finding.label}" that is not clearly resolved by the completed-work record.`,
          ruleId: isHighSeverity
            ? 'gate_2.verified_high_severity_unresolved'
            : 'gate_2.verified_medium_severity_unresolved',
          riskContribution: isHighSeverity ? 75 : 45,
          evidenceRefs: [
            `inspection:${latestRelevantInspection.id}`,
            `inspection-finding:${finding.id}`,
          ],
          evidenceSummary: `Inspection ${latestRelevantInspection.id} contains the verified finding "${finding.label}" with weak overlap to the completed work narrative.`,
          confidence: isHighSeverity ? 'high' : 'medium',
          recommendation: 'review_needed',
        }),
      );
    }

    return findings;
  }

  private findRelevantInspections(input: GateTwoInput) {
    return input.inspections
      .filter((inspection) => inspection.status !== 'void')
      .filter((inspection) => {
        if (input.sourceType === 'booking') {
          return inspection.inspectionType === 'completion' && inspection.bookingId === input.sourceId;
        }

        return ['return', 'completion'].includes(inspection.inspectionType);
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private findingMatchesCompletedWork(
    finding: QualityGateInspectionFindingInput,
    completedWorkTokens: string[],
  ) {
    const findingTokens = tokenize([finding.category, finding.label, finding.notes ?? ''].join(' '));
    return findingTokens.some((token) => completedWorkTokens.includes(token));
  }

  private createFinding(input: {
    sourceType: 'booking' | 'back_job';
    severity: 'warning' | 'critical';
    code: string;
    message: string;
    ruleId: string;
    riskContribution: number;
    evidenceRefs: string[];
    evidenceSummary: string;
    confidence: QualityGateFindingProvenance['confidence'];
    recommendation: QualityGateFindingProvenance['recommendation'];
  }): QualityGateDiscrepancyFinding {
    return {
      gate: 'gate_2',
      severity: input.severity,
      code: input.code,
      message: input.message,
      provenance: {
        provider: QUALITY_GATE_RULE_PROVIDER,
        model: QUALITY_GATE_RULE_MODEL,
        promptVersion: QUALITY_GATE_RULE_PROMPT_VERSION,
        sourceType: input.sourceType,
        ruleId: input.ruleId,
        recommendation: input.recommendation,
        confidence: input.confidence,
        concernSummary: '',
        completedWorkSummary: '',
        matchedKeywords: [],
        coverageRatio: 0,
        evidenceRefs: input.evidenceRefs,
        evidenceSummary: input.evidenceSummary,
        riskContribution: input.riskContribution,
      },
    };
  }
}

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
