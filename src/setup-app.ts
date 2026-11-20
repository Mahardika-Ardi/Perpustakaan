import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { API_VERSION } from './app-info.js';

/**
 * Konfigurasi inti aplikasi — dipanggil oleh main.ts (runtime) DAN
 * test e2e, supaya prefix /api/v1, versioning URI, serta validasi global
 * selalu identik di keduanya (hindari test lolos tapi production beda).
 *
 * Harus dipanggil SEBELUM SwaggerModule.createDocument() agar spec
 * ikut memuat path /api/v1/...
 */
export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Prefix global /api + versioning URI → semua route jadi /api/v1/...
  // GET / dikecualikan (AppController VERSION_NEUTRAL) agar tetap
  // jadi pengecek server hidup tanpa prefix & tanpa versi.
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });
}
