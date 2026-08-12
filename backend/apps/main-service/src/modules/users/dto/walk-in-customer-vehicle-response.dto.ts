import { ApiProperty } from '@nestjs/swagger';

export class WalkInCustomerVehicleResponseDto {
  @ApiProperty()
  customerUserId!: string;

  @ApiProperty({ example: 'walk_in' })
  customerIdentityKind!: 'walk_in' | 'registered';

  @ApiProperty()
  vehicleId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  customerLabel!: string;

  @ApiProperty({ example: 'VEH-2026-000001' })
  vehicleReference!: string;

  @ApiProperty({ example: '2022 Toyota Vios (ABC 1234)' })
  vehicleLabel!: string;

  @ApiProperty({ example: 'walk_in' })
  arrivalType!: 'walk_in';

  @ApiProperty()
  customerCreated!: boolean;

  @ApiProperty()
  customerReused!: boolean;

  @ApiProperty()
  vehicleCreated!: boolean;

  @ApiProperty()
  vehicleReused!: boolean;
}
