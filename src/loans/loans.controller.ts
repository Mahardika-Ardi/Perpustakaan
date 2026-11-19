import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { LoansService } from './loans.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { ReturnLoanDto } from './dto/return-loan.dto.js';

/**
 * Route HTTP modul loans — hanya meneruskan ke LoansService.
 *
 * Proteksi (sesuai keputusan fase 1):
 * - semua route: wajib login (JwtAuthGuard)
 * - mutasi POST/PATCH/DELETE: khusus role PETUGAS (@Roles)
 * - GET: boleh PETUGAS maupun ANGGOTA yang sudah login
 */
@ApiTags('loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @ApiOperation({
    summary: 'Daftar peminjaman (wajib login)',
    description: 'Menyertakan info anggota dan buku untuk tiap peminjaman.',
  })
  @ApiResponse({ status: 200, description: 'Daftar peminjaman' })
  @ApiResponse({ status: 401, description: 'Belum login' })
  findAll() {
    return this.loansService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID peminjaman (UUID)' })
  @ApiOperation({ summary: 'Detail satu peminjaman (wajib login)' })
  @ApiResponse({ status: 200, description: 'Detail peminjaman' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 404, description: 'Peminjaman tidak ditemukan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findOne(id);
  }

  @Post()
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Buat peminjaman (khusus PETUGAS)',
    description:
      '1 peminjaman = 1 buku. Stok dikurangi; jatuh tempo = hari ini + LOAN_DURATION_DAYS (default 7). Ditolak 409 bila stok habis / anggota punya denda belum lunas.',
  })
  @ApiResponse({
    status: 201,
    description: 'Peminjaman dibuat (status DIPINJAM)',
  })
  @ApiResponse({ status: 400, description: 'Body tidak valid' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Buku/anggota tidak ditemukan' })
  @ApiResponse({
    status: 409,
    description: 'Stok habis atau denda belum lunas',
  })
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  /**
   * Mengembalikan buku.
   *
   * Route khusus karena mengubah status loan + stok buku + mungkin membuat fine.
   * Khusus PETUGAS (petugas yang memproses pengembalian di balik meja).
   */
  @Patch(':id/return')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID peminjaman (UUID)' })
  @ApiOperation({
    summary: 'Proses pengembalian buku (khusus PETUGAS)',
    description:
      'Status → DIKEMBALIKAN + stok kembali. Jika lewat jatuh tempo, otomatis dibuat Fine TERLAMBAT (hari terlambat × FINE_PER_DAY).',
  })
  @ApiResponse({
    status: 200,
    description: 'Berhasil — berisi daysOverdue & fineAmount',
  })
  @ApiResponse({
    status: 400,
    description: 'Bukan format UUID / body tidak valid',
  })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Peminjaman tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Sudah dikembalikan sebelumnya' })
  returnLoan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnLoanDto,
  ) {
    // Pastikan loanId di body sama dengan id di param
    dto.loanId = id;
    return this.loansService.returnLoan(dto);
  }

  /**
   * Menandai buku hilang.
   *
   * Membuat fine reason HILANG dengan amount = nilai buku.
   * Khusus PETUGAS.
   */
  @Patch(':id/lost')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID peminjaman (UUID)' })
  @ApiOperation({
    summary: 'Tandai buku hilang (khusus PETUGAS)',
    description:
      'Status → HILANG + Fine HILANG senilai nilai buku. Stok tidak dikembalikan; anggota diblokir pinjam sampai denda lunas.',
  })
  @ApiResponse({ status: 200, description: 'Ditandai hilang (status HILANG)' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Peminjaman tidak ditemukan' })
  @ApiResponse({
    status: 409,
    description: 'Sudah HILANG / sudah DIKEMBALIKAN',
  })
  markLost(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.markLost(id);
  }

  @Delete(':id')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID peminjaman (UUID)' })
  @ApiOperation({
    summary: 'Hapus peminjaman (khusus PETUGAS)',
    description: 'Soft delete — data tetap di DB dengan deletedAt terisi.',
  })
  @ApiResponse({ status: 204, description: 'Terhapus (soft delete)' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Peminjaman tidak ditemukan' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.loansService.remove(id);
  }
}
