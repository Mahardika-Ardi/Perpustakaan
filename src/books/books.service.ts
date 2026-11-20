import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

/**
 * Logika bisnis katalog buku.
 *
 * Sesuai docs/structure.md: service ini satu-satunya tempat yang menyentuh
 * database untuk modul books — controller tidak boleh memanggil Prisma.
 */
@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daftar buku.
   *
   * @param deleted false (default) → hanya buku aktif;
   *                true → hanya yang terhapus (daftar sampah, untuk restore).
   */
  findAll(deleted = false) {
    return this.prisma.book.findMany({
      where: deleted ? { deletedAt: { not: null } } : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findFirst({
      where: { id, deletedAt: null },
    });

    if (!book) {
      throw new NotFoundException(`Buku dengan id "${id}" tidak ditemukan`);
    }

    return book;
  }

  async create(dto: CreateBookDto) {
    try {
      return await this.prisma.book.create({ data: dto });
    } catch (error) {
      this.rethrowAsConflict(error);
    }
  }

  async update(id: string, dto: UpdateBookDto) {
    // Pastikan buku masih ada & belum di-soft-delete sebelum diubah.
    await this.findOne(id);

    try {
      return await this.prisma.book.update({ where: { id }, data: dto });
    } catch (error) {
      this.rethrowAsConflict(error);
    }
  }

  /**
   * Soft delete — baris tidak benar-benar dihapus agar riwayat peminjaman
   * tetap utuh (lihat docs/erd.md → Catatan Desain).
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.book.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore buku yang di-soft-delete (kebalikan remove) — mengosongkan
   * deletedAt agar buku muncul kembali di katalog.
   */
  async restore(id: string) {
    const book = await this.prisma.book.findFirst({ where: { id } });

    if (!book) {
      throw new NotFoundException(`Buku dengan id "${id}" tidak ditemukan`);
    }

    if (book.deletedAt === null) {
      throw new ConflictException('Buku tidak dalam status terhapus');
    }

    return this.prisma.book.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * P2002 = pelanggaran unique constraint (ISBN) → balas 409.
   * Error lain dilempar ulang apa adanya.
   */
  private rethrowAsConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('ISBN sudah terdaftar untuk buku lain');
    }

    throw error;
  }
}
