import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  isbn: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  publisher: string;

  @IsInt()
  @Min(1400)
  @Max(2100)
  year: number;

  /** Nilai buku dalam rupiah — dasar perhitungan denda kehilangan. */
  @IsInt()
  @Min(0)
  value: number;

  /** Opsional; schema Prisma memberi default 1. */
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
