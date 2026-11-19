import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BooksModule } from './books/books.module.js';
import { MembersModule } from './members/members.module.js';
import { LoansModule } from './loans/loans.module.js';

@Module({
  imports: [PrismaModule, AuthModule, BooksModule, MembersModule, LoansModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
