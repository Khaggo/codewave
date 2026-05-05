import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class RequestPasswordResetOtpDto {
  @ApiProperty({
    example: 'customer@example.com',
  })
  @IsString()
  @IsEmail()
  email!: string;
}
