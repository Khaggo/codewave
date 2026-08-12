import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RetryStaffCredentialDeliveryDto {
  @ApiProperty({ example: 'maria482.staff@autocare.com' })
  @IsEmail()
  email!: string;
}
