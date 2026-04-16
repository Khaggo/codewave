import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  @IsUUID('4', { message: 'customerUserId must be a UUID' })
  customerUserId!: string;

  @ApiProperty({
    example: '22222222-2222-4222-8222-222222222222',
  })
  @IsUUID('4', { message: 'productId must be a UUID' })
  productId!: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
