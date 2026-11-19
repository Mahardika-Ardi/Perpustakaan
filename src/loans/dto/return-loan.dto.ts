import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Input pengembalian: id peminjaman yang dikembalikan. */
export class ReturnLoanDto {
  @ApiProperty({
    format: 'uuid',
    example: '0a1b2c3d-4e5f-4607-8899-aabbccddeeff',
    description: 'ID peminjaman — otomatis disamakan dengan :id di route',
    readOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  loanId: string;
}
