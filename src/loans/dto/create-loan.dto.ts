import { IsNotEmpty, IsString } from 'class-validator';

/** Input peminjaman: satu anggota meminjam satu buku. */
export class CreateLoanDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  bookId: string;
}
