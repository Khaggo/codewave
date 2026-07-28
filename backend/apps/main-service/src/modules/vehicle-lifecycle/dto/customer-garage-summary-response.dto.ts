import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CustomerGarageVehicleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  plateNumber!: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  year!: number;

  @ApiPropertyOptional()
  color?: string | null;
}

class CustomerGarageBookingDto {
  @ApiProperty()
  reference!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  scheduledDate!: string;
}

class CustomerGarageJobDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  workshopStage?: string | null;

  @ApiPropertyOptional()
  invoiceReference?: string | null;

  @ApiProperty()
  updatedAt!: string;
}

class CustomerGarageInsuranceDto {
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  providerName?: string | null;

  @ApiPropertyOptional()
  policyNumber?: string | null;

  @ApiPropertyOptional()
  policyExpiryAt?: string | null;
}

export class CustomerGarageSummaryResponseDto {
  @ApiProperty({
    type: () => CustomerGarageVehicleDto,
  })
  vehicle!: CustomerGarageVehicleDto;

  @ApiPropertyOptional({
    type: () => CustomerGarageBookingDto,
  })
  activeBooking?: CustomerGarageBookingDto | null;

  @ApiPropertyOptional({
    type: () => CustomerGarageJobDto,
  })
  latestJob?: CustomerGarageJobDto | null;

  @ApiPropertyOptional({
    type: () => CustomerGarageJobDto,
  })
  lastCompletedService?: CustomerGarageJobDto | null;

  @ApiPropertyOptional({
    type: () => CustomerGarageInsuranceDto,
  })
  insurance?: CustomerGarageInsuranceDto | null;
}
