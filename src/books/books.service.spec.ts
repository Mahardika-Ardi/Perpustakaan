import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CreateBookDto } from './dto/create-book.dto.js';

describe('BooksService', () => {
  let service: BooksService;

  const prismaMock = {
    book: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const dto: CreateBookDto = {
    title: 'Pemrograman Web',
    author: 'Budi Santoso',
    isbn: '978-602-001-001',
    publisher: 'Informatika Press',
    year: 2024,
    value: 150000,
    stock: 3,
  };

  const book = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ...dto,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(BooksService);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('hanya mengembalikan buku yang belum di-soft-delete', async () => {
      prismaMock.book.findMany.mockResolvedValue([book]);

      const result = await service.findAll();

      expect(prismaMock.book.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([book]);
    });
  });

  describe('findOne', () => {
    it('mengembalikan buku bila ditemukan', async () => {
      prismaMock.book.findFirst.mockResolvedValue(book);

      const result = await service.findOne(book.id);

      expect(prismaMock.book.findFirst).toHaveBeenCalledWith({
        where: { id: book.id, deletedAt: null },
      });
      expect(result).toEqual(book);
    });

    it('melempar NotFoundException bila id tidak ditemukan', async () => {
      prismaMock.book.findFirst.mockResolvedValue(null);

      await expect(service.findOne('id-tidak-ada')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('membuat buku baru dengan data dari DTO', async () => {
      prismaMock.book.create.mockResolvedValue(book);

      const result = await service.create(dto);

      expect(prismaMock.book.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(book);
    });

    it('melempar ConflictException (409) saat ISBN duplikat', async () => {
      prismaMock.book.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('meneruskan error non-P2002 apa adanya', async () => {
      prismaMock.book.create.mockRejectedValue(new Error('koneksi putus'));

      await expect(service.create(dto)).rejects.toThrow('koneksi putus');
    });
  });

  describe('update', () => {
    it('melempar NotFoundException sebelum mengubah buku yang tidak ada', async () => {
      prismaMock.book.findFirst.mockResolvedValue(null);

      await expect(service.update(book.id, { title: 'Baru' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.book.update).not.toHaveBeenCalled();
    });

    it('memperbarui data buku yang ada', async () => {
      prismaMock.book.findFirst.mockResolvedValue(book);
      prismaMock.book.update.mockResolvedValue({ ...book, title: 'Baru' });

      const result = await service.update(book.id, { title: 'Baru' });

      expect(prismaMock.book.update).toHaveBeenCalledWith({
        where: { id: book.id },
        data: { title: 'Baru' },
      });
      expect(result.title).toBe('Baru');
    });

    it('melempar ConflictException (409) saat ISBN baru duplikat', async () => {
      prismaMock.book.findFirst.mockResolvedValue(book);
      prismaMock.book.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(
        service.update(book.id, { isbn: 'duplikat' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove (soft delete)', () => {
    it('menandai deletedAt, tidak menghapus baris', async () => {
      const now = new Date('2026-02-01T00:00:00.000Z');
      vi.setSystemTime(now);

      prismaMock.book.findFirst.mockResolvedValue(book);
      prismaMock.book.update.mockResolvedValue({
        ...book,
        deletedAt: now,
      });

      await service.remove(book.id);

      expect(prismaMock.book.update).toHaveBeenCalledWith({
        where: { id: book.id },
        data: { deletedAt: now },
      });

      vi.useRealTimers();
    });

    it('melempar NotFoundException bila buku tidak ada', async () => {
      prismaMock.book.findFirst.mockResolvedValue(null);

      await expect(service.remove('id-tidak-ada')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
