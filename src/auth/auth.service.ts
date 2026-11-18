import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { AuthUser } from '../common/types/auth-user.type.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Membuat User (role ANGGOTA) + Member sekaligus dalam satu transaksi.
   * Password di-hash dengan argon2id — tidak pernah dikembalikan ke client.
   */
  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            username: dto.username,
            password: passwordHash,
          },
          select: { id: true, email: true, username: true, role: true },
        });

        const member = await tx.member.create({
          data: {
            code: await this.generateMemberCode(tx),
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            nim: dto.nim,
            address: dto.address,
            userId: user.id,
          },
          select: { id: true, code: true, name: true },
        });

        return { user, member };
      });
    } catch (error) {
      this.rethrowAsConflict(error);
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    // Pesan sengaja sama untuk "email tidak ada" dan "password salah"
    // agar tidak membocorkan akun mana yang terdaftar.
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const passwordValid = await verify(user.password, dto.password).catch(
      () => false,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    } satisfies AuthUser);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /** Profil lengkap user login + data anggota bila role ANGGOTA. */
  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        member: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
            nim: true,
            address: true,
            joinedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    return user;
  }

  /** Kode anggota berurutan: AGT-0001, AGT-0002, ... (unik, ditangani Prisma). */
  private async generateMemberCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const count = await tx.member.count({ where: { deletedAt: null } });

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `AGT-${String(count + 1 + attempt).padStart(4, '0')}`;
      const taken = await tx.member.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!taken) {
        return code;
      }
    }

    throw new ConflictException('Gagal membuat kode anggota unik, coba lagi');
  }

  /** P2002 = unique constraint (email) → 409; error lain dilempar ulang. */
  private rethrowAsConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : String(error.meta?.target ?? '');

      if (target.includes('email')) {
        throw new ConflictException('Email sudah terdaftar');
      }

      throw new ConflictException('Data bentrok dengan data yang sudah ada');
    }

    throw error;
  }
}
