# Simple CRUD — Sistem Perpustakaan

Backend sistem perpustakaan bertema **peminjaman & pengembalian buku**, lengkap dengan
auth berbasis role dan denda keterlambatan/kehilangan. Dibuat sebagai tugas magang:
implementasi simple CRUD dengan dokumentasi lengkap.

## Dokumentasi

| Dokumen                                | Isi                                                  |
| -------------------------------------- | ---------------------------------------------------- |
| [PRD](./docs/prd.md)                    | Kebutuhan produk: masalah, tujuan, fitur + alasannya |
| [ERD](./docs/erd.md)                    | Struktur database, relasi, aturan bisnis             |
| [Struktur project](./docs/structure.md) | Tanggung jawab folder/file & aturan SOC              |
| [Panduan testing](./docs/testing.md)    | Cara menulis, menjalankan, & konvensi unit test      |
| [Laporan testing](./docs/test-report.md)| Hasil run terakhir: 70/70 lulus + coverage           |

## Fitur (Phase 1)

- CRUD Buku & Anggota
- Autentikasi JWT dengan role `PETUGAS` (admin) & `ANGGOTA` (peminjam)
- Peminjaman, pengembalian, dan penandaan kehilangan buku
- Denda keterlambatan (`hari × FINE_PER_DAY`) & kehilangan (nilai buku)
- Blokir pinjam baru selama denda belum lunas; pelunasan manual oleh petugas
- 🔜 Dokumentasi API (Swagger) — menyusul setelah fitur jadi

> **Status:** dokumentasi lengkap (PRD + ERD + struktur) sudah selesai; implementasi
> fitur berjalan tahap demi tahap mengikuti urutan di PRD.

## Tech Stack

- **[NestJS](https://nestjs.com/)** 12 + TypeScript — framework backend
- **[Prisma](https://www.prisma.io/)** 7 + PostgreSQL — ORM & database
- **Vitest** + Supertest — unit test & e2e test
- **Helmet**, **class-validator**, **oxlint**, **Prettier**

## Requirements

- Node.js 20+
- PostgreSQL (lokal, Docker, atau Prisma Postgres seperti pada `.env` bawaan)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Siapkan file .env — minimal isi:
#    DATABASE_URL="postgres://..."     ← koneksi database (wajib)
#    FINE_PER_DAY=1000                 ← tarif denda rupiah/hari
#    PORT=3000                         ← opsional, default 3000

# 3. Buat tabel sesuai schema
npx prisma migrate dev

# 4. Jalankan mode development
npm run start:dev
```

Aplikasi berjalan di `http://localhost:3000`.

## Perintah

| Perintah               | Fungsi                       |
| ---------------------- | ---------------------------- |
| `npm run start:dev`  | Jalankan server (watch mode) |
| `npm run build`      | Build untuk produksi         |
| `npm run start:prod` | Jalankan hasil build         |
| `npm test`           | Unit test                    |
| `npm run test:e2e`   | E2E test                     |
| `npm run test:cov`   | Test + coverage              |
| `npm run lint`       | Lint (oxlint)                |
| `npm run format`     | Format kode (Prettier)       |

## Struktur Project

```
src/
├── main.ts          # bootstrap (helmet, port)
├── app.module.ts    # root module
├── common/          # guard, decorator, filter lintas modul
├── auth/            # register/login, JWT
├── books/           # CRUD buku
├── members/         # CRUD anggota
├── loans/           # pinjam, return, lost
└── fines/           # denda & pelunasan
prisma/              # schema.prisma — sumber kebenaran database
test/                # test e2e
docs/                # prd, erd, structure, testing, test-report
```

Penjelasan lengkap tiap folder & aturan separation of concerns ada di
[docs/structure.md](./docs/structure.md).

## Endpoint (Ringkas)

```
/auth        POST /register, POST /login, GET /me
/books       GET, POST, GET/:id, PATCH/:id, DELETE/:id
/members     GET, POST, GET/:id, PATCH/:id, DELETE/:id
/loans       GET, POST, GET/:id, PATCH/:id, DELETE/:id
/loans       POST /:id/return, POST /:id/lost
/fines       GET, GET/:id, PATCH /:id/pay
```

Detail payload, aturan bisnis (blokir 409, perhitungan denda), dan hak akses per role
ada di [docs/prd.md](./docs/prd.md). Dokumentasi API interaktif (Swagger) menyusul
setelah implementasi fitur selesai.

## Lisensi

UNLICENSED
