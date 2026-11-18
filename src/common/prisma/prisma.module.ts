import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Module global — cukup diimpor sekali di AppModule, seluruh service
 * lain bisa langsung inject PrismaService tanpa mengimpor module ini.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
