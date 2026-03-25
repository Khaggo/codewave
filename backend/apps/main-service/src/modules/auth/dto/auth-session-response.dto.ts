import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '@main-modules/users/dto/user-response.dto';

export class AuthSessionResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token-placeholder',
  })
  accessToken!: string;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-placeholder',
  })
  refreshToken!: string;

  @ApiProperty({
    type: () => UserResponseDto,
  })
  user!: UserResponseDto;
}
