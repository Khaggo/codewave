import { Job } from 'bullmq';

export type AiWorkerJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type AiWorkerJobMetadata = {
  queueName: string;
  jobName: string;
  jobId: string;
  status: AiWorkerJobStatus;
  requestedAt: string;
  attemptsAllowed: number;
  attemptNumber: number;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  lastError?: string | null;
};

type CreateQueuedAiJobMetadataInput = {
  queueName: string;
  jobName: string;
  jobId: string;
  requestedAt: string;
  attemptsAllowed: number;
};

type CreateRuntimeAiJobMetadataOptions = {
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  lastError?: string | null;
};

export function createQueuedAiJobMetadata(
  input: CreateQueuedAiJobMetadataInput,
): AiWorkerJobMetadata {
  return {
    queueName: input.queueName,
    jobName: input.jobName,
    jobId: input.jobId,
    status: 'queued',
    requestedAt: input.requestedAt,
    attemptsAllowed: input.attemptsAllowed,
    attemptNumber: 0,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    lastError: null,
  };
}

export function createRuntimeAiJobMetadata(
  job: Job,
  status: Exclude<AiWorkerJobStatus, 'queued'>,
  options: CreateRuntimeAiJobMetadataOptions,
): AiWorkerJobMetadata {
  return {
    queueName: job.queueName,
    jobName: job.name,
    jobId: job.id?.toString() ?? `${job.queueName}:${job.name}`,
    status,
    requestedAt: options.requestedAt,
    attemptsAllowed: typeof job.opts.attempts === 'number' ? job.opts.attempts : 1,
    attemptNumber: job.attemptsMade + 1,
    startedAt: options.startedAt ?? null,
    completedAt: options.completedAt ?? null,
    failedAt: options.failedAt ?? null,
    lastError: options.lastError ?? null,
  };
}
