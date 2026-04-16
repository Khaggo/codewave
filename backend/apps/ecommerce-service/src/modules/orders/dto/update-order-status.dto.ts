import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const orderStatusValues = ['awaiting_fulfillment', 'fulfilled', 'cancelled'] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: orderStatusValues,
    example: 'awaiting_fulfillment',
  })
  @IsIn(orderStatusValues)
  status!: (typeof orderStatusValues)[number];

  @ApiPropertyOptional({
    example: 'Invoice verified by staff and released to fulfillment.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
