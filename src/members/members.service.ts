import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';

/**
 * Logika bisnis data anggota.
 *
 * Service satu-satunya tempat yang menyentuh database untuk modul members.
 * Controller tidak boleh memanggil Prisma langsung.
 */
@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daftar anggota.
   *
   * @param deleted false (default) → hanya anggota aktif;
   *                true → hanya yang terhapus (daftar sampah, untuk restore).
   */
  findAll(deleted = false) {
    return this.prisma.member.findMany({
      where: deleted ? { deletedAt: { not: null } } : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!member) {
      throw new NotFoundException(`Anggota dengan id "${id}" tidak ditemukan`);
    }

    return member;
  }

  async create(dto: CreateMemberDto) {
    try {
      return await this.prisma.member.create({
        data: {
          code: await this.generateMemberCode(),
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          nim: dto.nim,
          address: dto.address,
          userId: dto.userId,
        },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    } catch (error) {
      this.rethrowAsConflict(error);
    }
  }

  async update(id: string, dto: UpdateMemberDto) {
    // Pastikan anggota masih ada & belum di-soft-delete sebelum diubah.
    await this.findOne(id);

    try {
      return await this.prisma.member.update({
        where: { id },
        data: dto,
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    } catch (error) {
      this.rethrowAsConflict(error);
    }
  }

  /**
   * Soft delete — baris tidak benar-benar dihapus agar riwayat peminjaman
   * tetap utuh (lihat docs/erd.md → Catatan Desain).
   *
   * Cascade: akun login (User) ikut dinonaktifkan supaya anggota terhapus
   * tidak bisa login lagi — lihat docs/erd.md → Catatan Desain.
   */
  async remove(id: string) {
    const member = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.member.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      if (member.userId) {
        await tx.user.update({
          where: { id: member.userId },
          data: { deletedAt: new Date() },
        });
      }

      return deleted;
    });
  }

  /**
   * Restore anggota yang di-soft-delete (kebalikan remove).
   *
   * Dalam satu transaksi: deletedAt anggota dikosongkan + akun login (User)
   * ikut diaktifkan kembali supaya anggota bisa login lagi.
   */
  async restore(id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!member) {
      throw new NotFoundException(`Anggota dengan id "${id}" tidak ditemukan`);
    }

    if (member.deletedAt === null) {
      throw new ConflictException('Anggota tidak dalam status terhapus');
    }

    return this.prisma.$transaction(async (tx) => {
      const restored = await tx.member.update({
        where: { id },
        data: { deletedAt: null },
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      if (member.userId) {
        await tx.user.update({
          where: { id: member.userId },
          data: { deletedAt: null },
        });
      }

      return restored;
    });
  }

  /** Kode anggota berurutan: AGT-0001, AGT-0002, ... (unik, ditangani Prisma). */
  private async generateMemberCode(): Promise<string> {
    const count = await this.prisma.member.count({
      where: { deletedAt: null },
    });

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `AGT-${String(count + 1 + attempt).padStart(4, '0')}`;
      const taken = await this.prisma.member.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!taken) {
        return code;
      }
    }

    throw new ConflictException('Gagal membuat kode anggota unik, coba lagi');
  }

  /** P2002 = pelanggaran unique constraint (email / code) → balas 409. */
  private rethrowAsConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : String(error.meta?.target ?? '');

      if (target.includes('email')) {
        throw new ConflictException('Email sudah terdaftar untuk anggota lain');
      }

      if (target.includes('code')) {
        throw new ConflictException('Kode anggota sudah terpakai, coba lagi');
      }

      throw new ConflictException('Data bentrok dengan data yang sudah ada');
    }

    throw error;
  }
}
