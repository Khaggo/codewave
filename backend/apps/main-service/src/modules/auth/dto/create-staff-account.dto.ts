import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const staffRoles = ['technician', 'head_technician', 'service_adviser', 'super_admin'] as const;
const staffAccountTypes = ['staff', 'mechanic', 'technician', 'head_technician', 'admin'] as const;

export class CreateStaffAccountDto {
  @ApiPropertyOptional({
    example: 'maria482.staff@autocare.com',
    description:
      'Optional compatibility override. When omitted, the backend generates a unique employee email.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

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

  @ApiPropertyOptional({
    enum: staffAccountTypes,
    example: 'mechanic',
    description:
      'Presentation account type used for generated staff code and email labels. Mechanics map to technician permissions.',
  })
  @IsOptional()
  @IsIn(staffAccountTypes)
  accountType?: (typeof staffAccountTypes)[number];

  @ApiPropertyOptional({
    example: 'STA-4821',
    maxLength: 40,
    description:
      'Optional compatibility override. When omitted, the backend generates a unique stable staff identifier.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  staffCode?: string;

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
