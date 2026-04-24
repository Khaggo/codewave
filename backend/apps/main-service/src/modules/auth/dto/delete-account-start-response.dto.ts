import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountStartResponseDto {
  @ApiProperty({
    example: 'f9e31f73-32d9-4c2f-8f8c-6cc5acbff1da',
    description: 'OTP enrollment identifier used for delete-account verification.',
  })
  enrollmentId!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: 'cu***@example.com',
  })
  maskedEmail!: string;

  @ApiProperty({
    example: '2026-04-13T18:45:00.000Z',
    format: 'date-time',
  })
  otpExpiresAt!: string;

  @ApiProperty({
    example: 'pending_delete_verification',
  })
  status!: string;
}
