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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fines')
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Get()
  findAll() {
    return this.finesService.findAll();
  }

  @Get(':id')
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
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() _dto: PayFineDto) {
    return this.finesService.pay(id);
  }
}
