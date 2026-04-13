import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleSignupStartDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Imdvb2dsZS1pZC10b2tlbiJ9...',
    description: 'Google ID token that the backend will verify before creating or activating an account.',
  })
  @IsString()
  @MinLength(20)
  googleIdToken!: string;
}
