import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertAddressDto {
  @ApiPropertyOptional({
    example: 'Home',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiProperty({
    example: '123 AutoCare Street',
  })
  @IsString()
  addressLine1!: string;

  @ApiPropertyOptional({
    example: 'Barangay Road',
  })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({
    example: 'Quezon City',
  })
  @IsString()
  city!: string;

  @ApiProperty({
    example: 'Metro Manila',
  })
  @IsString()
  province!: string;

  @ApiPropertyOptional({
    example: '1100',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
