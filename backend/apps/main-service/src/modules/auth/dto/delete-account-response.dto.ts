import { ApiProperty } from '@nestjs/swagger';

export class DeleteAccountResponseDto {
  @ApiProperty({
    example: 'account_soft_deleted',
  })
  status!: string;

  @ApiProperty({
    example: 'The account was archived successfully. You can sign up again with the same email later.',
  })
  message!: string;
}
