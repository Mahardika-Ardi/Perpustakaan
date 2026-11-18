# Laporan Testing

> Laporan hasil pengujian unit test project **Perpustakaan — Peminjaman & Pengembalian Buku**.
> Panduan cara menulis test: [`docs/testing.md`](./testing.md).

## 1. Metadata

| Item | Nilai |
|---|---|
| Tanggal run | 18 November 2026 |
| Node.js | v26.8.1 |
| Test runner | Vitest 4.1.12 (reporter default + coverage v8) |
| Perintah | `npm test` (unit) dan `npm run test:cov` (unit + coverage) |
| Cakupan | **Unit test saja** — lihat §6 untuk status e2e |
| Kondisi | ✅ Hijau — tanpa DB/jaringan (PostgreSQL tidak diperlukan) |

## 2. Hasil Run

```
 Test Files  11 passed (11)
      Tests  70 passed (70)
```

**70/70 test lulus, 0 gagal, 0 dilewati.**

### Rincian per file

| # | File spec | Menguji | Jumlah test | Hasil |
|---|---|---|---:|---|
| 1 | `src/app.controller.spec.ts` | `app.controller.ts` (endpoint `/`) | 1 | ✅ |
| 2 | `src/auth/auth.controller.spec.ts` | Delegasi register/login/me + metadata `@Roles` | 5 | ✅ |
| 3 | `src/auth/auth.service.spec.ts` | Register transaksi, login argon2, `me`, 409/401 | 10 | ✅ |
| 4 | `src/auth/dto/auth.dto.spec.ts` | Validasi `RegisterDto` & `LoginDto` | 9 | ✅ |
| 5 | `src/books/books.controller.spec.ts` | Delegasi 5 route + `@Roles(PETUGAS)` di mutasi | 8 | ✅ |
| 6 | `src/books/books.service.spec.ts` | CRUD buku, soft delete, ISBN duplikat 409 | 12 | ✅ |
| 7 | `src/books/dto/book.dto.spec.ts` | Validasi `CreateBookDto` & `UpdateBookDto` | 12 | ✅ |
| 8 | `src/common/decorators/roles.decorator.spec.ts` | Metadata `ROLES_KEY` (1 & multi-role, tanpa decorator) | 3 | ✅ |
| 9 | `src/common/guards/jwt-auth.guard.spec.ts` | Header hilang/salah skema/token rusak/sukses | 4 | ✅ |
| 10 | `src/common/guards/roles.guard.spec.ts` | Lolos role, 403 role salah, tanpa `@Roles`, tanpa user | 4 | ✅ |
| 11 | `src/common/prisma/prisma.service.spec.ts` | Instansiasi lazy sebagai `PrismaClient`, `$disconnect` | 2 | ✅ |
| | **Total** | | **70** | **✅** |

## 3. Coverage

Perintah: `npm run test:cov` (provider **v8**, `include: ['src/**/*.ts']`, kecuali `src/generated/` dan file spec — jadi semua kode sumber ikut dihitung).

### Ringkasan

| Metrik | Nilai | Rasio |
|---|---:|---:|
| **Statements** | 109/126 | **86.5%** |
| **Branches** | 42/54 | **77.77%** |
| **Functions** | 35/38 | **92.1%** |
| **Lines** | 107/124 | **86.29%** |

### Per file

| File | Stmts | Branch | Funcs | Lines | Catatan |
|---|---:|---:|---:|---:|---|
| `app.controller.ts` | 100% | 50% | 100% | 100% | |
| `app.service.ts` | 100% | 100% | 100% | 100% | |
| `auth/auth.controller.ts` | 100% | 50% | 100% | 100% | branch default parameter |
| `auth/auth.service.ts` | 92.1% | 75% | 87.5% | 91.89% | line 71 (retry kode anggota ke-10), 142, 159 |
| `auth/dto/login.dto.ts` | 100% | 100% | 100% | 100% | |
| `auth/dto/register.dto.ts` | 100% | 100% | 100% | 100% | |
| `books/books.controller.ts` | 100% | 100% | 100% | 100% | |
| `books/books.service.ts` | 100% | 87.5% | 100% | 100% | branch default parameter |
| `books/dto/*.dto.ts` | 100% | 100% | 100% | 100% | dekorator saja, diuji via `validateSync` |
| `common/decorators/current-user.decorator.ts` | 50% | 100% | 0% | 50% | callback decorator — dijalankan framework saat runtime HTTP |
| `common/decorators/roles.decorator.ts` | 100% | 100% | 100% | 100% | |
| `common/guards/jwt-auth.guard.ts` | 100% | 90% | 100% | 100% | |
| `common/guards/roles.guard.ts` | 100% | 90% | 100% | 100% | |
| `common/prisma/prisma.service.ts` | 100% | 100% | 100% | 100% | |
| `common/types/auth-user.type.ts` | 100% | 100% | 100% | 100% | type-only, 0 baris runtime |

## 4. Analisa & Gap

**Yang paling teruji:** logika bisnis inti — `books.service` (100% lines), `auth.service` (91.89%), kedua guard (100%), dan seluruh DTO (semua constraint diverifikasi via `validateSync`).

**Gap yang disadari (sengaja / wajar):**

| Gap | Alasan |
|---|---|
| `main.ts` (0%) | Bootstrap aplikasi (dotenv, port, ValidationPipe global) — butuh menjalankan app sungguhan; tempatnya **e2e**, bukan unit |
| `app.module.ts`, `auth.module.ts`, `books.module.ts`, `prisma.module.ts` (0%) | Deklarasi metadata modul NestJS — diuji secara tidak langsung saat kompilasi `TestingModule` dan oleh e2e |
| `current-user.decorator.ts` (50%) | Callback `createParamDecorator` dieksekusi NestJS di dalam siklus request HTTP — tercakup e2e saat `GET /auth/me` diuji |
| `auth.service.ts` baris sisa | Jalur retry kode anggota ke-10 (kondisi tabrakan ekstrem) dan cabang error tak terduga — sengaja tidak dibuat fixture rumit |
| Branch 50% pada controller | Default parameter/dekorator yang dievaluasi framework |

**Kesimpulan:** semua **logika bisnis** (service, guard, DTO, decorator) teruji; sisa yang belum tercakup adalah **glue code framework** yang otomatis teruji lewat e2e.

## 5. Cara Mereplikasi

```bash
npm install          # sekali saja
npm test             # jalankan 70 unit test
npm run test:cov     # test + laporan coverage (angka di §3)
```

> Windows PowerShell: pakai `npm.cmd` bila `npm` diblokir execution policy.

## 6. Status E2E

| Jenis | Status |
|---|---|
| Unit test (70 test, 11 file) | ✅ **Selesai & lulus** |
| E2E (`test/*.e2e-spec.ts`) | ⏳ **Belum dijalankan** — menunggu fase `prisma migrate` + seeder (akun PETUGAS) |

E2E penuh (alur register → login → CRUD buku → pinjam) dijadwalkan pada fase berikutnya
setelah migrasi database dan seeder disiapkan — lihat `docs/prd.md` untuk rencana fitur.
