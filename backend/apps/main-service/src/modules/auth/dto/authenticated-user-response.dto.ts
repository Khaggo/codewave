import { ApiProperty } from '@nestjs/swagger';

import { userRoleEnum } from '@main-modules/users/schemas/users.schema';

export class AuthenticatedUserResponseDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  userId!: string;

  @ApiProperty({
    example: 'customer@example.com',
  })
  email!: string;

  @ApiProperty({
    enum: userRoleEnum.enumValues,
    example: 'customer',
  })
  role!: string;
}
