import { IsNotEmpty, IsString } from 'class-validator';

/** Input pengembalian: id peminjaman yang dikembalikan. */
export class ReturnLoanDto {
  @IsString()
  @IsNotEmpty()
  loanId: string;
}
