# Dokumentasi API — Sistem Perpustakaan

> Dokumen ini berisi **semua endpoint** beserta contoh **request** dan **response asli**
> yang diverifikasi langsung dari server berjalan (19 November 2026, 40 skenario sukses & error).
> Versi interaktif juga tersedia di **Swagger UI** saat server hidup: `GET /docs`.
> Struktur ERD: [`docs/erd.md`](./erd.md) · Aturan bisnis: [`docs/prd.md`](./prd.md)

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Cara Menjalankan](#2-cara-menjalankan)
3. [Autentikasi](#3-autentikasi)
4. [Hak Akses](#4-hak-akses)
5. [Format Error Umum](#5-format-error-umum)
6. [Konfigurasi &amp; Enum](#6-konfigurasi--enum)
7. [Endpoint — Health](#7-endpoint--health)
8. [Endpoint — Auth](#8-endpoint--auth)
9. [Endpoint — Books](#9-endpoint--books)
10. [Endpoint — Members](#10-endpoint--members)
11. [Endpoint — Loans](#11-endpoint--loans)
12. [Endpoint — Fines](#12-endpoint--fines)
13. [Alur End-to-End (skrip curl)](#13-alur-end-to-end-skrip-curl)
14. [Batasan yang Diketahui](#14-batasan-yang-diketahui)

---

## 1. Ringkasan

| Item            | Nilai                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Base URL        | `http://localhost:<PORT>` (default `3000`; contoh di dokumen ini memakai `4000` sesuai `.env`) |
| Format          | JSON (`Content-Type: application/json`)                                                              |
| Autentikasi     | JWT Bearer — `Authorization: Bearer <accessToken>`                                                  |
| Docs interaktif | `GET /docs` (Swagger UI) · `GET /docs-json` (spec OpenAPI)                                        |
| Stack           | NestJS 12 · Prisma 7 · PostgreSQL · argon2id · helmet                                              |

**Jumlah endpoint:** 22 API + 1 health.

| Modul   | Endpoint                                                               | Metode                         |
| ------- | ---------------------------------------------------------------------- | ------------------------------ |
| Health  | `/`                                                                  | GET                            |
| Auth    | `/auth/register`, `/auth/login`, `/auth/me`                      | POST, POST, GET                |
| Books   | `/books`, `/books/:id`                                             | GET×2, POST, PATCH, DELETE    |
| Members | `/members`, `/members/:id`                                         | GET×2, POST, PATCH, DELETE    |
| Loans   | `/loans`, `/loans/:id`, `/loans/:id/return`, `/loans/:id/lost` | GET×2, POST, PATCH×2, DELETE |
| Fines   | `/fines`, `/fines/:id`, `/fines/:id/pay`                         | GET×2, PATCH                  |

## 2. Cara Menjalankan

```bash
npm install                       # sekali saja
npx.cmd prisma migrate deploy     # pasang skema DB
npx.cmd tsx prisma/seed.ts        # buat akun PETUGAS (petugas@kampus.ac.id / petugas123)
npm run start:dev                 # server + auto-reload (port dari .env / default 3000)
```

> Windows PowerShell: pakai `npm.cmd` / `npx.cmd` bila `npm`/`npx` diblokir execution policy.
> Swagger UI: buka `http://localhost:4000/docs`.

## 3. Autentikasi

Semua endpoint **kecuali `POST /auth/register`, `POST /auth/login`, dan `GET /`** wajib
menyertakan token JWT:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Cara mendapatkan token:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"petugas@kampus.ac.id","password":"petugas123"}'
```

Token berlaku **24 jam** (`exp` = `iat` + 86400 detik), berisi klaim `sub` (id user),
`email`, dan `role`. Tanpa token / token salah → `401`:

```json
{
  "message": "Token tidak ditemukan",
  "error": "Unauthorized",
  "statusCode": 401
}
```

## 4. Hak Akses

| Aksi                                     | `POST`/`PATCH`/`DELETE`                | `GET`    |
| ---------------------------------------- | -------------------------------------------- | ---------- |
| **PETUGAS** (petugas perpustakaan) | ✅ boleh                                     | ✅ boleh   |
| **ANGGOTA** (peminjam)             | ❌ `403`                                   | ✅ boleh   |
| **Belum login**                    | ❌ `401`                                   | ❌ `401` |
| **Publik**                         | — hanya `/auth/register`, `/auth/login` | `GET /`  |

Respons `403` (role salah):

```json
{
  "message": "Akses ditolak: role Anda tidak memenuhi syarat",
  "error": "Forbidden",
  "statusCode": 403
}
```

## 5. Format Error Umum

Semua error memakai bentuk standar NestJS. Contoh asli per status:

| Status  | Kapan terjadi                                                    | Contoh `message`                                           |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `400` | Body tidak valid (validasi DTO) / `:id` bukan UUID             | array pesan validasi (lihat §9.3)                           |
| `401` | Token hilang/salah/kedaluwarsa, login gagal                      | `"Token tidak ditemukan"`, `"Email atau password salah"` |
| `403` | Role bukan PETUGAS pada endpoint mutasi                          | `"Akses ditolak: role Anda tidak memenuhi syarat"`         |
| `404` | Data tidak ditemukan (atau sudah soft-delete)                    | `"Buku dengan id \"…\" tidak ditemukan"`                  |
| `409` | Konflik bisnis (duplikat, stok habis, blokir denda, state ganda) | `"ISBN sudah terdaftar untuk buku lain"`                   |
| `500` | Kesalahan tak terduga server                                     | —                                                           |

Contoh `404` (asli):

```json
{
  "message": "Buku dengan id \"00000000-0000-4000-8000-000000000000\" tidak ditemukan",
  "error": "Not Found",
  "statusCode": 404
}
```

## 6. Konfigurasi & Enum

**Env (`.env`)**

| Variabel               | Default  | Fungsi                                 |
| ---------------------- | -------- | -------------------------------------- |
| `PORT`               | `3000` | Port server (contoh dokumen: `4000`) |
| `DATABASE_URL`       | —       | Koneksi PostgreSQL                     |
| `JWT_SECRET`         | —       | Kunci tanda tangan token               |
| `LOAN_DURATION_DAYS` | `7`    | Lama pinjam (hari) → `dueAt`        |
| `FINE_PER_DAY`       | `5000` | Denda per hari keterlambatan (Rp)      |

**Enum**

| Enum            | Nilai                                      |
| --------------- | ------------------------------------------ |
| `Role` (User) | `PETUGAS`, `ANGGOTA`                   |
| `LoanStatus`  | `DIPINJAM`, `DIKEMBALIKAN`, `HILANG` |
| `FineStatus`  | `BELUM_LUNAS`, `LUNAS`                 |
| `FineReason`  | `TERLAMBAT`, `HILANG`                  |

**Aturan bisnis penting**

- 1 peminjaman = 1 buku; stok dikurangi saat pinjam, dikembalikan saat return.
- Anggota dengan fine `BELUM_LUNAS` **ditolak 409** saat meminjam buku baru.
- Return lewat `dueAt` → fine `TERLAMBAT` = `hari terlambat × FINE_PER_DAY` (otomatis).
- `lost` → fine `HILANG` = `value` buku (stok tidak kembali).
- Soft delete: data terhapus punya `deletedAt` terisi dan hilang dari semua GET.
- Kode anggota digenerate otomatis: `AGT-0001`, `AGT-0002`, …

---

## 7. Endpoint — Health

### `GET /`

Cek server hidup. **Tanpa auth.**

```bash
curl http://localhost:4000/
```

`200 OK`:

```json
"Hello World!"
```

---

## 8. Endpoint — Auth

### 8.1 `POST /auth/register` — Registrasi anggota baru (publik)

Membuat **User (role ANGGOTA) + Member** dalam satu transaksi. Kode anggota auto.

**Request body**

| Field        | Tipe   | Wajib | Ketentuan               |
| ------------ | ------ | ----- | ----------------------- |
| `email`    | string | ✅    | format email, unik      |
| `username` | string | ❌    | max 50, unik bila diisi |
| `password` | string | ✅    | 8–72 karakter          |
| `name`     | string | ✅    | max 120                 |
| `phone`    | string | ✅    | max 32                  |
| `nim`      | string | ❌    | max 32                  |
| `address`  | string | ❌    | max 255                 |

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "docMWNBZ4K6@kampus.ac.id",
    "username": "docMWNBZ4K6",
    "password": "rahasia123",
    "name": "Doc Contoh",
    "phone": "081111111111",
    "nim": "2026DOCMWNBZ4K6",
    "address": "Jalan Dokumentasi 1"
  }'
```

`201 Created` (respons asli — password tidak pernah ikut dikembalikan):

```json
{
  "user": {
    "id": "9af48fa7-1706-4a25-b469-b81a4254b5a1",
    "email": "docMWNBZ4K6@kampus.ac.id",
    "username": "docMWNBZ4K6",
    "role": "ANGGOTA"
  },
  "member": {
    "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "code": "AGT-0006",
    "name": "Doc Contoh"
  }
}
```

**Error:** `400` bila body tidak valid · `409` bila email/username sudah terdaftar.

### 8.2 `POST /auth/login` — Login & ambil token (publik)

**Request body:** `email` (string, wajib) + `password` (string, wajib).

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"docMWNBZ4K6@kampus.ac.id","password":"rahasia123"}'
```

`200 OK` (respons asli):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YWY0OGZhNy0xNzA2LTRhMjUtYjQ2OS1iODFhNDI1NGI1YTEiLCJlbWFpbCI6ImRvY01XTkJaNEs2QGthbXB1cy5hYy5pZCIsInJvbGUiOiJBTkdHT1RBIiwiaWF0IjoxNzk1MDc5NDgyLCJleHAiOjE3OTUxNjU4ODJ9.Pom2GQoYUomY0s1wMXBbtn7cT11_efGqZvFjlwC7CrU",
  "user": {
    "id": "9af48fa7-1706-4a25-b469-b81a4254b5a1",
    "email": "docMWNBZ4K6@kampus.ac.id",
    "username": "docMWNBZ4K6",
    "role": "ANGGOTA"
  }
}
```

**Error `401`** (password salah — respons asli):

```json
{
  "message": "Email atau password salah",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### 8.3 `GET /auth/me` — Profil user login (wajib login)

Untuk ANGGOTA, response menyertakan `member` terkait; untuk PETUGAS, `member: null`.

```bash
curl http://localhost:4000/auth/me -H "Authorization: Bearer $TOKEN"
```

`200 OK` (respons asli):

```json
{
  "id": "9af48fa7-1706-4a25-b469-b81a4254b5a1",
  "email": "docMWNBZ4K6@kampus.ac.id",
  "username": "docMWNBZ4K6",
  "role": "ANGGOTA",
  "member": {
    "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "code": "AGT-0006",
    "name": "Doc Contoh",
    "phone": "081111111111",
    "nim": "2026DOCMWNBZ4K6",
    "address": "Jalan Dokumentasi 1",
    "joinedAt": "2026-11-19T09:11:21.937Z"
  }
}
```

> ⚠️ Untuk pinjam buku, gunakan **`member.id`** dari respons ini (bukan `id` user)
> sebagai `memberId` di `POST /loans`.

---

## 9. Endpoint — Books

Semua endpoint books **wajib login**; mutasi **khusus PETUGAS**.

### 9.1 `GET /books` — Daftar buku

```bash
curl http://localhost:4000/books -H "Authorization: Bearer $TOKEN"
```

`200 OK` — array objek buku (respons asli, dipotong):

```json
[
  {
    "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
    "title": "Laskar Pelangi",
    "author": "Andrea Hirata",
    "isbn": "978-DOC-MWNBZ4K6",
    "publisher": "Bentang Pustaka",
    "year": 2005,
    "value": 85000,
    "stock": 2,
    "createdAt": "2026-11-19T09:11:22.215Z",
    "updatedAt": "2026-11-19T09:11:22.215Z",
    "deletedAt": null
  }
]
```

### 9.2 `GET /books/:id` — Detail buku

`:id` harus UUID. `404` bila tidak ada / sudah di-soft-delete.

```bash
curl http://localhost:4000/books/cb51760e-fe70-47bb-987f-2c3988a40936 \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK` — objek buku seperti contoh §9.1 (satu objek, bukan array).

### 9.3 `POST /books` — Tambah buku (PETUGAS)

**Request body**

| Field         | Tipe   | Wajib | Ketentuan                 |
| ------------- | ------ | ----- | ------------------------- |
| `title`     | string | ✅    | max 255                   |
| `author`    | string | ✅    | max 255                   |
| `isbn`      | string | ✅    | max 32, **unik**    |
| `publisher` | string | ✅    | max 255                   |
| `year`      | int    | ✅    | 1400–2100                |
| `value`     | int    | ✅    | ≥ 0 (dasar denda hilang) |
| `stock`     | int    | ❌    | ≥ 0, default 1           |

```bash
curl -X POST http://localhost:4000/books \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "title": "Laskar Pelangi",
    "author": "Andrea Hirata",
    "isbn": "978-DOC-MWNBZ4K6",
    "publisher": "Bentang Pustaka",
    "year": 2005,
    "value": 85000,
    "stock": 2
  }'
```

`201 Created` (respons asli):

```json
{
  "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
  "title": "Laskar Pelangi",
  "author": "Andrea Hirata",
  "isbn": "978-DOC-MWNBZ4K6",
  "publisher": "Bentang Pustaka",
  "year": 2005,
  "value": 85000,
  "stock": 2,
  "createdAt": "2026-11-19T09:11:22.215Z",
  "updatedAt": "2026-11-19T09:11:22.215Z",
  "deletedAt": null
}
```

**Error `400`** — body kosong (respons asli, array pesan validasi):

```json
{
  "message": [
    "title must be shorter than or equal to 255 characters",
    "title should not be empty",
    "title must be a string",
    "author must be shorter than or equal to 255 characters",
    "author should not be empty",
    "author must be a string",
    "isbn must be shorter than or equal to 32 characters",
    "isbn should not be empty",
    "isbn must be a string",
    "publisher must be shorter than or equal to 255 characters",
    "publisher should not be empty",
    "publisher must be a string",
    "year must not be greater than 2100",
    "year must not be less than 1400",
    "year must be an integer number",
    "value must not be less than 0",
    "value must be an integer number"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Error `409`** — ISBN duplikat (respons asli):

```json
{
  "message": "ISBN sudah terdaftar untuk buku lain",
  "error": "Conflict",
  "statusCode": 409
}
```

### 9.4 `PATCH /books/:id` — Ubah buku sebagian (PETUGAS)

Semua field opsional; hanya yang dikirim yang diubah.

```bash
curl -X PATCH http://localhost:4000/books/cb51760e-fe70-47bb-987f-2c3988a40936 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"stock": 3, "publisher": "Bentang Pustaka (m/f)"}'
```

`200 OK` (respons asli):

```json
{
  "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
  "title": "Laskar Pelangi",
  "author": "Andrea Hirata",
  "isbn": "978-DOC-MWNBZ4K6",
  "publisher": "Bentang Pustaka (m/f)",
  "year": 2005,
  "value": 85000,
  "stock": 3,
  "createdAt": "2026-11-19T09:11:22.215Z",
  "updatedAt": "2026-11-19T09:11:22.419Z",
  "deletedAt": null
}
```

**Error:** `400` validasi · `403` bukan PETUGAS · `404` tak ditemukan · `409` ISBN bentrok.

### 9.5 `DELETE /books/:id` — Hapus buku (PETUGAS, soft delete)

```bash
curl -X DELETE http://localhost:4000/books/253c48d8-3af2-4e78-a048-5fc492580a4c \
  -H "Authorization: Bearer $TOKEN"
```

`204 No Content` — tanpa body.

> DELETE kedua pada id yang sama → `404` (sudah punya `deletedAt`; respons asli:
> `"Buku dengan id \"…\" tidak ditemukan"`).

---

## 10. Endpoint — Members

Semua endpoint members **wajib login**; mutasi **khusus PETUGAS**.

### 10.1 `GET /members` — Daftar anggota

```bash
curl http://localhost:4000/members -H "Authorization: Bearer $TOKEN"
```

`200 OK` — array anggota; anggota yang punya akun login menyertakan `user` (respons asli, dipotong):

```json
[
  {
    "id": "3747ad35-c383-4dcf-97fb-2a133b24517a",
    "code": "AGT-0007",
    "name": "Siti Aminah",
    "email": "sitiMWNBZ4K6@kampus.ac.id",
    "phone": "089876543210",
    "nim": "2026005555",
    "address": "Jalan Kenanga 5, Surabaya",
    "joinedAt": "2026-11-19T09:11:22.475Z",
    "userId": null,
    "createdAt": "2026-11-19T09:11:22.475Z",
    "updatedAt": "2026-11-19T09:11:22.475Z",
    "deletedAt": null,
    "user": null
  },
  {
    "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "code": "AGT-0006",
    "name": "Doc Contoh",
    "email": "docMWNBZ4K6@kampus.ac.id",
    "phone": "081111111111",
    "nim": "2026DOCMWNBZ4K6",
    "address": "Jalan Dokumentasi 1",
    "joinedAt": "2026-11-19T09:11:21.937Z",
    "userId": "9af48fa7-1706-4a25-b469-b81a4254b5a1",
    "createdAt": "2026-11-19T09:11:21.937Z",
    "updatedAt": "2026-11-19T09:11:21.937Z",
    "deletedAt": null,
    "user": {
      "id": "9af48fa7-1706-4a25-b469-b81a4254b5a1",
      "email": "docMWNBZ4K6@kampus.ac.id",
      "role": "ANGGOTA"
    }
  }
]
```

### 10.2 `GET /members/:id` — Detail anggota

```bash
curl http://localhost:4000/members/3747ad35-c383-4dcf-97fb-2a133b24517a \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK` — satu objek anggota (bentuk sama dengan item §10.1). `404` bila tak ditemukan.

### 10.3 `POST /members` — Tambah anggota manual (PETUGAS)

Berbeda dengan register: **tanpa password** — anggota dibuat tanpa akun login,
kecuali `userId` diisi untuk menyambungkan ke User yang sudah ada (1:1).

**Request body**

| Field       | Tipe        | Wajib | Ketentuan                      |
| ----------- | ----------- | ----- | ------------------------------ |
| `name`    | string      | ✅    | max 120                        |
| `email`   | string      | ✅    | format email, unik             |
| `phone`   | string      | ✅    | max 32                         |
| `nim`     | string      | ❌    | max 32                         |
| `address` | string      | ❌    | max 255                        |
| `userId`  | uuid-string | ❌    | User yang sudah ada (opsional) |

```bash
curl -X POST http://localhost:4000/members \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "Siti Aminah",
    "email": "sitiMWNBZ4K6@kampus.ac.id",
    "phone": "089876543210",
    "nim": "2026005555",
    "address": "Jalan Kenanga 5, Surabaya"
  }'
```

`201 Created` (respons asli):

```json
{
  "id": "3747ad35-c383-4dcf-97fb-2a133b24517a",
  "code": "AGT-0007",
  "name": "Siti Aminah",
  "email": "sitiMWNBZ4K6@kampus.ac.id",
  "phone": "089876543210",
  "nim": "2026005555",
  "address": "Jalan Kenanga 5, Surabaya",
  "joinedAt": "2026-11-19T09:11:22.475Z",
  "userId": null,
  "createdAt": "2026-11-19T09:11:22.475Z",
  "updatedAt": "2026-11-19T09:11:22.475Z",
  "deletedAt": null,
  "user": null
}
```

**Error:** `400` validasi · `403` bukan PETUGAS · `404` `userId` tak ditemukan · `409` email/telepon bentrok.

### 10.4 `PATCH /members/:id` — Ubah anggota sebagian (PETUGAS)

```bash
curl -X PATCH http://localhost:4000/members/3747ad35-c383-4dcf-97fb-2a133b24517a \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"address": "Jalan Kenanga 7, Surabaya"}'
```

`200 OK` (respons asli — hanya `address` & `updatedAt` berubah):

```json
{
  "id": "3747ad35-c383-4dcf-97fb-2a133b24517a",
  "code": "AGT-0007",
  "name": "Siti Aminah",
  "email": "sitiMWNBZ4K6@kampus.ac.id",
  "phone": "089876543210",
  "nim": "2026005555",
  "address": "Jalan Kenanga 7, Surabaya",
  "joinedAt": "2026-11-19T09:11:22.475Z",
  "userId": null,
  "createdAt": "2026-11-19T09:11:22.475Z",
  "updatedAt": "2026-11-19T09:11:22.527Z",
  "deletedAt": null,
  "user": null
}
```

### 10.5 `DELETE /members/:id` — Hapus anggota (PETUGAS, soft delete)

```bash
curl -X DELETE http://localhost:4000/members/3747ad35-c383-4dcf-97fb-2a133b24517a \
  -H "Authorization: Bearer $TOKEN"
```

`204 No Content` — tanpa body. Ulangi → `404`.

---

## 11. Endpoint — Loans

Semua endpoint loans **wajib login**; mutasi **khusus PETUGAS**.

### 11.1 `GET /loans` — Daftar peminjaman

```bash
curl http://localhost:4000/loans -H "Authorization: Bearer $TOKEN"
```

`200 OK` — array peminjaman lengkap dengan relasi `member`, `book`, dan `fine`
(respons asli, dipotong satu item):

```json
[
  {
    "id": "7ee99ef6-372d-439d-a9bb-546877787a0b",
    "status": "DIPINJAM",
    "borrowedAt": "2026-11-19T09:11:22.596Z",
    "dueAt": "2026-11-26T09:11:22.595Z",
    "returnedAt": null,
    "memberId": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "bookId": "cb51760e-fe70-47bb-987f-2c3988a40936",
    "createdAt": "2026-11-19T09:11:22.599Z",
    "updatedAt": "2026-11-19T09:11:22.599Z",
    "deletedAt": null,
    "member": {
      "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
      "code": "AGT-0006",
      "name": "Doc Contoh"
    },
    "book": {
      "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
      "title": "Laskar Pelangi",
      "isbn": "978-DOC-MWNBZ4K6"
    },
    "fine": null
  }
]
```

> Peminjaman dengan denda menyertakan `fine: { "id", "amount", "status" }` di dalamnya.

### 11.2 `GET /loans/:id` — Detail peminjaman

```bash
curl http://localhost:4000/loans/7ee99ef6-372d-439d-a9bb-546877787a0b \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK` — satu objek (bentuk sama §11.1). `404` bila tak ditemukan.

### 11.3 `POST /loans` — Buat peminjaman (PETUGAS)

**Request body**

| Field        | Tipe        | Wajib | Ketentuan                                                                          |
| ------------ | ----------- | ----- | ---------------------------------------------------------------------------------- |
| `memberId` | uuid-string | ✅    | id **Member** (dari `GET /auth/me` → `member.id` atau `GET /members`) |
| `bookId`   | uuid-string | ✅    | id buku dengan `stock > 0`                                                       |

**Aturan:** stok dikurangi · `dueAt` = sekarang + `LOAN_DURATION_DAYS` (default 7 hari) ·
ditolak `409` bila stok habis **atau** anggota punya denda `BELUM_LUNAS`.

```bash
curl -X POST http://localhost:4000/loans \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"memberId":"f499a01a-df6a-4fc9-b2ec-995ddd6202e5","bookId":"cb51760e-fe70-47bb-987f-2c3988a40936"}'
```

`201 Created` (respons asli):

```json
{
  "id": "7ee99ef6-372d-439d-a9bb-546877787a0b",
  "status": "DIPINJAM",
  "borrowedAt": "2026-11-19T09:11:22.596Z",
  "dueAt": "2026-11-26T09:11:22.595Z",
  "returnedAt": null,
  "memberId": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
  "bookId": "cb51760e-fe70-47bb-987f-2c3988a40936",
  "createdAt": "2026-11-19T09:11:22.599Z",
  "updatedAt": "2026-11-19T09:11:22.599Z",
  "deletedAt": null,
  "member": {
    "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "code": "AGT-0006",
    "name": "Doc Contoh"
  },
  "book": {
    "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
    "title": "Laskar Pelangi",
    "isbn": "978-DOC-MWNBZ4K6"
  }
}
```

**Error `409` — diblokir karena denda belum lunas (respons asli):**

```json
{
  "message": "Anggota memiliki denda belum lunas (Rp85000). Lunaskan dulu sebelum meminjam buku baru.",
  "error": "Conflict",
  "statusCode": 409
}
```

**Error lain:** `404` bila buku/anggota tidak ditemukan · `409` `"Stok buku habis, tidak bisa dipinjam"`.

### 11.4 `PATCH /loans/:id/return` — Proses pengembalian (PETUGAS)

Mengubah status → `DIKEMBALIKAN`, **mengembalikan stok**, dan bila lewat jatuh tempo
membuat fine `TERLAMBAT` (`hari × FINE_PER_DAY`). Body `loanId` otomatis disamakan
dengan `:id`.

**Request body:** `{ "loanId": "<id yang sama dengan :id>" }`

```bash
curl -X PATCH http://localhost:4000/loans/7ee99ef6-372d-439d-a9bb-546877787a0b/return \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"loanId":"7ee99ef6-372d-439d-a9bb-546877787a0b"}'
```

`200 OK` — tepat waktu, tanpa denda (respons asli; `daysOverdue` & `fineAmount` khusus endpoint ini):

```json
{
  "id": "7ee99ef6-372d-439d-a9bb-546877787a0b",
  "status": "DIKEMBALIKAN",
  "borrowedAt": "2026-11-19T09:11:22.596Z",
  "dueAt": "2026-11-26T09:11:22.595Z",
  "returnedAt": "2026-11-19T09:11:22.659Z",
  "memberId": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
  "bookId": "cb51760e-fe70-47bb-987f-2c3988a40936",
  "createdAt": "2026-11-19T09:11:22.599Z",
  "updatedAt": "2026-11-19T09:11:22.662Z",
  "deletedAt": null,
  "member": {
    "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "code": "AGT-0006",
    "name": "Doc Contoh"
  },
  "book": {
    "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
    "title": "Laskar Pelangi",
    "isbn": "978-DOC-MWNBZ4K6"
  },
  "daysOverdue": 0,
  "fineAmount": 0
}
```

> Terlambat? `daysOverdue` > 0, `fineAmount` = `daysOverdue × FINE_PER_DAY`,
> dan record fine `TERLAMBAT` dibuat otomatis.

**Error:** `404` tak ditemukan · `409` `"Buku sudah dikembalikan sebelumnya"`.

### 11.5 `PATCH /loans/:id/lost` — Tandai buku hilang (PETUGAS)

Status → `HILANG`, dibuat fine `HILANG` senilai `value` buku, **stok tidak kembali**.
Anggota terblokir pinjam sampai denda lunas.

```bash
curl -X PATCH http://localhost:4000/loans/ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd/lost \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK` (respons asli — `fineAmount` & `fineReason` khusus endpoint ini):

```json
{
  "id": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
  "status": "HILANG",
  "borrowedAt": "2026-11-19T09:11:22.681Z",
  "dueAt": "2026-11-26T09:11:22.680Z",
  "returnedAt": "2026-11-19T09:11:22.694Z",
  "memberId": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
  "bookId": "cb51760e-fe70-47bb-987f-2c3988a40936",
  "createdAt": "2026-11-19T09:11:22.681Z",
  "updatedAt": "2026-11-19T09:11:22.695Z",
  "deletedAt": null,
  "member": {
    "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
    "code": "AGT-0006",
    "name": "Doc Contoh"
  },
  "book": {
    "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
    "title": "Laskar Pelangi",
    "isbn": "978-DOC-MWNBZ4K6"
  },
  "fineAmount": 85000,
  "fineReason": "HILANG"
}
```

**Error:** `404` tak ditemukan · `409` sudah `HILANG` / peminjaman sudah `DIKEMBALIKAN`.

### 11.6 `DELETE /loans/:id` — Hapus peminjaman (PETUGAS, soft delete)

```bash
curl -X DELETE http://localhost:4000/loans/<id> -H "Authorization: Bearer $TOKEN"
```

`204 No Content` — tanpa body. Ulangi → `404`.

---

## 12. Endpoint — Fines

Semua endpoint fines **wajib login**; pelunasan **khusus PETUGAS**.
Denda dibuat otomatis oleh sistem (terlambat / hilang) — tidak ada `POST /fines`.

### 12.1 `GET /fines` — Daftar denda

Urutan: `BELUM_LUNAS` dulu, terbaru di atas.

```bash
curl http://localhost:4000/fines -H "Authorization: Bearer $TOKEN"
```

`200 OK` (respons asli, dipotong satu item):

```json
[
  {
    "id": "86fa7f38-22ac-4abc-8e9b-d5106955e794",
    "amount": 85000,
    "reason": "HILANG",
    "status": "BELUM_LUNAS",
    "paidAt": null,
    "loanId": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
    "createdAt": "2026-11-19T09:11:22.699Z",
    "updatedAt": "2026-11-19T09:11:22.699Z",
    "loan": {
      "id": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
      "member": {
        "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
        "code": "AGT-0006",
        "name": "Doc Contoh"
      },
      "book": {
        "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
        "title": "Laskar Pelangi",
        "isbn": "978-DOC-MWNBZ4K6"
      }
    }
  }
]
```

### 12.2 `GET /fines/:id` — Detail denda

```bash
curl http://localhost:4000/fines/86fa7f38-22ac-4abc-8e9b-d5106955e794 \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK` — objek denda; relasi `loan` di sini juga menyertakan `loan.status`
(respons asli):

```json
{
  "id": "86fa7f38-22ac-4abc-8e9b-d5106955e794",
  "amount": 85000,
  "reason": "HILANG",
  "status": "BELUM_LUNAS",
  "paidAt": null,
  "loanId": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
  "createdAt": "2026-11-19T09:11:22.699Z",
  "updatedAt": "2026-11-19T09:11:22.699Z",
  "loan": {
    "id": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
    "status": "HILANG",
    "member": {
      "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
      "code": "AGT-0006",
      "name": "Doc Contoh"
    },
    "book": {
      "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
      "title": "Laskar Pelangi",
      "isbn": "978-DOC-MWNBZ4K6"
    }
  }
}
```

`404` bila tidak ditemukan.

### 12.3 `PATCH /fines/:id/pay` — Lunaskan denda (PETUGAS)

`BELUM_LUNAS` → `LUNAS` + `paidAt` terisi. **Membuka blokir** pinjam baru bagi anggota.

**Request body (opsional):** `{ "notes": "catatan" }` — tidak mempengaruhi response.

```bash
curl -X PATCH http://localhost:4000/fines/86fa7f38-22ac-4abc-8e9b-d5106955e794/pay \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"notes":"Dibayar tunai di loket perpustakaan"}'
```

`200 OK` (respons asli):

```json
{
  "id": "86fa7f38-22ac-4abc-8e9b-d5106955e794",
  "amount": 85000,
  "reason": "HILANG",
  "status": "LUNAS",
  "paidAt": "2026-11-19T09:11:22.748Z",
  "loanId": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
  "createdAt": "2026-11-19T09:11:22.699Z",
  "updatedAt": "2026-11-19T09:11:22.749Z",
  "loan": {
    "id": "ae1cb685-a0cd-4b6e-b5d2-539a6f9187bd",
    "member": {
      "id": "f499a01a-df6a-4fc9-b2ec-995ddd6202e5",
      "code": "AGT-0006",
      "name": "Doc Contoh"
    },
    "book": {
      "id": "cb51760e-fe70-47bb-987f-2c3988a40936",
      "title": "Laskar Pelangi"
    }
  }
}
```

**Error `409`** — dibayar dua kali (respons asli):

```json
{
  "message": "Denda sudah dilunasi sebelumnya",
  "error": "Conflict",
  "statusCode": 409
}
```

**Error lain:** `403` bila bukan PETUGAS · `404` tak ditemukan.

---

## 13. Alur End-to-End (skrip curl)

Satu skrip menjalankan alur lengkap: **register → login → tambah buku → pinjam →
kembalikan → pinjam → hilang → ditolak blokir → lunasi denda → pinjam lagi**.

```bash
#!/usr/bin/env bash
# Alur lengkap perpustakaan — butuh server jalan + seeder PETUGAS.
set -e
BASE="http://localhost:4000"
CT="Content-Type: application/json"
RUN=$(date +%s)

# 1. Daftar anggota baru
curl -s -X POST $BASE/auth/register -H "$CT" -d "{
  \"email\":\"flow$RUN@kampus.ac.id\",\"username\":\"flow$RUN\",
  \"password\":\"rahasia123\",\"name\":\"Pengguna Alur\",
  \"phone\":\"081234567890\"}" > /dev/null

# 2. Login anggota & petugas
TOKEN_A=$(curl -s -X POST $BASE/auth/login -H "$CT" \
  -d "{\"email\":\"flow$RUN@kampus.ac.id\",\"password\":\"rahasia123\"}" \
  | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
TOKEN_P=$(curl -s -X POST $BASE/auth/login -H "$CT" \
  -d '{"email":"petugas@kampus.ac.id","password":"petugas123"}' \
  | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

# 3. Ambil memberId anggota
MEMBER_ID=$(curl -s $BASE/auth/me -H "Authorization: Bearer $TOKEN_A" \
  | sed -E 's/.*"member":\{"id":"([^"]+)".*/\1/')

# 4. Petugas tambah buku
BOOK_ID=$(curl -s -X POST $BASE/books -H "Authorization: Bearer $TOKEN_P" -H "$CT" -d "{
  \"title\":\"Buku Alur $RUN\",\"author\":\"Penulis\",\"isbn\":\"978-$RUN\",
  \"publisher\":\"Penerbit\",\"year\":2026,\"value\":50000,\"stock\":2}" \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')

# 5. Pinjam buku
LOAN_ID=$(curl -s -X POST $BASE/loans -H "Authorization: Bearer $TOKEN_P" -H "$CT" \
  -d "{\"memberId\":\"$MEMBER_ID\",\"bookId\":\"$BOOK_ID\"}" \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')

# 6. Kembalikan tepat waktu (fineAmount harus 0)
curl -s -X PATCH $BASE/loans/$LOAN_ID/return -H "Authorization: Bearer $TOKEN_P" \
  -H "$CT" -d "{\"loanId\":\"$LOAN_ID\"}" | grep -o '"fineAmount":[0-9]*'

# 7. Pinjam lagi, lalu tandai hilang -> fine HILANG
LOAN2_ID=$(curl -s -X POST $BASE/loans -H "Authorization: Bearer $TOKEN_P" -H "$CT" \
  -d "{\"memberId\":\"$MEMBER_ID\",\"bookId\":\"$BOOK_ID\"}" \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')
curl -s -X PATCH $BASE/loans/$LOAN2_ID/lost -H "Authorization: Bearer $TOKEN_P" \
  | grep -o '"fineReason":"[A-Z]*"'

# 8. Pinjam lagi -> DITOLAK 409 (denda belum lunas)
echo "Blokir:"
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/loans \
  -H "Authorization: Bearer $TOKEN_P" -H "$CT" \
  -d "{\"memberId\":\"$MEMBER_ID\",\"bookId\":\"$BOOK_ID\"}"

# 9. Lunasi denda (fine dari langkah 7)
FINE_ID=$(curl -s $BASE/fines -H "Authorization: Bearer $TOKEN_P" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -s -X PATCH $BASE/fines/$FINE_ID/pay -H "Authorization: Bearer $TOKEN_P" \
  -H "$CT" -d '{}' | grep -o '"status":"LUNAS"'

# 10. Pinjam lagi -> 201 (blokir terbuka)
echo "Setelah lunas:"
curl -s -o /dev/null -w "%{http_code}\n" -X POST $BASE/loans \
  -H "Authorization: Bearer $TOKEN_P" -H "$CT" \
  -d "{\"memberId\":\"$MEMBER_ID\",\"bookId\":\"$BOOK_ID\"}"
```

**Hasil yang diharapkan:** `0` (fineAmount) → `HILANG` (fineReason) → `409` (blokir) →
`"LUNAS"` → `201` (pinjam kembali terbuka).

---

## 14. Batasan yang Diketahui

| Batasan                          | Keterangan                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Tanpa pagination / filter / sort | `GET` list mengembalikan **semua** data aktif — fine untuk data kecil (skala magang)             |
| Soft delete tidak di-rollback    | Data terhapus hanya hilang dari tampilan; tidak ada endpoint restore                                      |
| 1 peminjaman = 1 buku            | Belum ada pivot `LoanItem` — banyak buku = banyak request `POST /loans`                              |
| Pelunasan manual                 | Tidak ada pembayaran otomatis — petugas memproses via `PATCH /fines/:id/pay`                           |
| Tanpa refresh token              | Token berlaku 24 jam; habis → login ulang                                                                |
| `GET /fines` tanpa filter      | Tidak ada query `?status=BELUM_LUNAS` — filter dilakukan di sisi klien                                 |
| Swagger `helmet`               | `contentSecurityPolicy` dimatikan agar Swagger UI bisa memuat asetnya; header keamanan lain tetap aktif |

---

**Terkait:**

- [`docs/erd.md`](./erd.md) — Diagram relasi database (Mermaid)
- [`docs/prd.md`](./prd.md) — Kebutuhan & aturan bisnis
- [`docs/testing.md`](./testing.md) — Panduan menulis unit & e2e test
- [`docs/test-report.md`](./test-report.md) — Hasil run 142 unit + 18 e2e
- [`docs/structure.md`](./structure.md) — Struktur folder & arsitektur
