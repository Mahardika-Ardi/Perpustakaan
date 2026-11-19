import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { MembersService } from './members.service.js';
import { PrismaService } from '../common/prisma/prisma.service.js';

const memberId = 'member-id-1';

const createdMember = {
  id: memberId,
  code: 'AGT-0001',
  name: 'Budi Santoso',
  email: 'budi@kampus.ac.id',
  phone: '081234567890',
  nim: '2026001',
  address: 'Jalan Kenanga 1',
  userId: null,
  deletedAt: null,
};

describe('MembersService', () => {
  let service: MembersService;

  const prismaMock = {
    member: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(MembersService);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('mengembalikan daftar anggota aktif', async () => {
      const data = [createdMember];
      prismaMock.member.findMany.mockResolvedValue(data);

      const result = await service.findAll();

      expect(result).toEqual(data);
      expect(prismaMock.member.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    });
  });

  describe('findOne', () => {
    it('mengembalikan anggota bila ditemukan', async () => {
      prismaMock.member.findFirst.mockResolvedValue(createdMember);

      const result = await service.findOne(memberId);

      expect(result).toEqual(createdMember);
      expect(prismaMock.member.findFirst).toHaveBeenCalledWith({
        where: { id: memberId, deletedAt: null },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    });

    it('melempar NotFoundException bila anggota tidak ada', async () => {
      prismaMock.member.findFirst.mockResolvedValue(null);

      await expect(service.findOne('id-salah')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = {
      name: 'Budi Santoso',
      email: 'budi@kampus.ac.id',
      phone: '081234567890',
      nim: '2026001',
      address: 'Jalan Kenanga 1',
    };

    it('membuat anggota dengan kode AGT-0001 otomatis', async () => {
      prismaMock.member.count.mockResolvedValue(0);
      prismaMock.member.findUnique.mockResolvedValue(null);
      prismaMock.member.create.mockResolvedValue(createdMember);

      const result = await service.create(dto as never);

      expect(result).toEqual(createdMember);
      expect(prismaMock.member.create).toHaveBeenCalledWith({
        data: {
          code: 'AGT-0001',
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          nim: dto.nim,
          address: dto.address,
          userId: undefined,
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      });
    });

    it('melewati kode yang sudah terpakai (AGT-0001 dipakai → AGT-0002)', async () => {
      prismaMock.member.count.mockResolvedValue(1);
      prismaMock.member.findUnique
        .mockResolvedValueOnce({ id: 'lain' }) // AGT-0002 sudah ada
        .mockResolvedValueOnce(null); // AGT-0003 bebas
      prismaMock.member.create.mockResolvedValue({
        ...createdMember,
        code: 'AGT-0003',
      });

      const result = await service.create(dto as never);

      expect(result.code).toBe('AGT-0003');
    });

    it('melempar ConflictException (409) bila email sudah terdaftar', async () => {
      prismaMock.member.count.mockResolvedValue(0);
      prismaMock.member.findUnique.mockResolvedValue(null);
      prismaMock.member.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.create(dto as never)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const dto = { name: 'Budi Baru' } as never;

    it('mengupdate anggota bila ditemukan', async () => {
      prismaMock.member.findFirst.mockResolvedValue(createdMember);
      prismaMock.member.update.mockResolvedValue({ ...createdMember, ...dto });

      const result = await service.update(memberId, dto);

      expect(result.name).toBe('Budi Baru');
      expect(prismaMock.member.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: dto,
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    });

    it('melempar NotFoundException bila anggota tidak ada', async () => {
      prismaMock.member.findFirst.mockResolvedValue(null);

      await expect(service.update('id-salah', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-delete anggota bila ditemukan', async () => {
      prismaMock.member.findFirst.mockResolvedValue(createdMember);
      prismaMock.member.update.mockResolvedValue({
        ...createdMember,
        deletedAt: new Date(),
      });

      const result = await service.remove(memberId);

      expect(result.deletedAt).toBeDefined();
      expect(prismaMock.member.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { deletedAt: expect.any(Date) },
        include: { user: { select: { id: true, email: true, role: true } } },
      });
    });

    it('melempar NotFoundException bila anggota tidak ada', async () => {
      prismaMock.member.findFirst.mockResolvedValue(null);

      await expect(service.remove('id-salah')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
