import { ApiProperty } from '@nestjs/swagger';

import { userRoleEnum } from '@main-modules/users/schemas/users.schema';

export class QualityGateOverrideResponseDto {
  @ApiProperty({
    example: '6c54f18a-793e-4431-bd20-d2a3498e80dc',
  })
  id!: string;

  @ApiProperty({
    example: 'f0cb4d65-f517-40ce-b0d4-7eb22e9f8f21',
  })
  qualityGateId!: string;

  @ApiProperty({
    example: '64363644-4bf8-4fab-b4c3-5ae2d1fe8d16',
  })
  actorUserId!: string;

  @ApiProperty({
    enum: userRoleEnum.enumValues,
    example: 'super_admin',
  })
  actorRole!: (typeof userRoleEnum.enumValues)[number];

  @ApiProperty({
    example: 'Manual release approved after supervisor review.',
  })
  reason!: string;

  @ApiProperty({
    example: '2026-05-06T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;
}
