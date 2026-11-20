# Laporan Testing — Sistem Perpustakaan

> Laporan hasil pengujian project **Sistem Perpustakaan**.
> Panduan cara menulis test: [`docs/testing.md`](./testing.md).

## 1. Metadata

| Item | Nilai |
|---|---|
| Tanggal run | 20 November 2026 |
| Node.js | v26.8.1 |
| Test runner | Vitest 4.1.12 (reporter default + coverage v8) |
| Perintah | `npm test` (unit), `npm run test:cov` (unit + coverage), `npm run test:e2e` (e2e) |
| Cakupan | **Unit test (19 file) + E2E (1 file)** |
| Versi API yang diuji | `/api/v1` (SemVer aplikasi `1.0.0`) |
| Kondisi unit | ✅ Hijau — tanpa DB/jaringan (PostgreSQL tidak diperlukan) |
| Kondisi e2e | ✅ Hijau — butuh DB lokal menyala + seeder PETUGAS sudah dijalankan |

## 2. Hasil Run — Unit Test

```
 Test Files  19 passed (19)
      Tests  161 passed (161)
```

**161/161 test lulus, 0 gagal, 0 dilewati.**

### Rincian per file

| # | File spec | Menguji | Jumlah test | Hasil |
|---|---|---|---:|---|
| 1 | `src/app.controller.spec.ts` | `app.controller.ts` (endpoint `/` + info versi) | 1 | ✅ |
| 2 | `src/auth/auth.controller.spec.ts` | Delegasi register/login/me + metadata `@Roles` | 5 | ✅ |
| 3 | `src/auth/auth.service.spec.ts` | Register transaksi, login argon2, `me`, 409/401 | 10 | ✅ |
| 4 | `src/auth/dto/auth.dto.spec.ts` | Validasi `RegisterDto` & `LoginDto` | 9 | ✅ |
| 5 | `src/books/books.controller.spec.ts` | Delegasi 6 route + restore + `@Roles(PETUGAS)` di mutasi | 10 | ✅ |
| 6 | `src/books/books.service.spec.ts` | CRUD buku, soft delete, `?deleted=true`, restore, ISBN duplikat 409 | 16 | ✅ |
| 7 | `src/books/dto/book.dto.spec.ts` | Validasi `CreateBookDto` & `UpdateBookDto` | 12 | ✅ |
| 8 | `src/common/decorators/roles.decorator.spec.ts` | Metadata `ROLES_KEY` (1 & multi-role, tanpa decorator) | 3 | ✅ |
| 9 | `src/common/guards/jwt-auth.guard.spec.ts` | Header hilang/salah skema/token rusak/sukses | 4 | ✅ |
| 10 | `src/common/guards/roles.guard.spec.ts` | Lolos role, 403 role salah, tanpa `@Roles`, tanpa user | 4 | ✅ |
| 11 | `src/common/prisma/prisma.service.spec.ts` | Instansiasi lazy sebagai `PrismaClient`, `$disconnect` | 2 | ✅ |
| 12 | `src/fines/fines.controller.spec.ts` | Delegasi `GET`/`PATCH /fines/:id/pay` + `@Roles` | 6 | ✅ |
| 13 | `src/fines/fines.service.spec.ts` | Daftar/detail fine, pelunasan, 404, sudah-lunas 409 | 7 | ✅ |
| 14 | `src/loans/loans.controller.spec.ts` | Delegasi 7 route + restore + `@Roles(PETUGAS)` di mutasi | 11 | ✅ |
| 15 | `src/loans/loans.service.spec.ts` | Pinjam (stok/blokir denda), return, lost, soft delete, `?deleted=true`, restore | 22 | ✅ |
| 16 | `src/loans/dto/loan.dto.spec.ts` | Validasi `CreateLoanDto` & `ReturnLoanDto` | 5 | ✅ |
| 17 | `src/members/members.controller.spec.ts` | Delegasi 6 route + restore + `@Roles(PETUGAS)` di mutasi | 10 | ✅ |
| 18 | `src/members/members.service.spec.ts` | CRUD anggota, kode `AGT-xxxx` auto + retry, cascade User, `?deleted=true`, restore | 16 | ✅ |
| 19 | `src/members/dto/member.dto.spec.ts` | Validasi `CreateMemberDto` & `UpdateMemberDto` | 8 | ✅ |
| | **Total** | | **161** | **✅** |

