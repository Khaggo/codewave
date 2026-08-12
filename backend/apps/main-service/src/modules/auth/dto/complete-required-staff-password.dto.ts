import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CompleteRequiredStaffPasswordDto {
  @ApiProperty({
    description: 'Short-lived password-change token returned by the first successful staff login.',
  })
  @IsString()
  @MinLength(20)
  passwordChangeToken!: string;

  @ApiProperty({ example: 'A-New-Private-Password-123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
