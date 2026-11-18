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
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nim?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
