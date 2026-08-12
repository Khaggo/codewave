import { ApiProperty } from '@nestjs/swagger';

import { ServiceResponseDto } from './service-response.dto';

export class ServiceManagementPageResponseDto {
  @ApiProperty({ type: ServiceResponseDto, isArray: true })
  items!: ServiceResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}
