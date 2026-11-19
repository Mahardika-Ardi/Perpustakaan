import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

/**
 * Logika bisnis denda.
 *
 * Service satu-satunya tempat yang menyentuh database untuk modul fines.
 * Controller tidak boleh memanggil Prisma langsung.
 */
@Injectable()
export class FinesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Daftar semua denda, yang belum lunas diurutkan di atas. */
  findAll() {
    return this.prisma.fine.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        loan: {
          select: {
            id: true,
            member: { select: { id: true, code: true, name: true } },
            book: { select: { id: true, title: true, isbn: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const fine = await this.prisma.fine.findFirst({
      where: { id },
      include: {
        loan: {
          select: {
            id: true,
            status: true,
            member: { select: { id: true, code: true, name: true } },
            book: { select: { id: true, title: true, isbn: true } },
          },
        },
      },
    });

    if (!fine) {
      throw new NotFoundException(`Denda dengan id "${id}" tidak ditemukan`);
    }

    return fine;
  }

  /**
   * Melunaskan denda.
   *
   * Hanya denda dengan status BELUM_LUNAS yang bisa dibayar.
   * Setelah pelunasan: status → LUNAS, paidAt diisi waktu sekarang.
   */
  async pay(id: string) {
    const fine = await this.prisma.fine.findFirst({
      where: { id },
    });

    if (!fine) {
      throw new NotFoundException(`Denda dengan id "${id}" tidak ditemukan`);
    }

    if (fine.status === 'LUNAS') {
      throw new Error('Denda sudah dilunasi sebelumnya');
    }

    return await this.prisma.fine.update({
      where: { id },
      data: {
        status: 'LUNAS',
        paidAt: new Date(),
      },
      include: {
        loan: {
          select: {
            id: true,
            member: { select: { id: true, code: true, name: true } },
            book: { select: { id: true, title: true } },
          },
        },
      },
    });
  }
}
