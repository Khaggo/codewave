import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestChangePasswordOtpDto {
  @ApiProperty({
    example: 'current-password-123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  currentPassword!: string;
}
