import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiWorkerJobResponseDto {
  @ApiProperty({
    example: 'ai-worker-jobs',
  })
  queueName!: string;

  @ApiProperty({
    example: 'generate-vehicle-lifecycle-summary',
  })
  jobName!: string;

  @ApiProperty({
    example: 'vehicle-lifecycle-summary:vehicle-1:2026-06-18T02:15:00.000Z',
  })
  jobId!: string;

  @ApiProperty({
    enum: ['queued', 'processing', 'completed', 'failed'],
    example: 'queued',
  })
  status!: 'queued' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    example: '2026-06-18T02:15:00.000Z',
    format: 'date-time',
  })
  requestedAt!: string;

  @ApiProperty({
    example: 3,
  })
  attemptsAllowed!: number;

  @ApiProperty({
    example: 1,
  })
  attemptNumber!: number;

  @ApiPropertyOptional({
    example: '2026-06-18T02:15:02.000Z',
    format: 'date-time',
  })
  startedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-06-18T02:15:04.000Z',
    format: 'date-time',
  })
  completedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-06-18T02:15:05.000Z',
    format: 'date-time',
  })
  failedAt?: string | null;

  @ApiPropertyOptional({
    example: 'AI provider unavailable for this retry window.',
  })
  lastError?: string | null;
}
