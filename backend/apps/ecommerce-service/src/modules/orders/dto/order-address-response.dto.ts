import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderAddressResponseDto {
  @ApiProperty({
    example: '99999999-9999-4999-8999-999999999999',
  })
  id!: string;

  @ApiProperty({
    example: 'billing',
    enum: ['billing'],
  })
  addressType!: 'billing';

  @ApiProperty({
    example: 'Juan Dela Cruz',
  })
  recipientName!: string;

  @ApiProperty({
    example: 'juan@example.com',
  })
  email!: string;

  @ApiPropertyOptional({
    example: '+63 912 345 6789',
  })
  contactPhone?: string | null;

  @ApiProperty({
    example: '123 Service Street',
  })
  addressLine1!: string;

  @ApiPropertyOptional({
    example: 'Unit 3B',
  })
  addressLine2?: string | null;

  @ApiProperty({
    example: 'Makati',
  })
  city!: string;

  @ApiProperty({
    example: 'Metro Manila',
  })
  province!: string;

  @ApiPropertyOptional({
    example: '1200',
  })
  postalCode?: string | null;
}
