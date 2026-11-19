import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Input peminjaman: satu anggota meminjam satu buku. */
export class CreateLoanDto {
  @ApiProperty({
    format: 'uuid',
    example: 'd8bcdad5-7486-4d22-8347-ca2cb83a71a1',
    description: 'ID anggota (Member) yang meminjam',
  })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({
    format: 'uuid',
    example: '6f1a2b3c-4d5e-4f60-8172-938475a6b7c8',
    description: 'ID buku yang dipinjam (harus stok > 0)',
  })
  @IsString()
  @IsNotEmpty()
  bookId: string;
}
