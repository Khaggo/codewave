import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

import { OrderAddressDto } from './order-address.dto';

export class CheckoutInvoiceDto {
  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  @IsUUID('4', { message: 'customerUserId must be a UUID' })
  customerUserId!: string;

  @ApiProperty({
    type: () => OrderAddressDto,
  })
  @ValidateNested()
  @Type(() => OrderAddressDto)
  billingAddress!: OrderAddressDto;

  @ApiPropertyOptional({
    example: 'Please prepare the invoice for branch pickup.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
