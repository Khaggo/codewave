import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'customer@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: 'Jane',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
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
