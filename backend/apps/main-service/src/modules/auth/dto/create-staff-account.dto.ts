import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const staffRoles = ['technician', 'service_adviser', 'super_admin'] as const;

export class CreateStaffAccountDto {
  @ApiProperty({
    example: 'service.adviser@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'SecurePass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    enum: staffRoles,
    example: 'service_adviser',
    description: 'Staff role to provision. Customer accounts must not use this flow.',
  })
  @IsIn(staffRoles)
  role!: (typeof staffRoles)[number];

  @ApiProperty({
    example: 'SA-0012',
    maxLength: 40,
    description: 'Stable staff identifier used for audit snapshots and operational ownership.',
  })
  @IsString()
  @MaxLength(40)
  staffCode!: string;

  @ApiProperty({
    example: 'Maria',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({
    example: 'Santos',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  lastName!: string;

  @ApiPropertyOptional({
    example: '+639171234567',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