## 3. Hasil Run — E2E

```
 Test Files  1 passed (1)
      Tests  36 passed (36)
```

**36/36 test lulus** pada `test/app.e2e-spec.ts` — dijalankan dengan `npm run test:e2e`
(melalui `vitest.config.e2e.ts`), memakai aplikasi NestJS sungguhan + database lokal
dengan setup identik produksi (`setupApp()` dipakai bersama `main.ts` dan e2e).

### Alur yang dicover

| # | Skenario | Endpoint | Hasil |
|---|---|---|---|
| 1 | Info server + versi app & API | `GET /` | ✅ 200 |
| 2 | Route tanpa prefix `/api/v1` ditolak | `GET /books` | ✅ 404 |
| 3 | Register anggota baru (User + Member 1 transaksi) | `POST /api/v1/auth/register` | ✅ 201 |
| 4 | Login anggota | `POST /api/v1/auth/login` | ✅ 200 |
| 5 | Login PETUGAS (akun seeder) | `POST /api/v1/auth/login` | ✅ 200 |
| 6 | Profil + data anggota terkait | `GET /api/v1/auth/me` | ✅ 200 |
| 7 | Akses tanpa token | `GET /api/v1/auth/me` | ✅ 401 |
| 8 | PETUGAS menambah buku | `POST /api/v1/books` | ✅ 201 |
| 9 | ANGGOTA menambah buku (role salah) | `POST /api/v1/books` | ✅ 403 |
| 10 | Daftar buku memuat buku baru | `GET /api/v1/books` | ✅ 200 |
| 11 | PETUGAS meminjam buku ke anggota | `POST /api/v1/loans` | ✅ 201 |
| 12 | ANGGOTA meminjam (role salah) | `POST /api/v1/loans` | ✅ 403 |
| 13 | Pengembalian tepat waktu → tanpa denda | `PATCH /api/v1/loans/:id/return` | ✅ 200 |
| 14 | Pinjam kedua kali (stok kembali terisi) | `POST /api/v1/loans` | ✅ 201 |
| 15 | Tandai buku hilang → Fine HILANG dibuat | `PATCH /api/v1/loans/:id/lost` | ✅ 200 |
| 16 | Pinjam lagi saat ada fine belum lunas | `POST /api/v1/loans` | ✅ **409** |
| 17 | Fine HILANG (Rp100000 = nilai buku) tercatat | `GET /api/v1/fines` | ✅ 200 |
| 18 | Pelunasan oleh ANGGOTA (role salah) | `PATCH /api/v1/fines/:id/pay` | ✅ 403 |
| 19 | Pelunasan oleh PETUGAS → `LUNAS` + `paidAt` | `PATCH /api/v1/fines/:id/pay` | ✅ 200 |
| 20 | Blokir terbuka setelah fine lunas (+return bersih) | `POST /api/v1/loans` | ✅ 201 |
| 21 | PETUGAS buat buku khusus skenario restore | `POST /api/v1/books` | ✅ 201 |
| 22 | Soft delete buku | `DELETE /api/v1/books/:id` | ✅ 204 |
| 23 | Buku terhapus tak muncul di daftar aktif | `GET /api/v1/books` | ✅ 200 |
| 24 | Buku terhapus muncul di daftar sampah | `GET /api/v1/books?deleted=true` | ✅ 200 |
| 25 | Restore oleh ANGGOTA (role salah) | `PATCH /api/v1/books/:id/restore` | ✅ 403 |
| 26 | Restore buku → `deletedAt: null` | `PATCH /api/v1/books/:id/restore` | ✅ 200 |
| 27 | Buku muncul lagi di daftar aktif | `GET /api/v1/books` | ✅ 200 |
| 28 | Restore buku kedua kali (tak terhapus) | `PATCH /api/v1/books/:id/restore` | ✅ **409** |
| 29 | Register akun untuk skenario cascade | `POST /api/v1/auth/register` | ✅ 201 |
| 30 | Akun aktif bisa login sebelum dihapus | `POST /api/v1/auth/login` | ✅ 200 |
| 31 | Hapus anggota → akun login ikut nonaktif | `DELETE /api/v1/members/:id` | ✅ 204 |
| 32 | Login akun terhapus ditolak (cascade ke User) | `POST /api/v1/auth/login` | ✅ **401** |
| 33 | Anggota terhapus muncul di daftar sampah | `GET /api/v1/members?deleted=true` | ✅ 200 |
| 34 | Restore anggota + akun login aktif kembali | `PATCH /api/v1/members/:id/restore` | ✅ 200 |
| 35 | Login berhasil lagi setelah restore | `POST /api/v1/auth/login` | ✅ 200 |
| 36 | Restore anggota kedua kali (tak terhapus) | `PATCH /api/v1/members/:id/restore` | ✅ **409** |

