import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ConfirmStaffPhoneChangeWithOtpDto {
  @ApiProperty({
    example: '7bbd92cf-207f-4b3d-a364-3f7c53cd8842',
    description: 'OTP enrollment identifier returned by the phone-change request endpoint.',
  })
  @IsString()
  enrollmentId!: string;

  @ApiProperty({
    example: '123456',
    description: 'Six-digit email OTP sent to the authenticated staff account.',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp!: string;

  @ApiProperty({
    example: '09171234567',
    description: 'New 11-digit PH mobile number that should be saved after OTP verification.',
  })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'Phone number must be an 11-digit PH mobile number starting with 09.',
  })
  phone!: string;
}
