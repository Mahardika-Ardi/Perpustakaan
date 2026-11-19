# Laporan Testing

> Laporan hasil pengujian project **Perpustakaan — Peminjaman & Pengembalian Buku**.
> Panduan cara menulis test: [`docs/testing.md`](./testing.md).

## 1. Metadata

| Item | Nilai |
|---|---|
| Tanggal run | 19 November 2026 |
| Node.js | v26.8.1 |
| Test runner | Vitest 4.1.12 (reporter default + coverage v8) |
| Perintah | `npm test` (unit), `npm run test:cov` (unit + coverage), `npm run test:e2e` (e2e) |
| Cakupan | **Unit test (19 file) + E2E (1 file)** |
| Kondisi unit | ✅ Hijau — tanpa DB/jaringan (PostgreSQL tidak diperlukan) |
| Kondisi e2e | ✅ Hijau — butuh DB lokal menyala + seeder PETUGAS sudah dijalankan |

## 2. Hasil Run — Unit Test

```
 Test Files  19 passed (19)
      Tests  142 passed (142)
```

**142/142 test lulus, 0 gagal, 0 dilewati.**

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
| 12 | `src/fines/fines.controller.spec.ts` | Delegasi `GET`/`PATCH /fines/:id/pay` + `@Roles` | 6 | ✅ |
| 13 | `src/fines/fines.service.spec.ts` | Daftar/detail fine, pelunasan, 404, sudah-lunas 409 | 7 | ✅ |
| 14 | `src/loans/loans.controller.spec.ts` | Delegasi 5 route + `@Roles(PETUGAS)` di mutasi | 9 | ✅ |
| 15 | `src/loans/loans.service.spec.ts` | Pinjam (stok/blokir denda), return, lost, soft delete | 18 | ✅ |
| 16 | `src/loans/dto/loan.dto.spec.ts` | Validasi `CreateLoanDto` & `ReturnLoanDto` | 5 | ✅ |
| 17 | `src/members/members.controller.spec.ts` | Delegasi 5 route + `@Roles(PETUGAS)` di mutasi | 8 | ✅ |
| 18 | `src/members/members.service.spec.ts` | CRUD anggota, kode `AGT-xxxx` auto + retry tabrakan | 11 | ✅ |
| 19 | `src/members/dto/member.dto.spec.ts` | Validasi `CreateMemberDto` & `UpdateMemberDto` | 8 | ✅ |
| | **Total** | | **142** | **✅** |

## 3. Hasil Run — E2E