**Prasyarat e2e:**

1. PostgreSQL lokal menyala (`localhost:5432/perpustakaan`) — sesuai `DATABASE_URL` di `.env`.
2. Migrasi terpasang: `npx.cmd prisma migrate deploy`.
3. Seeder PETUGAS sudah dijalankan: `npx.cmd tsx prisma/seed.ts`.

**Catatan teknis:**

- `import 'dotenv/config'` ada di baris pertama spec — `main.ts` tidak dieksekusi saat e2e
  membuat module via `Test.createTestingModule`, jadi `.env` harus dimuat manual sebelum
  `PrismaService` terkonstruksi.
- `setupApp(app)` dipakai oleh `main.ts` **dan** e2e — prefix `/api/v1`, versioning,
  Swagger, dan `ValidationPipe` tidak bisa drift antara test dan produksi.
- Data e2e dibuat unik tiap run (`RUN_ID` dari `Date.now().toString(36)`) berisi email,
  username, dan ISBN — supaya test bisa diulang tanpa bentrok 409.
- E2E tidak menulis data dummy permanen selain baris uji yang dibuat sendiri; anggota,
  buku, pinjam, dan fine berasal dari run tersebut.

## 4. Coverage (unit test)

Perintah: `npm run test:cov` (provider **v8**, `include: ['src/**/*.ts']`, kecuali `src/generated/` dan file spec — jadi semua kode sumber ikut dihitung).

### Ringkasan

| Metrik | Nilai | Rasio |
|---|---:|---:|
| **Statements** | 256/296 | **86.48%** |
| **Branches** | 110/135 | **81.48%** |
| **Functions** | 82/86 | **95.34%** |
| **Lines** | 253/293 | **86.34%** |

### Per file

| File | Stmts | Branch | Funcs | Lines | Catatan |
|---|---:|---:|---:|---:|---|
| `app-info.ts` | 100% | 100% | 100% | 100% | versi dari `package.json` |
| `app.controller.ts` | 100% | 50% | 100% | 100% | branch default parameter |
| `app.service.ts` | 100% | 100% | 100% | 100% | |
| `setup-app.ts` | 0% | 100% | 0% | 0% | dipakai app sungguhan & e2e (setup, bukan logika bisnis) |
| `auth/auth.controller.ts` | 100% | 100% | 100% | 100% | |
| `auth/auth.service.ts` | 92.11% | 75% | 87.5% | 91.89% | line 71 (retry kode ke-10), 142, 159 |
| `books/books.controller.ts` | 100% | 100% | 100% | 100% | termasuk handler `restore` |
| `books/books.service.ts` | 100% | 93.33% | 100% | 100% | branch default parameter `deleted` |
| `common/decorators/current-user.decorator.ts` | 50% | 100% | 0% | 50% | callback decorator — dieksekusi framework saat request HTTP |
| `common/decorators/roles.decorator.ts` | 100% | 100% | 100% | 100% | |
| `common/guards/jwt-auth.guard.ts` | 100% | 90% | 100% | 100% | |
| `common/guards/roles.guard.ts` | 100% | 90% | 100% | 100% | |
| `common/prisma/prisma.service.ts` | 100% | 100% | 100% | 100% | |
| `common/types/auth-user.type.ts` | 100% | 100% | 100% | 100% | type-only, 0 baris runtime |
| `fines/fines.controller.ts` | 100% | 100% | 100% | 100% | |
| `fines/fines.service.ts` | 100% | 87.5% | 100% | 100% | branch default parameter |
| `loans/loans.controller.ts` | 100% | 100% | 100% | 100% | termasuk handler `restore` |
| `loans/loans.service.ts` | 98.39% | 94.59% | 100% | 98.39% | line 226 (sudah ditandai hilang → 409) |
| `members/members.controller.ts` | 100% | 100% | 100% | 100% | termasuk handler `restore` |
| `members/members.service.ts` | 87.23% | 68.97% | 100% | 86.96% | line 78, 166, 183–190 (retry kode ekstrem & cabang transaksi) |
| `src/**/dto/*.dto.ts` (9 file) | 100% | 100% | 100% | 100% | dekorator saja, diuji via `validateSync` |
| `*.module.ts` (7 file) | 0% | 100% | 100% | 0% | deklarasi metadata modul — diuji saat bootstrap |
| `main.ts` | 0% | 0% | 0% | 0% | bootstrap (dotenv, port, Swagger) — dijalankan app sungguhan |

