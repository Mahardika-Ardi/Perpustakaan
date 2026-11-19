import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'petugas@kampus.ac.id' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'petugas123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
