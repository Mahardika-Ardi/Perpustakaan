import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'Laskar Pelangi', description: 'Judul buku' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Andrea Hirata', description: 'Penulis' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author: string;

  @ApiProperty({
    example: '978-979-1234-56-7',
    description: 'ISBN unik (max 32)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  isbn: string;

  @ApiProperty({ example: 'Bentang Pustaka', description: 'Penerbit' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  publisher: string;

  @ApiProperty({ example: 2005, minimum: 1400, maximum: 2100 })
  @IsInt()
  @Min(1400)
  @Max(2100)
  year: number;

  /** Nilai buku dalam rupiah — dasar perhitungan denda kehilangan. */
  @ApiProperty({
    example: 85000,
    minimum: 0,
    description: 'Nilai buku (Rp) — dasar denda kehilangan',
  })
  @IsInt()
  @Min(0)
  value: number;

  /** Opsional; schema Prisma memberi default 1. */
  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    description: 'Stok tersedia (default 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
