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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  findAll() {
    return this.loansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findOne(id);
  }

  @Post()
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.CREATED)
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
  markLost(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.markLost(id);
  }

  @Delete(':id')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.loansService.remove(id);
  }
}
