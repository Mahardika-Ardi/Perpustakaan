import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // contentSecurityPolicy dimatikan agar Swagger UI (/docs) bisa memuat
  // aset & skripnya sendiri; proteksi header lain (helmet) tetap aktif.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Dokumentasi interaktif OpenAPI — buka /docs saat server berjalan.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Perpustakaan API')
    .setDescription(
      'Backend perpustakaan — peminjaman & pengembalian buku. ' +
        'Semua endpoint (kecuali register & login) butuh token JWT ' +
        'dari POST /auth/login; mutasi butuh role PETUGAS.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
