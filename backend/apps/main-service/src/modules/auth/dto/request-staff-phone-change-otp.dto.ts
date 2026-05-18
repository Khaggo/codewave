import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RequestStaffPhoneChangeOtpDto {
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
