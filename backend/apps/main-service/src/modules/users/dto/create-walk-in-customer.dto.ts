import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimValue = ({ value }: { value: unknown }) => (value == null ? value : String(value).trim());
const normalizeEmail = ({ value }: { value: unknown }) => {
  const normalized = trimValue({ value });
  return normalized ? String(normalized).toLowerCase() : undefined;
};

export class CreateWalkInCustomerDto {
  @ApiProperty({ example: 'Jane Doe', maxLength: 240 })
  @Transform(trimValue)
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  fullName!: string;

  @ApiProperty({ example: '+63 917 123 4567', maxLength: 30 })
  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  phone!: string;

  @ApiPropertyOptional({ example: 'jane@example.com', maxLength: 255 })
  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: true, description: 'Must be explicitly acknowledged by staff.' })
  @IsBoolean()
  @Equals(true)
  consentAcknowledged!: boolean;

  @ApiProperty({ example: 'ABC 1234', maxLength: 20 })
  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber!: string;

  @ApiProperty({ example: 'Toyota', maxLength: 100 })
  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  make!: string;

  @ApiProperty({ example: 'Vios', maxLength: 100 })
  @Transform(trimValue)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model!: string;

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1900)
  year!: number;

  @ApiPropertyOptional({ example: 'White', maxLength: 50 })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ example: 'walk-in-2026-0001', maxLength: 200 })
  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestKey?: string;
}
