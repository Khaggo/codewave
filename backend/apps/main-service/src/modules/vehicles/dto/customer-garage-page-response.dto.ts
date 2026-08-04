import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerGarageVehicleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ABC 1234' })
  plateNumber!: string;

  @ApiProperty({ example: 'Toyota' })
  make!: string;

  @ApiProperty({ example: 'Vios' })
  model!: string;

  @ApiProperty({ example: 2020 })
  year!: number;

  @ApiPropertyOptional({ example: 'Blue', nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ example: 'JTDBR32E720123456', nullable: true })
  vin!: string | null;
}

export class CustomerGaragePageResponseDto {
  @ApiProperty({
    type: () => CustomerGarageVehicleResponseDto,
    isArray: true,
  })
  items!: CustomerGarageVehicleResponseDto[];

  @ApiProperty({
    example: {
      limit: 3,
      total: 132,
      hasNext: true,
      nextCursor: 'eyJ2IjoxLCJjcmVhdGVkQXQiOiIuLi4iLCJpZCI6Ii4uLiIsInNlYXJjaCI6IiJ9',
    },
  })
  page!: {
    limit: number;
    total: number;
    hasNext: boolean;
    nextCursor: string | null;
  };
}
