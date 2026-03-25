import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({
    example: '71b4200e-7747-4b0d-bd5d-c2c3ecdc0669',
  })
  id!: string;

  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiPropertyOptional({
    example: 'Home',
  })
  label?: string | null;

  @ApiProperty({
    example: '123 AutoCare Street',
  })
  addressLine1!: string;

  @ApiPropertyOptional({
    example: 'Barangay Road',
  })
  addressLine2?: string | null;

  @ApiProperty({
    example: 'Quezon City',
  })
  city!: string;

  @ApiProperty({
    example: 'Metro Manila',
  })
  province!: string;

  @ApiPropertyOptional({
    example: '1100',
  })
  postalCode?: string | null;

  @ApiProperty({
    example: true,
  })
  isDefault!: boolean;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
