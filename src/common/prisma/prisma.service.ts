import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Satu-satunya titik pembuatan PrismaClient (lihat docs/structure.md).
 *
 * Prisma 7 wajib memakai driver adapter — di sini `PrismaPg` (@prisma/adapter-pg)
 * yang menerjemahkan query Prisma ke driver `pg`.
 *
 * Koneksi bersifat lazy: database baru dibuka saat query pertama, sehingga
 * unit test & e2e test tidak membutuhkan database yang menyala.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
