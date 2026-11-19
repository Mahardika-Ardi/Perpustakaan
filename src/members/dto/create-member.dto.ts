import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Data baru anggota — kode (AGT-xxxx) dihasilkan otomatis oleh service. */
export class CreateMemberDto {
  @ApiProperty({ example: 'Siti Aminah', description: 'Nama lengkap anggota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'siti@kampus.ac.id', description: 'Email anggota' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '089876543210', description: 'Nomor telepon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @ApiPropertyOptional({ example: '2026005555', description: 'NIM (opsional)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nim?: string;

  @ApiPropertyOptional({
    example: 'Jalan Kenanga 5, Surabaya',
    description: 'Alamat (opsional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  /** Opsional: sambungkan ke User yang sudah ada (1:1). Bila kosong, Member masih dibuat tanpa akun login. */
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID User yang sudah ada untuk dijadikan akun login (opsional)',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
