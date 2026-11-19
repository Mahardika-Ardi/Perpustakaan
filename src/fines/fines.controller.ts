import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { FinesService } from './fines.service.js';
import { PayFineDto } from './dto/pay-fine.dto.js';

/**
 * Route HTTP modul fines — hanya meneruskan ke FinesService.
 *
 * Proteksi (sesuai keputusan fase 1):
 * - semua route: wajib login (JwtAuthGuard)
 * - PATCH /fines/:id/pay: khusus role PETUGAS (@Roles)
 * - GET: boleh PETUGAS maupun ANGGOTA yang sudah login
 */
@ApiTags('fines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fines')
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Get()
  @ApiOperation({
    summary: 'Daftar denda (wajib login)',
    description:
      'Menyertakan info loan, anggota, dan buku terkait. Dibuat saat terlambat (TERLAMBAT) atau kehilangan (HILANG).',
  })
  @ApiResponse({ status: 200, description: 'Daftar denda' })
  @ApiResponse({ status: 401, description: 'Belum login' })
  findAll() {
    return this.finesService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID denda (UUID)' })
  @ApiOperation({ summary: 'Detail satu denda (wajib login)' })
  @ApiResponse({ status: 200, description: 'Detail denda' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 404, description: 'Denda tidak ditemukan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.finesService.findOne(id);
  }

  /**
   * Melunaskan denda.
   *
   * Khusus PETUGAS (petugas yang memproses pelunasan di balik meja).
   */
  @Patch(':id/pay')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID denda (UUID)' })
  @ApiOperation({
    summary: 'Lunaskan denda (khusus PETUGAS)',
    description:
      'BELUM_LUNAS → LUNAS + paidAt terisi. Membuka blokir pinjam baru bagi anggota tersebut.',
  })
  @ApiResponse({ status: 200, description: 'Denda lunas (status LUNAS)' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Denda tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Sudah lunas sebelumnya' })
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() _dto: PayFineDto) {
    return this.finesService.pay(id);
  }
}
