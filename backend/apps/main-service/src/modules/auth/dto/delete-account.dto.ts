import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'SecurePass123',
    minLength: 8,
    description: 'Current password confirmation before the account is archived.',
  })
  @IsString()
  @MinLength(8)
  currentPassword!: string;
}
