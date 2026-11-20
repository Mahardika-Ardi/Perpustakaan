import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { ReturnLoanDto } from './dto/return-loan.dto.js';

/**
 * Logika bisnis peminjaman & pengembalian buku.
 *
 * Service satu-satunya tempat yang menyentuh database untuk modul loans.
 * Controller tidak boleh memanggil Prisma langsung.
 */
@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Durasi pinjam default dalam hari (bisa di-override via env). */
  private readonly loanDurationDays = Number(
    process.env.LOAN_DURATION_DAYS ?? 7,
  );

  /** Denda per hari terlambat (bisa di-override via env). */
  private readonly finePerDay = Number(process.env.FINE_PER_DAY ?? 5000);

  /**
   * Daftar peminjaman & riwayat.
   *
   * @param deleted false (default) → hanya yang aktif;
   *                true → hanya yang terhapus (daftar sampah, untuk restore).
   */
  findAll(deleted = false) {
    return this.prisma.loan.findMany({
      where: deleted ? { deletedAt: { not: null } } : { deletedAt: null },
      orderBy: { borrowedAt: 'desc' },
      include: {
        member: { select: { id: true, code: true, name: true } },
        book: { select: { id: true, title: true, isbn: true } },
        fine: { select: { id: true, amount: true, status: true } },
      },
    });
  }

  async findOne(id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, deletedAt: null },
      include: {
        member: { select: { id: true, code: true, name: true } },
        book: { select: { id: true, title: true, isbn: true } },
        fine: { select: { id: true, amount: true, status: true } },
      },
    });

    if (!loan) {
      throw new NotFoundException(
        `Peminjaman dengan id "${id}" tidak ditemukan`,
      );
    }

    return loan;
  }

  /**
   * Membuat peminjaman baru.
   *
   * Aturan:
   * - Buku harus tersedia (stock > 0, belum soft-delete)
   * - Anggota tidak boleh punya fine belum lunas (blokir pinjam baru, 409)
   * - Satu peminjaman = satu buku (tidak ada pivot)
   */
  async create(dto: CreateLoanDto) {
    const [book, member, unpaidFine] = await Promise.all([
      this.prisma.book.findFirst({
        where: { id: dto.bookId, deletedAt: null },
        select: { id: true, stock: true, title: true },
      }),
      this.prisma.member.findFirst({
        where: { id: dto.memberId, deletedAt: null },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.fine.findFirst({
        where: {
          loan: { memberId: dto.memberId },
          status: 'BELUM_LUNAS',
        },
        select: { id: true, amount: true, reason: true },
      }),
    ]);

    if (!book) {
      throw new NotFoundException(
        `Buku dengan id "${dto.bookId}" tidak ditemukan`,
      );
    }

    if (!member) {
      throw new NotFoundException(
        `Anggota dengan id "${dto.memberId}" tidak ditemukan`,
      );
    }

    if (book.stock <= 0) {
      throw new ConflictException('Stok buku habis, tidak bisa dipinjam');
    }

    if (unpaidFine) {
      throw new ConflictException(
        `Anggota memiliki denda belum lunas (Rp${unpaidFine.amount}). Lunaskan dulu sebelum meminjam buku baru.`,
      );
    }

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + this.loanDurationDays);

    return await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          memberId: dto.memberId,
          bookId: dto.bookId,
          borrowedAt: new Date(),
          dueAt,
          status: 'DIPINJAM',
        },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
        },
      });

      await tx.book.update({
        where: { id: dto.bookId },
        data: { stock: { decrement: 1 } },
      });

      return loan;
    });
  }

  /**
   * Mengembalikan buku yang dipinjam.
   *
   * - Mengisi returnedAt, mengubah status menjadi DIKEMBALIKAN
   * - Mengembalikan stok buku
   * - Jika terlambat, membuat Fine reason TERLAMBAT dengan amount = terlambat × FINE_PER_DAY
   */
  async returnLoan(dto: ReturnLoanDto) {
    const loan = await this.prisma.loan.findFirst({
      where: { id: dto.loanId, deletedAt: null },
      include: { book: { select: { id: true, title: true, stock: true } } },
    });

    if (!loan) {
      throw new NotFoundException(
        `Peminjaman dengan id "${dto.loanId}" tidak ditemukan`,
      );
    }

    if (loan.status === 'DIKEMBALIKAN') {
      throw new ConflictException('Buku sudah dikembalikan sebelumnya');
    }

    const returnedAt = new Date();
    let daysOverdue = 0;
    let fineAmount = 0;

    if (returnedAt > loan.dueAt) {
      const diffMs = returnedAt.getTime() - loan.dueAt.getTime();
      daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * this.finePerDay;
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: dto.loanId },
        data: {
          returnedAt,
          status: 'DIKEMBALIKAN',
        },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
        },
      });

      await tx.book.update({
        where: { id: loan.bookId },
        data: { stock: { increment: 1 } },
      });

      // Buat fine bila terlambat
      if (fineAmount > 0) {
        await tx.fine.create({
          data: {
            loanId: dto.loanId,
            amount: fineAmount,
            reason: 'TERLAMBAT',
            status: 'BELUM_LUNAS',
          },
        });
      }

      return {
        ...updatedLoan,
        daysOverdue,
        fineAmount,
      };
    });
  }

  /**
   * Menandai buku hilang.
   *
   * - Mengubah status menjadi HILANG
   * - Membuat Fine reason HILANG dengan amount = nilai buku (book.value)
   * - Stok tidak dikembalikan (buku hilang)
   */
  async markLost(id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, deletedAt: null },
      include: { book: { select: { id: true, title: true, value: true } } },
    });

    if (!loan) {
      throw new NotFoundException(
        `Peminjaman dengan id "${id}" tidak ditemukan`,
      );
    }

    if (loan.status === 'HILANG') {
      throw new ConflictException('Buku sudah ditandai hilang sebelumnya');
    }

    if (loan.status === 'DIKEMBALIKAN') {
      throw new ConflictException(
        'Buku yang sudah dikembalikan tidak dapat ditandai hilang',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id },
        data: { status: 'HILANG', returnedAt: new Date() },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
        },
      });

      await tx.fine.create({
        data: {
          loanId: id,
          amount: loan.book.value,
          reason: 'HILANG',
          status: 'BELUM_LUNAS',
        },
      });

      return {
        ...updatedLoan,
        fineAmount: loan.book.value,
        fineReason: 'HILANG',
      };
    });
  }

  /**
   * Soft delete peminjaman (hanya untuk pembatalan data salah, bukan pengembalian fisik).
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.loan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore peminjaman yang di-soft-delete (kebalikan remove) — mengosongkan
   * deletedAt agar riwayat muncul kembali.
   */
  async restore(id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id } });

    if (!loan) {
      throw new NotFoundException(
        `Peminjaman dengan id "${id}" tidak ditemukan`,
      );
    }

    if (loan.deletedAt === null) {
      throw new ConflictException('Peminjaman tidak dalam status terhapus');
    }

    return this.prisma.loan.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
