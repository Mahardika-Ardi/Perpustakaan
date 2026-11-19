import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Data baru anggota — kode (AGT-xxxx) dihasilkan otomatis oleh service. */
export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

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

  /** Opsional: sambungkan ke User yang sudah ada (1:1). Bila kosong, Member masih dibuat tanpa akun login. */
  @IsOptional()
  @IsString()
  userId?: string;
}
