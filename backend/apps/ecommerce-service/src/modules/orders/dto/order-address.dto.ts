import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class OrderAddressDto {
  @ApiProperty({
    example: 'Juan Dela Cruz',
    maxLength: 160,
  })
  @IsString()
  @MaxLength(160)
  recipientName!: string;

  @ApiProperty({
    example: 'juan@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: '+63 912 345 6789',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @ApiProperty({
    example: '123 Service Street',
    maxLength: 180,
  })
  @IsString()
  @MaxLength(180)
  addressLine1!: string;

  @ApiPropertyOptional({
    example: 'Unit 3B',
    maxLength: 180,
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine2?: string;

  @ApiProperty({
    example: 'Makati',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  city!: string;

  @ApiProperty({
    example: 'Metro Manila',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  province!: string;

  @ApiPropertyOptional({
    example: '1200',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}
