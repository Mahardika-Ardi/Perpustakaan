import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { API_VERSION, APP_VERSION } from './app-info.js';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // contentSecurityPolicy dimatikan agar Swagger UI (/docs) bisa memuat
  // aset & skripnya sendiri; proteksi header lain (helmet) tetap aktif.
  app.use(helmet({ contentSecurityPolicy: false, xPoweredBy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Prefix global /api + versioning URI → semua route jadi /api/v1/...
  // (GET / dikecualikan; dipanggil sebelum createDocument agar spec ikut /api/v1.)
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Perpustakaan API')
    .setDescription(
      'Backend perpustakaan — peminjaman & pengembalian buku. ' +
        `Base URL: /api/v${API_VERSION} (contoh: POST /api/v1/auth/login). ` +
        'Semua endpoint (kecuali register & login) butuh token JWT; ' +
        'mutasi butuh role PETUGAS.',
    )
    .setVersion(APP_VERSION)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const PORT = process.env.PORT;
  await app.listen(PORT ?? 3000);

  console.log(
    `${new Date()} Server Running At localhost:${PORT ?? 3000} API Docs: /docs`,
  );
}
await bootstrap();
