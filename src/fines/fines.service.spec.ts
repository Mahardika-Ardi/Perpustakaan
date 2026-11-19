import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FinesService } from './fines.service.js';
import { PrismaService } from '../common/prisma/prisma.service.js';

describe('FinesService', () => {
  let service: FinesService;

  const fineId = 'fine-id-1';

  const createdFine = {
    id: fineId,
    amount: 30000,
    reason: 'TERLAMBAT',
    status: 'BELUM_LUNAS',
    paidAt: null,
    deletedAt: null,
  };

  const prismaMock = {
    fine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(FinesService);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('mengembalikan daftar denda', async () => {
      const data = [createdFine];
      prismaMock.fine.findMany.mockResolvedValue(data);

      const result = await service.findAll();

      expect(result).toEqual(data);
      expect(prismaMock.fine.findMany).toHaveBeenCalledWith({
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
    });
  });

  describe('findOne', () => {
    it('mengembalikan denda bila ditemukan', async () => {
      prismaMock.fine.findFirst.mockResolvedValue(createdFine);

      const result = await service.findOne(fineId);

      expect(result).toEqual(createdFine);
      expect(prismaMock.fine.findFirst).toHaveBeenCalledWith({
        where: { id: fineId },
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
    });

    it('melempar NotFoundException bila denda tidak ada', async () => {
      prismaMock.fine.findFirst.mockResolvedValue(null);

      await expect(service.findOne('id-salah')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('pay', () => {
    it('melunaskan denda yang BELUM_LUNAS', async () => {
      const updatedFine = {
        ...createdFine,
        status: 'LUNAS',
        paidAt: new Date(),
      };
      prismaMock.fine.findFirst.mockResolvedValue(createdFine);
      prismaMock.fine.update.mockResolvedValue(updatedFine);

      const result = await service.pay(fineId);

      expect(result.status).toBe('LUNAS');
      expect(result.paidAt).toBeDefined();
      expect(prismaMock.fine.update).toHaveBeenCalledWith({
        where: { id: fineId },
        data: { status: 'LUNAS', paidAt: expect.any(Date) },
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
    });

    it('melempar NotFoundException bila denda tidak ada', async () => {
      prismaMock.fine.findFirst.mockResolvedValue(null);

      await expect(service.pay('id-salah')).rejects.toThrow(NotFoundException);
    });

    it('melempar error bila denda sudah LUNAS', async () => {
      prismaMock.fine.findFirst.mockResolvedValue({
        ...createdFine,
        status: 'LUNAS',
      });

      await expect(service.pay(fineId)).rejects.toThrow(
        'Denda sudah dilunasi sebelumnya',
      );
    });
  });
});
