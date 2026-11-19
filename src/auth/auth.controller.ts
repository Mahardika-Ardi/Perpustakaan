import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthUser } from '../common/types/auth-user.type.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Anggota baru → bikin User (ANGGOTA) + Member sekaligus. */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrasi anggota baru (publik)',
    description:
      'Membuat User berrole ANGGOTA + Member (kode AGT-xxxx) dalam satu transaksi.',
  })
  @ApiResponse({ status: 201, description: 'Registrasi berhasil' })
  @ApiResponse({ status: 400, description: 'Body tidak valid (validasi DTO)' })
  @ApiResponse({ status: 409, description: 'Email/username sudah terdaftar' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login & ambil token JWT (publik)',
    description:
      'Kirim email + password, dapatkan accessToken untuk header Authorization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil — berisi accessToken',
  })
  @ApiResponse({ status: 401, description: 'Email atau password salah' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Profil user yang sedang login',
    description:
      'Untuk role ANGGOTA, response menyertakan data member terkait.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil user (+ member bila ANGGOTA)',
  })
  @ApiResponse({ status: 401, description: 'Token hilang/salah/kedaluwarsa' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.sub);
  }
}
