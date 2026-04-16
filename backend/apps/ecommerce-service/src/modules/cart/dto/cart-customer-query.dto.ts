import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CartCustomerQueryDto {
  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  @IsUUID('4', { message: 'customerUserId must be a UUID' })
  customerUserId!: string;
}
