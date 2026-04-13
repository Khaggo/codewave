import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailOtpDto {
  @ApiProperty({
    example: 'f9e31f73-32d9-4c2f-8f8c-6cc5acbff1da',
  })
  @IsString()
  enrollmentId!: string;

  @ApiProperty({
    example: '123456',
    minLength: 4,
    maxLength: 8,
  })
  @IsString()
  @Length(4, 8)
  otp!: string;
}
