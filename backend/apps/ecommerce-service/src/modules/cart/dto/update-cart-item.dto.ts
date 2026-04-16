import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    example: '55555555-5555-4555-8555-555555555555',
  })
  @IsUUID('4', { message: 'customerUserId must be a UUID' })
  customerUserId!: string;

  @ApiProperty({
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
