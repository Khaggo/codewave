import { ApiProperty } from '@nestjs/swagger';

class AuditTrailAnalyticsTotalsResponseDto {
  @ApiProperty({ example: 3 })
  totalSensitiveActions!: number;

  @ApiProperty({ example: 1 })
  staffAdminActions!: number;

  @ApiProperty({ example: 1 })
  qualityGateOverrides!: number;

  @ApiProperty({ example: 1 })
  releaseDecisions!: number;
}

class AuditTrailAnalyticsEntryResponseDto {
  @ApiProperty({
    example: 'staff_admin_action',
    enum: ['staff_admin_action', 'quality_gate_override', 'release_decision'],
  })
  auditType!: 'staff_admin_action' | 'quality_gate_override' | 'release_decision';

  @ApiProperty({ example: 'staff_account_status_changed' })
  action!: string;

  @ApiProperty({ example: '2026-07-16T08:30:00.000Z' })
  occurredAt!: string;

  @ApiProperty({ example: 'c6d19d0b-b0da-4df6-a0ef-e3666a9b2279', nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ example: 'super_admin', nullable: true })
  actorRole!: string | null;

  @ApiProperty({
    example: 'Temporarily deactivated pending HR review.',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({
    example: 'Super admin deactivated staff account SA-1002.',
  })
  summary!: string;

  @ApiProperty({ example: 'main-service.auth' })
  sourceDomain!: string;

  @ApiProperty({ example: 'b0f9f3b5-d313-4fbb-b95c-c53ca8f6f90d' })
  sourceId!: string;

  @ApiProperty({ example: 'user' })
  targetEntityType!: string;

  @ApiProperty({ example: '5d0ef74e-bfe0-4fcb-89cb-0bc2530b19e2' })
  targetEntityId!: string;

  @ApiProperty({ example: ['quality-gate-1'], type: [String] })
  relatedEntityIds!: string[];
}

export class AuditTrailAnalyticsResponseDto {
  @ApiProperty({ example: '2026-07-16T08:45:00.000Z' })
  refreshedAt!: string;

  @ApiProperty({ example: '497adb17-e8e4-4cfc-bd61-0c0bc20ecf79' })
  refreshJobId!: string;

  @ApiProperty({ type: () => AuditTrailAnalyticsTotalsResponseDto })
  totals!: AuditTrailAnalyticsTotalsResponseDto;

  @ApiProperty({ type: () => AuditTrailAnalyticsEntryResponseDto, isArray: true })
  entries!: AuditTrailAnalyticsEntryResponseDto[];
}
