import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { RegisterDto } from './dto/register.dto.js';

vi.mock('argon2', () => ({
  hash: vi.fn(),
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const txMock = {
    user: { create: vi.fn() },
    member: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  };

  const prismaMock = {
    $transaction: vi.fn(),
    user: { findFirst: vi.fn() },
  };

  const jwtMock = { signAsync: vi.fn() };

  const registerDto: RegisterDto = {
    email: 'budi@kampus.ac.id',
    username: 'budi',
    password: 'rahasia123',
    name: 'Budi Santoso',
    phone: '081234567890',
    nim: '2026001',
    address: 'Jalan Kenanga 1',
  };

  const createdUser = {
    id: 'user-id-1',
    email: registerDto.email,
    username: registerDto.username,
    role: 'ANGGOTA',
  };

  const createdMember = {
    id: 'member-id-1',
    code: 'AGT-0001',
    name: registerDto.name,
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    // $transaction langsung mengeksekusi callback dengan mock transaksi
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock),
    );

    vi.mocked(hash).mockResolvedValue('$argon2id$mocked' as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('membuat User (ANGGOTA) + Member dengan kode AGT-0001 dalam satu transaksi', async () => {
      txMock.user.create.mockResolvedValue(createdUser);
      txMock.member.count.mockResolvedValue(0);
      txMock.member.findUnique.mockResolvedValue(null);
      txMock.member.create.mockResolvedValue(createdMember);

      const result = await service.register(registerDto);

      expect(hash).toHaveBeenCalledWith(registerDto.password);
      expect(txMock.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          password: '$argon2id$mocked',
        },
        select: { id: true, email: true, username: true, role: true },
      });
      expect(txMock.member.create).toHaveBeenCalledWith({
        data: {
          code: 'AGT-0001',
          name: registerDto.name,
          email: registerDto.email,
          phone: registerDto.phone,
          nim: registerDto.nim,
          address: registerDto.address,
          userId: createdUser.id,
        },
        select: { id: true, code: true, name: true },
      });
      expect(result).toEqual({ user: createdUser, member: createdMember });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('melewati kode yang sudah terpakai (AGT-0001 dipakai → AGT-0002)', async () => {
      txMock.user.create.mockResolvedValue(createdUser);
      txMock.member.count.mockResolvedValue(1);
      txMock.member.findUnique
        .mockResolvedValueOnce({ id: 'lain' }) // AGT-0002 sudah ada
        .mockResolvedValueOnce(null); // AGT-0003 bebas
      txMock.member.create.mockResolvedValue({
        ...createdMember,
        code: 'AGT-0003',
      });

      const result = await service.register(registerDto);

      expect(result.member.code).toBe('AGT-0003');
    });

    it('melempar ConflictException (409) saat email sudah terdaftar', async () => {
      txMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('meneruskan error non-P2002 apa adanya', async () => {
      txMock.user.create.mockRejectedValue(new Error('database down'));

      await expect(service.register(registerDto)).rejects.toThrow(
        'database down',
      );
    });
  });

  describe('login', () => {
    const dbUser = {
      id: 'user-id-1',
      email: registerDto.email,
      username: 'budi',
      password: '$argon2id$mocked',
      role: 'ANGGOTA',
      deletedAt: null,
    };

    it('berhasil: mengembalikan accessToken + user tanpa password', async () => {
      prismaMock.user.findFirst.mockResolvedValue(dbUser);
      vi.mocked(verify).mockResolvedValue(true as never);
      jwtMock.signAsync.mockResolvedValue('jwt-token-123');

      const result = await service.login({
        email: registerDto.email,
        password: 'rahasia123',
      });

      expect(verify).toHaveBeenCalledWith('$argon2id$mocked', 'rahasia123');
      expect(jwtMock.signAsync).toHaveBeenCalledWith({
        sub: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      });
      expect(result).toEqual({
        accessToken: 'jwt-token-123',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
        },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('menolak dengan Unauthorized saat password salah', async () => {
      prismaMock.user.findFirst.mockResolvedValue(dbUser);
      vi.mocked(verify).mockResolvedValue(false as never);

      await expect(
        service.login({ email: registerDto.email, password: 'salah' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtMock.signAsync).not.toHaveBeenCalled();
    });

    it('menolak dengan pesan sama saat email tidak terdaftar', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'tidak@ada.id', password: 'rahasia123' }),
      ).rejects.toThrow('Email atau password salah');
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('mengembalikan profil + data member', async () => {
      const profile = {
        id: 'user-id-1',
        email: registerDto.email,
        username: 'budi',
        role: 'ANGGOTA',
        member: { id: 'member-id-1', code: 'AGT-0001', name: 'Budi Santoso' },
      };
      prismaMock.user.findFirst.mockResolvedValue(profile);

      const result = await service.me('user-id-1');

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-id-1', deletedAt: null },
        select: expect.objectContaining({ member: expect.anything() }),
      });
      expect(result).toEqual(profile);
    });

    it('melempar Unauthorized bila user sudah tidak ada', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.me('id-hilang')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
