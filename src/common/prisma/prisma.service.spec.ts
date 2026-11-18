import { PrismaService } from './prisma.service.js';
import { PrismaClient } from '../../generated/prisma/client.js';

describe('PrismaService', () => {
  beforeAll(() => {
    // Nilai dummy — koneksi bersifat lazy, tidak ada query yang benar-benar jalan
    process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/test';
  });

  it('terinstansiasi sebagai PrismaClient tanpa membuka koneksi', () => {
    const service = new PrismaService();

    // Catatan: `service instanceof PrismaClient` menghasilkan false pada
    // client hasil generate Prisma 7 (compilerBuild fast) — padahal rantai
    // prototype-nya benar. Karena itu pakai pengecekan prototype langsung.
    expect(Object.getPrototypeOf(PrismaService.prototype)).toBe(
      PrismaClient.prototype,
    );
    expect(service).toBeDefined();
  });

  it('onModuleDestroy memanggil $disconnect', async () => {
    const service = new PrismaService();
    const disconnectSpy = vi
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
