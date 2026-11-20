import { readFileSync } from 'node:fs';

/**
 * Info aplikasi dari package.json — dibaca sekali saat modul dimuat.
 *
 * Posisi file ini (root `src/`) penting: `../package.json` menunjuk ke root
 * project baik saat runtime `dist/app-info.js` maupun saat test `src/app-info.ts`.
 */
interface PackageInfo {
  name: string;
  version: string;
}

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageInfo;

/** Nama paket (dipakai di response GET /). */
export const APP_NAME = pkg.name;

/** Versi aplikasi SemVer dari package.json (dipakai di GET / & Swagger). */
export const APP_VERSION = pkg.version;

/**
 * Versi API saat ini — route menjadi /api/v{API_VERSION}/...
 * Naikkan hanya untuk breaking change (lihat docs/api.md → Versi API).
 */
export const API_VERSION = '1';
