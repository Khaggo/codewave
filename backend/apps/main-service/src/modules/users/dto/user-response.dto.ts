import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { userRoleEnum } from '../schemas/users.schema';

import { AddressResponseDto } from './address-response.dto';
import { UserProfileResponseDto } from './user-profile-response.dto';

export class UserResponseDto {
  @ApiProperty({
    example: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  })
  id!: string;

  @ApiProperty({
    example: 'customer@example.com',
  })
  email!: string;

  @ApiProperty({
    enum: userRoleEnum.enumValues,
    example: 'customer',
  })
  role!: string;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-03-25T15:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    type: () => UserProfileResponseDto,
  })
  profile?: UserProfileResponseDto;

  @ApiPropertyOptional({
    type: () => AddressResponseDto,
    isArray: true,
  })
  addresses?: AddressResponseDto[];
}
