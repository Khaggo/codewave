import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TechnicianProfileResponseDto {
  @ApiProperty({
    example: '7bc8926d-8eb7-4c97-85ab-4597a58e1f43',
  })
  id!: string;

  @ApiProperty({
    example: 'TP-1001',
  })
  code!: string;

  @ApiProperty({
    example: 'Jamie Santos',
  })
  fullName!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['mechanic', 'electrician'],
  })
  specialties!: string[];

  @ApiPropertyOptional({
    example: '09171234567',
  })
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'Handles electrical diagnostics.',
  })
  notes?: string | null;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    example: '61539ebf-e98a-45da-aa0d-a19acded1d7f',
  })
  migratedFromUserId?: string | null;

  @ApiProperty({
    example: '2026-05-22T09:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-05-22T09:30:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
