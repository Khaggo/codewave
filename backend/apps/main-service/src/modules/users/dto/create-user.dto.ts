import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Unique email address for the user account.',
  })
  @IsEmail()
  email!: string;

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
