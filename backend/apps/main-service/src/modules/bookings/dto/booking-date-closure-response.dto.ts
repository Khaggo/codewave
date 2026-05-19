import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingDateClosureResponseDto {
  @ApiProperty({
    example: '1d7310a3-5b7c-4d7e-8dd8-5b7f194cb983',
  })
  id!: string;

  @ApiProperty({
    example: '2026-12-25',
  })
  scheduledDate!: string;

  @ApiPropertyOptional({
    example: 'Holiday closure',
    nullable: true,
  })
  label?: string | null;

  @ApiProperty({
    example: 'Shop is closed for the Christmas holiday.',
  })
  reason!: string;

  @ApiProperty({
    example: true,
  })
  isClosed!: boolean;

  @ApiPropertyOptional({
    example: 'staff-user-id',
    nullable: true,
  })
  createdByUserId?: string | null;

  @ApiPropertyOptional({
    example: 'staff-user-id',
    nullable: true,
  })
  updatedByUserId?: string | null;

  @ApiProperty({
    example: '2026-05-20T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-05-20T10:05:00.000Z',
  })
  updatedAt!: Date;
}
