import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LoansService } from './loans.service.js';
import { PrismaService } from '../common/prisma/prisma.service.js';

const memberId = 'member-id-1';
const bookId = 'book-id-1';
const loanId = 'loan-id-1';

const book = {
  id: bookId,
  stock: 3,
  title: 'Pemrograman Web',
};

const member = {
  id: memberId,
  code: 'AGT-0001',
  name: 'Budi Santoso',
};

const createdLoan = {
  id: loanId,
  memberId,
  bookId,
  status: 'DIPINJAM',
  borrowedAt: new Date('2026-11-18T00:00:00Z'),
  dueAt: new Date('2026-11-25T00:00:00Z'),
  returnedAt: null,
  deletedAt: null,
};

describe('LoansService', () => {
  let service: LoansService;

  const prismaMock = {
    book: { findFirst: vi.fn(), update: vi.fn() },
    member: { findFirst: vi.fn() },
    fine: { findFirst: vi.fn(), create: vi.fn() },
    loan: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    // $transaction langsung mengeksekusi callback dengan mock transaksi
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(LoansService);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('mengembalikan daftar peminjaman aktif', async () => {
      const data = [createdLoan];
      prismaMock.loan.findFirst.mockResolvedValue(data[0]);
      prismaMock.loan.findMany = vi.fn().mockResolvedValue(data);

      const result = await service.findAll();

      expect(result).toEqual(data);
      expect(prismaMock.loan.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { borrowedAt: 'desc' },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
          fine: { select: { id: true, amount: true, status: true } },
        },
      });
    });

    it('mengembalikan hanya peminjaman terhapus bila deleted=true', async () => {
      prismaMock.loan.findMany = vi.fn().mockResolvedValue([]);

      await service.findAll(true);

      expect(prismaMock.loan.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
        orderBy: { borrowedAt: 'desc' },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
          fine: { select: { id: true, amount: true, status: true } },
        },
      });
    });
  });

  describe('findOne', () => {
    it('mengembalikan peminjaman bila ditemukan', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(createdLoan);

      const result = await service.findOne(loanId);

      expect(result).toEqual(createdLoan);
      expect(prismaMock.loan.findFirst).toHaveBeenCalledWith({
        where: { id: loanId, deletedAt: null },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
          fine: { select: { id: true, amount: true, status: true } },
        },
      });
    });

    it('melempar NotFoundException bila peminjaman tidak ada', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(null);

      await expect(service.findOne('id-salah')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = { memberId, bookId } as never;

    it('membuat peminjaman, mengurangi stok, dan mengembalikan loan', async () => {
      prismaMock.book.findFirst.mockResolvedValue(book);
      prismaMock.member.findFirst.mockResolvedValue(member);
      prismaMock.fine.findFirst.mockResolvedValue(null);
      prismaMock.loan.create.mockResolvedValue(createdLoan);
      prismaMock.book.update.mockResolvedValue({ ...book, stock: 2 });

      const result = await service.create(dto);

      expect(prismaMock.book.findFirst).toHaveBeenCalledWith({
        where: { id: bookId, deletedAt: null },
        select: { id: true, stock: true, title: true },
      });
      expect(prismaMock.member.findFirst).toHaveBeenCalledWith({
        where: { id: memberId, deletedAt: null },
        select: { id: true, code: true, name: true },
      });
      expect(prismaMock.fine.findFirst).toHaveBeenCalledWith({
        where: {
          loan: { memberId },
          status: 'BELUM_LUNAS',
        },
        select: { id: true, amount: true, reason: true },
      });
      expect(prismaMock.loan.create).toHaveBeenCalledWith({
        data: {
          memberId,
          bookId,
          borrowedAt: expect.any(Date),
          dueAt: expect.any(Date),
          status: 'DIPINJAM',
        },
        include: {
          member: { select: { id: true, code: true, name: true } },
          book: { select: { id: true, title: true, isbn: true } },
        },
      });
      expect(prismaMock.book.update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { stock: { decrement: 1 } },
      });
      expect(result).toEqual(createdLoan);
    });

    it('melempar NotFoundException bila buku tidak ada', async () => {
      prismaMock.book.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('melempar NotFoundException bila anggota tidak ada', async () => {
      prismaMock.book.findFirst.mockResolvedValue(book);
      prismaMock.member.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('melempar ConflictException bila stok habis', async () => {
      prismaMock.book.findFirst.mockResolvedValue({ ...book, stock: 0 });
      prismaMock.member.findFirst.mockResolvedValue(member);
      prismaMock.fine.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('melempar ConflictException bila anggota punya fine belum lunas', async () => {
      prismaMock.book.findFirst.mockResolvedValue(book);
      prismaMock.member.findFirst.mockResolvedValue(member);
      prismaMock.fine.findFirst.mockResolvedValue({
        id: 'fine-id-1',
        amount: 15000,
        reason: 'TERLAMBAT',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('returnLoan', () => {
    const dto = { loanId } as never;

    it('mengembalikan buku tepat waktu tanpa fine', async () => {
      const loanWithBook = { ...createdLoan, book };
      prismaMock.loan.findFirst.mockResolvedValue(loanWithBook);
      prismaMock.loan.update.mockResolvedValue({
        ...loanWithBook,
        returnedAt: new Date(),
        status: 'DIKEMBALIKAN',
      });
      prismaMock.book.update.mockResolvedValue({ ...book, stock: 3 });

      const result = await service.returnLoan(dto);

      expect(result.status).toBe('DIKEMBALIKAN');
      expect(result.daysOverdue).toBe(0);
      expect(result.fineAmount).toBe(0);
      expect(prismaMock.fine.create).not.toHaveBeenCalled();
      expect(prismaMock.book.update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { stock: { increment: 1 } },
      });
    });

    it('membuat fine TERLAMBAT bila terlambat', async () => {
      const overdueLoan = {
        ...createdLoan,
        book,
        dueAt: new Date('2026-11-20T00:00:00Z'), // jatuh tempo 20 Nov
      };
      // returnedAt akan diset service ke now (26 Nov), terlambat 6 hari
      vi.useFakeTimers().setSystemTime(new Date('2026-11-26T00:00:00Z'));

      prismaMock.loan.findFirst.mockResolvedValue(overdueLoan);
      prismaMock.loan.update.mockResolvedValue({
        ...overdueLoan,
        returnedAt: new Date('2026-11-26T00:00:00Z'),
        status: 'DIKEMBALIKAN',
      });
      prismaMock.book.update.mockResolvedValue({ ...book, stock: 3 });
      prismaMock.fine.create.mockResolvedValue({
        id: 'fine-id-1',
        amount: 30000,
        reason: 'TERLAMBAT',
        status: 'BELUM_LUNAS',
      });

      const result = await service.returnLoan(dto);

      expect(result.daysOverdue).toBe(6);
      expect(result.fineAmount).toBe(30000); // 6 * 5000
      expect(prismaMock.fine.create).toHaveBeenCalledWith({
        data: {
          loanId,
          amount: 30000,
          reason: 'TERLAMBAT',
          status: 'BELUM_LUNAS',
        },
      });

      vi.useRealTimers();
    });

    it('melempar NotFoundException bila peminjaman tidak ada', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(null);

      await expect(service.returnLoan(dto)).rejects.toThrow(NotFoundException);
    });

    it('melempar ConflictException bila sudah dikembalikan', async () => {
      prismaMock.loan.findFirst.mockResolvedValue({
        ...createdLoan,
        status: 'DIKEMBALIKAN',
      });

      await expect(service.returnLoan(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('markLost', () => {
    it('menandai hilang dan membuat fine HILANG dengan nilai buku', async () => {
      const loanWithBook = {
        ...createdLoan,
        book: { ...book, value: 150000 },
      };
      prismaMock.loan.findFirst.mockResolvedValue(loanWithBook);
      prismaMock.loan.update.mockResolvedValue({
        ...loanWithBook,
        status: 'HILANG',
        returnedAt: new Date(),
      });
      prismaMock.fine.create.mockResolvedValue({
        id: 'fine-id-1',
        amount: 150000,
        reason: 'HILANG',
        status: 'BELUM_LUNAS',
      });

      const result = await service.markLost(loanId);

      expect(result.status).toBe('HILANG');
      expect(result.fineAmount).toBe(150000);
      expect(result.fineReason).toBe('HILANG');
      expect(prismaMock.fine.create).toHaveBeenCalledWith({
        data: {
          loanId,
          amount: 150000,
          reason: 'HILANG',
          status: 'BELUM_LUNAS',
        },
      });
    });

    it('melempar ConflictException bila sudah hilang', async () => {
      prismaMock.loan.findFirst.mockResolvedValue({
        ...createdLoan,
        status: 'HILANG',
      });

      await expect(service.markLost(loanId)).rejects.toThrow(ConflictException);
    });

    it('melempar ConflictException bila sudah dikembalikan', async () => {
      prismaMock.loan.findFirst.mockResolvedValue({
        ...createdLoan,
        status: 'DIKEMBALIKAN',
      });

      await expect(service.markLost(loanId)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-delete peminjaman', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(createdLoan);
      prismaMock.loan.update.mockResolvedValue({
        ...createdLoan,
        deletedAt: new Date(),
      });

      const result = await service.remove(loanId);

      expect(result.deletedAt).toBeDefined();
      expect(prismaMock.loan.update).toHaveBeenCalledWith({
        where: { id: loanId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('melempar NotFoundException bila peminjaman tidak ada', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(null);

      await expect(service.remove('id-salah')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    const deletedLoan = {
      ...createdLoan,
      deletedAt: new Date('2026-02-01T00:00:00.000Z'),
    };

    it('mengosongkan deletedAt sehingga peminjaman muncul kembali', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(deletedLoan);
      prismaMock.loan.update.mockResolvedValue({
        ...deletedLoan,
        deletedAt: null,
      });

      const result = await service.restore(loanId);

      expect(result.deletedAt).toBeNull();
      expect(prismaMock.loan.update).toHaveBeenCalledWith({
        where: { id: loanId },
        data: { deletedAt: null },
      });
    });

    it('melempar NotFoundException bila peminjaman tidak ada', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(null);

      await expect(service.restore('id-salah')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.loan.update).not.toHaveBeenCalled();
    });

    it('melempar ConflictException (409) bila tidak terhapus', async () => {
      prismaMock.loan.findFirst.mockResolvedValue(createdLoan);

      await expect(service.restore(loanId)).rejects.toThrow(ConflictException);
      expect(prismaMock.loan.update).not.toHaveBeenCalled();
    });
  });
});
