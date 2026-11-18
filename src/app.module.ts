import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { BooksModule } from './books/books.module.js';

@Module({
  imports: [PrismaModule, BooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
