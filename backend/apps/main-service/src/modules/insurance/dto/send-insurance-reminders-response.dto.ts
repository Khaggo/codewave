import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { insuranceManualReminderTypeValues } from './send-insurance-reminders.dto';

export const insuranceManualReminderResultValues = ['sent', 'skipped', 'failed'] as const;

export class SendInsuranceReminderResultDto {
  @ApiProperty({
    example: '4c559c0b-4d1b-492f-a11f-e61271f4a32d',
  })
  inquiryId!: string;

  @ApiProperty({
    enum: insuranceManualReminderTypeValues,
    example: 'missing_documents',
  })
  reminderType!: (typeof insuranceManualReminderTypeValues)[number];

  @ApiProperty({
    enum: insuranceManualReminderResultValues,
    example: 'sent',
  })
  result!: (typeof insuranceManualReminderResultValues)[number];

  @ApiPropertyOptional({
    example: 'Inquiry is no longer eligible for this reminder type.',
  })
  reason?: string | null;
}

export class SendInsuranceRemindersResponseDto {
  @ApiProperty({
    example: 1,
  })
  targetedCount!: number;

  @ApiProperty({
    example: 1,
  })
  eligibleCount!: number;

  @ApiProperty({
    example: 1,
  })
  sentCount!: number;

  @ApiProperty({
    example: 0,
  })
  skippedCount!: number;

  @ApiProperty({
    example: 0,
  })
  failedCount!: number;

  @ApiProperty({
    type: () => SendInsuranceReminderResultDto,
    isArray: true,
  })
  results!: SendInsuranceReminderResultDto[];
}