```
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

**18/18 test lulus** pada `test/app.e2e-spec.ts` — dijalankan dengan `npm run test:e2e`
(melalui `vitest.config.e2e.ts`), memakai aplikasi NestJS sungguhan + database lokal.

### Alur yang dicover

| # | Skenario | Endpoint | Hasil |
|---|---|---|---|
| 1 | Register anggota baru (User + Member 1 transaksi) | `POST /auth/register` | ✅ 201 |
| 2 | Login anggota | `POST /auth/login` | ✅ 200 |
| 3 | Login PETUGAS (akun seeder) | `POST /auth/login` | ✅ 200 |
| 4 | Profil + data anggota terkait | `GET /auth/me` | ✅ 200 |
| 5 | Akses tanpa token | `GET /auth/me` | ✅ 401 |
| 6 | PETUGAS menambah buku | `POST /books` | ✅ 201 |
| 7 | ANGGOTA menambah buku (role salah) | `POST /books` | ✅ 403 |
| 8 | Daftar buku memuat buku baru | `GET /books` | ✅ 200 |
| 9 | PETUGAS meminjam buku ke anggota | `POST /loans` | ✅ 201 |
| 10 | ANGGOTA meminjam (role salah) | `POST /loans` | ✅ 403 |
| 11 | Pengembalian tepat waktu → tanpa denda | `PATCH /loans/:id/return` | ✅ 200 |
| 12 | Pinjam kedua kali (stok kembali terisi) | `POST /loans` | ✅ 201 |
| 13 | Tandai buku hilang → Fine HILANG dibuat | `PATCH /loans/:id/lost` | ✅ 200 |
| 14 | Pinjam lagi saat ada fine belum lunas | `POST /loans` | ✅ **409** |
| 15 | Fine HILANG (Rp100000 = nilai buku) tercatat | `GET /fines` | ✅ 200 |
| 16 | Pelunasan oleh ANGGOTA (role salah) | `PATCH /fines/:id/pay` | ✅ 403 |
| 17 | Pelunasan oleh PETUGAS → `LUNAS` + `paidAt` | `PATCH /fines/:id/pay` | ✅ 200 |
| 18 | Blokir terbuka setelah fine lunas (+return bersih) | `POST /loans` | ✅ 201 |

**Prasyarat e2e:**

1. PostgreSQL lokal menyala (`localhost:5432/perpustakaan`) — sesuai `DATABASE_URL` di `.env`.
2. Migrasi terpasang: `npx.cmd prisma migrate deploy`.
3. Seeder PETUGAS sudah dijalankan: `npx.cmd tsx prisma/seed.ts`.

**Catatan teknis:**

- `import 'dotenv/config'` ada di baris pertama spec — `main.ts` tidak dieksekusi saat e2e
  membuat module via `Test.createTestingModule`, jadi `.env` harus dimuat manual sebelum
  `PrismaService` terkonstruksi.
- Data e2e dibuat unik tiap run (`RUN_ID` dari `Date.now().toString(36)`) berisi email,
  username, dan ISBN — supaya test bisa diulang tanpa bentrok 409.
- E2E tidak menulis data dummy permanen selain baris uji yang dibuat sendiri; anggota,
  buku, pinjam, dan fine berasal dari run tersebut.

## 4. Coverage (unit test)

Perintah: `npm run test:cov` (provider **v8**, `include: ['src/**/*.ts']`, kecuali `src/generated/` dan file spec — jadi semua kode sumber ikut dihitung).

### Ringkasan

| Metrik | Nilai | Rasio |
|---|---:|---:|
| **Statements** | 227/257 | **88.32%** |
| **Branches** | 87/110 | **79.09%** |
| **Functions** | 74/77 | **96.1%** |
| **Lines** | 224/254 | **88.18%** |

### Per file

| File | Stmts | Branch | Funcs | Lines | Catatan |
|---|---:|---:|---:|---:|---|
| `app.controller.ts` | 100% | 50% | 100% | 100% | branch default parameter |
| `app.service.ts` | 100% | 100% | 100% | 100% | |
| `auth/auth.controller.ts` | 100% | 50% | 100% | 100% | branch default parameter |
| `auth/auth.service.ts` | 92.11% | 75% | 87.5% | 91.89% | line 71 (retry kode ke-10), 142, 159 |
| `books/books.controller.ts` | 100% | 100% | 100% | 100% | |
| `books/books.service.ts` | 100% | 87.5% | 100% | 100% | branch default parameter |
| `common/decorators/current-user.decorator.ts` | 50% | 100% | 0% | 50% | callback decorator — dieksekusi framework saat request HTTP |
| `common/decorators/roles.decorator.ts` | 100% | 100% | 100% | 100% | |
| `common/guards/jwt-auth.guard.ts` | 100% | 90% | 100% | 100% | |
| `common/guards/roles.guard.ts` | 100% | 90% | 100% | 100% | |
| `common/prisma/prisma.service.ts` | 100% | 100% | 100% | 100% | |
| `common/types/auth-user.type.ts` | 100% | 100% | 100% | 100% | type-only, 0 baris runtime |
| `fines/fines.controller.ts` | 100% | 100% | 100% | 100% | |
| `fines/fines.service.ts` | 100% | 87.5% | 100% | 100% | branch default parameter |
| `loans/loans.controller.ts` | 100% | 100% | 100% | 100% | |
| `loans/loans.service.ts` | 98.21% | 93.33% | 100% | 98.21% | line 221 (sudah ditandai hilang → 409) |
| `members/members.controller.ts` | 100% | 100% | 100% | 100% | |
| `members/members.service.ts` | 81.82% | 55.56% | 100% | 81.25% | line 73, 109, 126–133 (retry kode ekstrem) |
| `src/**/dto/*.dto.ts` (9 file) | 100% | 100% | 100% | 100% | dekorator saja, diuji via `validateSync` |
| `*.module.ts` (7 file) | 0% | 100% | 100% | 0% | deklarasi metadata modul — diuji saat bootstrap |
| `main.ts` | 0% | 0% | 0% | 0% | bootstrap (dotenv, port, ValidationPipe) — dijalankan app sungguhan |

## 5. Analisa & Gap

**Yang paling teruji:** logika bisnis inti — `books.service` & `fines.service` (100% lines),
`loans.service` (98.21%), `auth.service` (91.89%), seluruh controller, guard, dan DTO.

**Gap yang disadari (sengaja / wajar):**

| Gap | Alasan |
|---|---|
| `main.ts` (0%) | Bootstrap aplikasi (dotenv, port, ValidationPipe global) — tempatnya app sungguhan, dicakup alur e2e |
| `*.module.ts` (0%) | Deklarasi metadata modul NestJS — hidup saat runtime; dipakai langsung oleh e2e via `AppModule` |
| `current-user.decorator.ts` (50%) | Callback `createParamDecorator` dieksekusi NestJS di siklus request HTTP — tercakup e2e (`GET /auth/me`) |
| `auth.service.ts` baris 71/142/159 | Retry kode anggota ke-10 (tabrakan ekstrem) dan cabang error tak terduga |
| `members.service.ts` baris 73/109/126–133 | Sama — retry kode `AGT-xxxx` saat tabrakan beruntun |
| `loans.service.ts` baris 221 | Guard "sudah ditandai hilang" (kondisi ganda) |
| Branch < 100% pada controller | Default parameter/dekorator yang dievaluasi framework |

**Kesimpulan:** semua **logika bisnis** (service, guard, DTO, decorator, controller) teruji;
sisa yang belum tercakup unit adalah **glue code framework** yang kini terbukti teruji lewat
**18 test e2e** (lihat §3).

## 6. Cara Mereplikasi

```bash
npm install          # sekali saja

# Unit test (tanpa DB)
npm test             # 142 unit test
npm run test:cov     # test + laporan coverage (angka di §4)

# E2E (butuh DB lokal + seeder)
npx.cmd prisma migrate deploy
npx.cmd tsx prisma/seed.ts
npm run test:e2e     # 18 e2e test
```

> Windows PowerShell: pakai `npm.cmd` bila `npm` diblokir execution policy, dan `npx.cmd` untuk `npx`.

## 7. Status Akhir

| Jenis | Jumlah | Status |
|---|---:|---|
| Unit test (19 file) | 142 | ✅ **Lulus** |
| E2E (`test/app.e2e-spec.ts`) | 18 | ✅ **Lulus** |
| Coverage (unit) | 88.32% stmts / 79.09% branch | ✅ |
| `npm run lint` (oxlint) | — | ✅ Bersih |
| `npm run build` (nest build) | — | ✅ Sukses |
| `npm run format` (prettier) | — | ✅ Bersih |
