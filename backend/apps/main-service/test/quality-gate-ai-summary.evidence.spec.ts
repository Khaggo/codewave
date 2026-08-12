import {
  buildQualityGateAiSummaryEvidence,
  buildQualityGateEvidenceFingerprint,
  canonicalizeQualityGateAiEvidence,
  QualityGatesService,
} from '../src/modules/quality-gates/services/quality-gates.service';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  matchesQualityGateAiGeneration,
  shouldReuseQualityGateAiGeneration,
} from '../src/modules/quality-gates/schemas/quality-gates.schema';

describe('quality-gate AI summary evidence', () => {
  const jobOrder = {
    updatedAt: '2026-08-11T00:00:00.000Z',
    actorUserId: 'must-not-leave-this-boundary',
    items: [
      { serviceName: 'Oil and filter', isCompleted: true },
      { serviceName: '550e8400-e29b-41d4-a716-446655440000', isCompleted: true },
      { serviceName: 'a8f5f167f44f4964e6c998dee827110c', isCompleted: false },
      { serviceName: 'eyJhbGciOiJIUzI1NiJ9.secret.signature', isCompleted: false },
    ],
    photos: [{}],
    progressEntries: [{}],
    intakeFindings: [
      { approvedForStaffUse: true, code: 'brake_check' },
      { approvedForStaffUse: false, code: 'private_note', note: 'do not send' },
    ],
  };
  const gate = {
    preCheckSummary: {
      evidenceGapCount: 0,
      automatedRecommendation: 'ready_for_review',
    },
    actorUserId: 'must-not-leave-this-boundary',
    findings: [
      { gate: 'foundation', severity: 'warning', code: 'missing_progress_evidence' },
      { gate: 'gate_2', severity: 'critical', code: '550e8400-e29b-41d4-a716-446655440000' },
      { gate: 'gate_1', severity: 'warning', code: 'a8f5f167f44f4964e6c998dee827110c' },
    ],
  };

  it('allowlists QA evidence and excludes actor IDs and unapproved intake notes', () => {
    const canonical = canonicalizeQualityGateAiEvidence(jobOrder, gate);
    const serialized = JSON.stringify(buildQualityGateAiSummaryEvidence(canonical));

    expect(serialized).toContain('Oil and filter');
    expect(serialized).not.toContain('brake_check');
    expect(serialized).not.toContain('must-not-leave-this-boundary');
    expect(serialized).not.toContain('private_note');
    expect(serialized).not.toContain('do not send');
    expect(serialized).not.toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(serialized).not.toContain('a8f5f167f44f4964e6c998dee827110c');
    expect(serialized).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(serialized).toContain('Service item');
    expect(serialized).toContain('Quality gate finding');
  });

  it('includes automated recommendation and every canonical prompt field in the fingerprint', () => {
    const first = buildQualityGateEvidenceFingerprint(canonicalizeQualityGateAiEvidence(jobOrder, gate));
    const second = buildQualityGateEvidenceFingerprint(canonicalizeQualityGateAiEvidence(
      jobOrder,
      {
        ...gate,
        preCheckSummary: {
          ...gate.preCheckSummary,
          automatedRecommendation: 'manual_review_required',
        },
      },
    ));

    expect(first).not.toBe(second);
  });

  it('rejects old worker identity and reuses active or ready same-evidence generations', () => {
    const summary = {
      status: 'generating' as const,
      summaryText: null,
      provider: 'openai-compatible',
      model: 'fake-model',
      promptVersion: 'vehicle-lifecycle.summary.v2',
      evidenceFingerprint: 'fp-new',
      generationId: 'generation-new',
      jobId: 'job-new',
      requestedAt: '2026-08-11T00:00:01.000Z',
      generatedAt: null,
      errorCode: null,
      errorMessage: null,
      auditJob: {} as never,
      provenance: null,
    };

    expect(matchesQualityGateAiGeneration(summary, {
      evidenceFingerprint: 'fp-new',
      generationId: 'generation-old',
      jobId: 'job-old',
      requestedAt: '2026-08-11T00:00:00.000Z',
    })).toBe(false);
    expect(shouldReuseQualityGateAiGeneration(summary, 'fp-new', false)).toBe(true);
    expect(shouldReuseQualityGateAiGeneration(
      { ...summary, status: 'ready' },
      'fp-new',
      false,
    )).toBe(true);
  });

  it('creates no persisted request or queue job when the provider is disabled', async () => {
    const repository = {
      claimAiSummaryGeneration: jest.fn(),
    };
    const queue = { add: jest.fn() };
    const provider = {
      assertAvailable: jest.fn(() => {
        throw new ServiceUnavailableException({
          code: 'AI_SUMMARY_UNAVAILABLE',
          message: 'disabled',
        });
      }),
    };
    const service = new QualityGatesService(
      repository as never,
      { findById: jest.fn().mockResolvedValue({ ...jobOrder, status: 'ready_for_qa' }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      queue as never,
      provider as never,
    );
    (service as any).assertStaffActor = jest.fn().mockResolvedValue({
      id: 'staff',
      role: 'service_adviser',
    });
    (service as any).assertViewerCanAccess = jest.fn();
    (service as any).resolveGateForJobOrder = jest.fn().mockResolvedValue(gate);

    await expect(service.requestPreCheckSummary(
      'job-order',
      { userId: 'staff', role: 'service_adviser' },
    )).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.claimAiSummaryGeneration).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not queue when the repository reuses an active same-fingerprint generation', async () => {
    const reusedGate = {
      ...gate,
      preCheckSummary: {
        ...gate.preCheckSummary,
        aiSummary: { status: 'generating' },
      },
    };
    const repository = {
      claimAiSummaryGeneration: jest.fn().mockResolvedValue({
        claimed: false,
        gate: reusedGate,
      }),
    };
    const queue = { add: jest.fn() };
    const provider = {
      assertAvailable: jest.fn(),
      buildQueuedProvenance: jest.fn().mockReturnValue({
        provider: 'openai-compatible',
        model: 'fake-model',
        promptVersion: 'vehicle-lifecycle.summary.v2',
        evidenceRefs: [],
        evidenceSummary: 'allowlisted evidence',
      }),
    };
    const service = new QualityGatesService(
      repository as never,
      { findById: jest.fn().mockResolvedValue({ ...jobOrder, status: 'ready_for_qa' }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      queue as never,
      provider as never,
    );
    (service as any).assertStaffActor = jest.fn().mockResolvedValue({
      id: 'staff',
      role: 'service_adviser',
    });
    (service as any).assertViewerCanAccess = jest.fn();
    (service as any).resolveGateForJobOrder = jest.fn().mockResolvedValue(gate);

    await expect(service.requestPreCheckSummary(
      'job-order',
      { userId: 'staff', role: 'service_adviser' },
    )).resolves.toBe(reusedGate);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('treats an old worker retry as a no-op after a newer generation is persisted', async () => {
    const currentGate = {
      preCheckSummary: {
        aiSummary: {
          status: 'generating',
          evidenceFingerprint: 'fp-new',
          generationId: 'generation-new',
          jobId: 'job-new',
          requestedAt: '2026-08-11T00:00:01.000Z',
        },
      },
    };
    const repository = {
      findOptionalByJobOrderId: jest.fn().mockResolvedValue(currentGate),
      updateAiSummary: jest.fn(),
    };
    const service = new QualityGatesService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.handlePreCheckSummaryWorkerFailure(
      'job-order',
      'fp-new',
      'generation-old',
      {
        queueName: 'ai-worker-jobs',
        jobName: 'generate-quality-gate-precheck-summary',
        jobId: 'job-old',
        status: 'failed',
        requestedAt: '2026-08-11T00:00:00.000Z',
        attemptsAllowed: 3,
        attemptNumber: 2,
      },
    )).resolves.toBe(currentGate);
    expect(repository.updateAiSummary).not.toHaveBeenCalled();
  });
});
