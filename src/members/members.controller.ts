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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { MembersService } from './members.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';

/**
 * Route HTTP modul members — hanya meneruskan ke MembersService.
 *
 * Proteksi (sesuai keputusan fase 1):
 * - semua route: wajib login (JwtAuthGuard)
 * - mutasi POST/PATCH/DELETE: khusus role PETUGAS (@Roles)
 * - GET: boleh PETUGAS maupun ANGGOTA yang sudah login
 */
@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiQuery({
    name: 'deleted',
    required: false,
    description:
      'true → tampilkan hanya anggota terhapus (daftar sampah untuk restore). Default: hanya anggota aktif.',
    enum: ['true'],
  })
  @ApiOperation({
    summary: 'Daftar anggota (wajib login)',
    description: 'Termasuk data user terkait bila anggota punya akun login.',
  })
  @ApiResponse({ status: 200, description: 'Daftar anggota' })
  @ApiResponse({ status: 401, description: 'Belum login' })
  findAll(@Query('deleted') deleted?: string) {
    return this.membersService.findAll(deleted === 'true');
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID anggota (UUID)' })
  @ApiOperation({ summary: 'Detail satu anggota (wajib login)' })
  @ApiResponse({ status: 200, description: 'Detail anggota' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 404, description: 'Anggota tidak ditemukan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tambah anggota manual (khusus PETUGAS)',
    description:
      'Kode AGT-xxxx digenerate otomatis; userId opsional bila ingin anggota punya akun login.',
  })
  @ApiResponse({ status: 201, description: 'Anggota dibuat' })
  @ApiResponse({ status: 400, description: 'Body tidak valid' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'userId tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Email/telepon bentrok' })
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.PETUGAS)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID anggota (UUID)' })
  @ApiOperation({
    summary: 'Ubah data anggota sebagian (khusus PETUGAS)',
    description: 'Hanya field yang dikirim yang diubah.',
  })
  @ApiResponse({ status: 200, description: 'Anggota terbarui' })
  @ApiResponse({ status: 400, description: 'Body/UUID tidak valid' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Anggota tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Email/telepon bentrok' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID anggota (UUID)' })
  @ApiOperation({
    summary: 'Hapus anggota (khusus PETUGAS)',
    description: 'Soft delete — data tetap di DB dengan deletedAt terisi.',
  })
  @ApiResponse({ status: 204, description: 'Terhapus (soft delete)' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Anggota tidak ditemukan' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.membersService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID anggota (UUID)' })
  @ApiOperation({
    summary: 'Restore anggota terhapus (khusus PETUGAS)',
    description:
      'Membatalkan soft delete — deletedAt dikosongkan dan akun login (User) ikut diaktifkan kembali.',
  })
  @ApiResponse({ status: 200, description: 'Anggota aktif kembali' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Anggota tidak ditemukan' })
  @ApiResponse({
    status: 409,
    description: 'Anggota tidak dalam status terhapus',
  })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.restore(id);
  }
}