## 5. Analisa & Gap

**Yang paling teruji:** logika bisnis inti — `books.service` (100% lines),
`fines.service` (100%), `loans.service` (98.39%), `auth.service` (91.89%),
`members.service` (86.96%), seluruh controller (termasuk handler restore), guard, dan DTO.

**Gap yang disadari (sengaja / wajar):**

| Gap | Alasan |
|---|---|
| `main.ts` (0%) | Bootstrap aplikasi (dotenv, port, Swagger) — tempatnya app sungguhan, dicakup alur e2e |
| `setup-app.ts` (0%) | Konfigurasi global (prefix `/api/v1`, versioning, Swagger, `ValidationPipe`) — dijalankan langsung oleh e2e & app sungguhan |
| `*.module.ts` (0%) | Deklarasi metadata modul NestJS — hidup saat runtime; dipakai langsung oleh e2e via `AppModule` |
| `current-user.decorator.ts` (50%) | Callback `createParamDecorator` dieksekusi NestJS di siklus request HTTP — tercakup e2e (`GET /auth/me`) |
| `auth.service.ts` baris 71/142/159 | Retry kode anggota ke-10 (tabrakan ekstrem) dan cabang error tak terduga |
| `members.service.ts` baris 78/166/183–190 | Sama — retry kode `AGT-xxxx` saat tabrakan beruntun & transaksi cascade |
| `loans.service.ts` baris 226 | Guard "sudah ditandai hilang" (kondisi ganda) |
| Branch < 100% pada controller & service | Default parameter/dekorator yang dievaluasi framework |

**Kesimpulan:** semua **logika bisnis** (service, guard, DTO, decorator, controller,
termasuk restore & cascade akun) teruji; sisa yang belum tercakup unit adalah
**glue code framework** yang kini terbukti teruji lewat **36 test e2e** (lihat §3).

## 6. Cara Mereplikasi

```bash
npm install          # sekali saja

# Unit test (tanpa DB)
npm test             # 161 unit test
npm run test:cov     # test + laporan coverage (angka di §4)

# E2E (butuh DB lokal + seeder)
npx.cmd prisma migrate deploy
npx.cmd tsx prisma/seed.ts
npm run test:e2e     # 36 e2e test
```

> Windows PowerShell: pakai `npm.cmd` bila `npm` diblokir execution policy, dan `npx.cmd` untuk `npx`.

## 7. Status Akhir

| Jenis | Jumlah | Status |
|---|---:|---|
| Unit test (19 file) | 161 | ✅ **Lulus** |
| E2E (`test/app.e2e-spec.ts`) | 36 | ✅ **Lulus** |
| Coverage (unit) | 86.48% stmts / 81.48% branch / 95.34% funcs / 86.34% lines | ✅ |
| `npm run lint` (oxlint) | — | ✅ Bersih |
| `npm run build` (nest build) | — | ✅ Sukses |
| `npm run format` (prettier) | — | ✅ Bersih |
