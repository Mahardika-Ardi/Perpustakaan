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
import { BooksService } from './books.service.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

/**
 * Route HTTP modul books — hanya meneruskan ke BooksService
 * (lihat docs/structure.md: controller tidak akses database).
 *
 * Proteksi (lihat docs/prd.md → §4):
 * - semua route: wajib login (JwtAuthGuard)
 * - mutasi POST/PATCH/DELETE: khusus role PETUGAS (@Roles)
 * - GET: boleh PETUGAS maupun ANGGOTA yang sudah login
 */
@ApiTags('books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiQuery({
    name: 'deleted',
    required: false,
    description:
      'true → tampilkan hanya buku terhapus (daftar sampah untuk restore). Default: hanya buku aktif.',
    enum: ['true'],
  })
  @ApiOperation({
    summary: 'Daftar buku (wajib login)',
    description: 'Mengembalikan semua buku yang belum di-soft-delete.',
  })
  @ApiResponse({ status: 200, description: 'Daftar buku' })
  @ApiResponse({ status: 401, description: 'Belum login' })
  findAll(@Query('deleted') deleted?: string) {
    return this.booksService.findAll(deleted === 'true');
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID buku (UUID)' })
  @ApiOperation({ summary: 'Detail satu buku (wajib login)' })
  @ApiResponse({ status: 200, description: 'Detail buku' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 404, description: 'Buku tidak ditemukan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tambah buku (khusus PETUGAS)',
    description: 'ISBN harus unik — duplikat ditolak 409.',
  })
  @ApiResponse({ status: 201, description: 'Buku dibuat' })
  @ApiResponse({ status: 400, description: 'Body tidak valid' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 409, description: 'ISBN sudah dipakai' })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.PETUGAS)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID buku (UUID)' })
  @ApiOperation({
    summary: 'Ubah data buku sebagian (khusus PETUGAS)',
    description: 'Hanya field yang dikirim yang diubah.',
  })
  @ApiResponse({ status: 200, description: 'Buku terbarui' })
  @ApiResponse({ status: 400, description: 'Body/UUID tidak valid' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Buku tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'ISBN bentrok dengan buku lain' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID buku (UUID)' })
  @ApiOperation({
    summary: 'Hapus buku (khusus PETUGAS)',
    description: 'Soft delete — data tetap di DB dengan deletedAt terisi.',
  })
  @ApiResponse({ status: 204, description: 'Terhapus (soft delete)' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Buku tidak ditemukan' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.booksService.remove(id);
  }

  @Patch(':id/restore')
  @Roles(Role.PETUGAS)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID buku (UUID)' })
  @ApiOperation({
    summary: 'Restore buku terhapus (khusus PETUGAS)',
    description:
      'Membatalkan soft delete — deletedAt dikosongkan, buku muncul kembali di katalog.',
  })
  @ApiResponse({ status: 200, description: 'Buku aktif kembali' })
  @ApiResponse({ status: 400, description: 'Bukan format UUID' })
  @ApiResponse({ status: 403, description: 'Bukan role PETUGAS' })
  @ApiResponse({ status: 404, description: 'Buku tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Buku tidak dalam status terhapus' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.restore(id);
  }
}
