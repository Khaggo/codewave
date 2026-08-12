import { ApiProperty } from '@nestjs/swagger';

export class FirstLoginPasswordChangeResponseDto {
  @ApiProperty({ example: true })
  requiresPasswordChange!: true;

  @ApiProperty({ description: 'Restricted token accepted only by the required-password-change endpoint.' })
  passwordChangeToken!: string;

  @ApiProperty({ example: '/api/auth/password/change-required' })
  destination!: string;

  @ApiProperty({ example: 600 })
  expiresInSeconds!: number;
}
