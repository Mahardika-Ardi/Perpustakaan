import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Pendaftaran anggota: sekaligus membuat akun login (User, role ANGGOTA)
 * dan data identitas (Member) — lihat docs/erd.md.
 */
export class RegisterDto {
  @ApiProperty({ example: 'budi@kampus.ac.id', description: 'Email unik' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'budikampus',
    description: 'Username unik (opsional, max 50)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiProperty({
    example: 'rahasia123',
    description: 'Password minimal 8 karakter (di-hash argon2id)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Budi Santoso', description: 'Nama lengkap anggota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '081234567890', description: 'Nomor telepon' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @ApiPropertyOptional({ example: '2026001234', description: 'NIM (opsional)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nim?: string;

  @ApiPropertyOptional({
    example: 'Jalan Merdeka 1, Bandung',
    description: 'Alamat (opsional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
