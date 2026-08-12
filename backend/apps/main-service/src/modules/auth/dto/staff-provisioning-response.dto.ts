import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '@main-modules/users/dto/user-response.dto';

export class StaffCredentialDeliveryResponseDto {
  @ApiProperty({ enum: ['sent'], example: 'sent' })
  status!: 'sent';

  @ApiProperty({ enum: ['email'], example: 'email' })
  channel!: 'email';

  @ApiProperty({ example: 'maria482.staff@autocare.com' })
  targetEmail!: string;

  @ApiProperty({ example: false })
  retryable!: false;
}

export class StaffProvisioningResponseDto extends UserResponseDto {
  @ApiProperty({ type: () => StaffCredentialDeliveryResponseDto })
  delivery!: StaffCredentialDeliveryResponseDto;
}
