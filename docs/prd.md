# PRD — Sistem Perpustakaan Digital (Peminjaman & Pengembalian)

| | |
|---|---|
| **Dokumen** | Product Requirements Document (PRD) |
| **Proyek** | Backend sistem perpustakaan — simple CRUD |
| **Konteks** | Tugas magang: implementasi CRUD + dokumentasi lengkap |
| **Stack** | NestJS (TypeScript) + Prisma + PostgreSQL |
| **Status** | Phase 1 |
| **Dokumen terkait** | [`docs/erd.md`](./erd.md) — struktur database |

---

## 1. Ringkasan Produk

Sistem perpustakaan berbasis API (backend) untuk mengelola katalog buku, data anggota,
serta transaksi **peminjaman dan pengembalian** buku. Setiap keterlambatan dan
kehilangan buku tercatat otomatis sebagai **denda** yang menyangkut tiap anggota.
Sistem ini dibuat sebagai tugas magang berupa implementasi simple CRUD yang
dilengkapi dokumentasi lengkap (PRD + ERD).

## 2. Latar Belakang & Masalah

Perpustakaan yang masih beroperasi dengan pencatatan manual menghadapi beberapa
masalah:

| # | Masalah | Dampak |
|---|---|---|
| 1 | **Pencatatan masih manual** (buku tulis/Excel) | Rawan hilang, rusak, dan salah catat |
| 2 | **Keterlambatan tak terdeteksi** | Tidak ada pemantauan jatuh tempo, anggota bebas telat |
| 3 | **Riwayat sulit dilacak** | Tidak jelas siapa sedang meminjam buku mana dan kapan harus kembali |
| 4 | **Aset tak terpantau** | Buku hilang/rusak tidak tercatat sebagai tanggung jawab anggota |

## 3. Tujuan & Kriteria Keberhasilan

**Tujuan:**

1. Mendigitalisasi data buku, anggota, pinjaman, dan denda melalui CRUD.
2. Mencatat riwayat setiap transaksi: siapa, apa, kapan, dan kapan jatuh tempo.
3. Mendeteksi keterlambatan dan kehilangan buku secara otomatis menjadi denda.
4. Menjaga integritas data lewat autentikasi dan pembagian hak akses.

**Kriteria keberhasilan:**

- [ ] Seluruh endpoint CRUD berfungsi dan lulus unit test + e2e test.
- [ ] Denda keterlambatan terhitung otomatis saat pengembalian (`hari × FINE_PER_DAY`).
- [ ] Denda kehilangan tercatat sebesar nilai buku saat `POST /loans/:id/lost`.
- [ ] Anggota dengan denda `BELUM_LUNAS` ditolak (`409`) saat meminjam.
- [ ] Endpoint mutasi hanya dapat diakses oleh role `PETUGAS`.

## 4. Pengguna (Aktor) & Hak Akses

| Aktor | Deskripsi | Hak akses |
|---|---|---|
| **Petugas** | Admin perpustakaan, mengelola operasional harian | CRUD penuh: buku, anggota, pinjam, kembali, denda |
| **Anggota** | Peminjam buku, punya akun sendiri | Register/login, melihat katalog buku, melihat pinjaman miliknya |

**Alasan pemilihan fitur auth + role:**

- **Menjaga akses data** — data buku/anggota/denda hanya boleh diubah petugas.
- **Standar umum sistem** — sistem admin pada umumnya wajib memiliki login.
- **Anggota punya akun** — setiap anggota dapat melihat riwayat pinjamannya sendiri.

> **Catatan tampilan:** kredensial (`USER`) dan identitas (`MEMBER`) memang terpisah, maka
> seluruh response yang ditujukan ke petugas wajib me-join identitas anggota
> (`member.name`, `member.code`, `member.nim`, dst.) — bukan menyimpan datanya ganda.
> Rinciannya di §5.2 dan `docs/erd.md` → *Strategi Tampilan Data*.

## 5. Fitur

### 5.1 Manajemen Buku (CRUD)

Kelola katalog buku: judul, penulis, ISBN, penerbit, tahun, nilai buku, dan stok.

- **Alasan:** digitalisasi katalog, menggantikan pencatatan manual yang rawan hilang.
- **Endpoint:** `GET/POST /books`, `GET/PATCH/DELETE /books/:id` (soft delete).

### 5.2 Manajemen Anggota (CRUD)

Kelola data anggota: kode anggota, nama lengkap, email, telepon, NIM/NIP (ID institusi),
alamat, tanggal bergabung, dan relasi ke akun login. Data identitas hanya disimpan di
tabel `MEMBER` — tidak diduplikasi ke `USER`.

- **Alasan:** identitas peminjam terdaftar sehingga petugas/pemilik perpustakaan langsung
  mengenali orang yang meminjam tanpa menebak-nebak username, dan riwayat pinjam bisa
  dilacak.
- **Endpoint:** `GET/POST /members`, `GET/PATCH/DELETE /members/:id`.
- **Tampilan:** daftar pinjaman/denda menampilkan identitas anggota lewat join
  (`member.name`, `member.code`, dst.), bukan lewat kolom ganda.

### 5.3 Autentikasi & Role (JWT)

Login/register dengan password ter-hash, token JWT, serta guard role
(`PETUGAS` / `ANGGOTA`).

- **Alasan:** menjaga akses data, anggota punya akun sendiri, standar sistem umum.
- **Endpoint:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.

### 5.4 Peminjaman Buku

Mencatat transaksi pinjam: anggota, buku, tanggal pinjam, dan jatuh tempo.

- **Alasan:** setiap transaksi punya jejak — siapa meminjam apa dan kapan jatuh tempo.
- **Endpoint:** `GET/POST /loans`, `GET/PATCH/DELETE /loans/:id`.
- **Validasi:** tolak jika stok `0` atau anggota punya denda `BELUM_LUNAS` (`409`).

### 5.5 Pengembalian Buku (dengan hitung denda)

Menyelesaikan pinjaman: status `DIKEMBALIKAN`, stok dikembalikan, dan keterlambatan
dihitung otomatis menjadi denda.

- **Alasan:** keterlambatan terdeteksi otomatis; memberi efek jera/disiplin bagi anggota.
- **Endpoint:** `POST /loans/:id/return`.

### 5.6 Kehilangan Buku

Menandai pinjaman berstatus `HILANG`: stok tidak dikembalikan, denda dibuat sebesar
nilai buku.

- **Alasan:** pertanggungjawaban aset — kehilangan tercatat sebagai tanggung jawab anggota.
- **Endpoint:** `POST /loans/:id/lost`.

### 5.7 Denda & Pelunasan

Daftar denda per anggota/pinjaman beserta penandaan pelunasan manual oleh petugas.

- **Alasan:** realistis seperti perpustakaan pada umumnya; mencatat tanggungan tiap
  anggota agar tidak lupa ditagih.
- **Endpoint:** `GET /fines`, `GET /fines/:id`, `PATCH /fines/:id/pay`.

## 6. Aturan Bisnis

1. **Pinjam** — ditolak (`409`) jika anggota punya denda `BELUM_LUNAS` atau `stock = 0`.
   Jika lolos, `stock` dikurangi.
2. **Pengembalian tepat waktu** — `status = DIKEMBALIKAN`, `returnedAt = now`, stok
   dikembalikan, tanpa denda.
3. **Pengembalian telat** — hari keterlambatan = selisih `dueAt` → `returnedAt`
   (dibulatkan ke atas); dibuat denda `TERLAMBAT` sebesar `hari × FINE_PER_DAY`.
4. **Kehilangan buku** — `status = HILANG`, stok tidak dikembalikan; dibuat denda
   `HILANG` sebesar `Book.value`.
5. **Pelunasan** — manual oleh petugas (`PATCH /fines/:id/pay`) setelah anggota membayar;
   blokir pinjam terbuka begitu tidak ada denda `BELUM_LUNAS`.

## 7. Di Luar Scope (Fase Selanjutnya)

Fitur berikut **tidak** dikerjakan pada phase ini:

- ❌ **Notifikasi otomatis** — pengingat jatuh tempo via email/WhatsApp/SMS.
- ❌ **Pembayaran online** — transfer/QRIS untuk pelunasan denda.

Catatan teknis yang juga belum masuk: laporan & statistik, pencarian/filter kategori,
serta pinjam multi-buku (butuh tabel pivot `LoanItem`).

## 8. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| **Keamanan** | Password di-hash (bcrypt), token JWT untuk akses terproteksi |
| **Integritas data** | Soft delete (`deletedAt`) pada User/Member/Book/Loan agar riwayat tidak hilang |
| **Validasi input** | Seluruh request divalidasi (`class-validator`) |
| **Konfigurasi** | Tarif denda lewat `.env` (`FINE_PER_DAY`) — dapat diubah tanpa redeploy/migrasi |
| **Pengujian** | Unit test + e2e test lulus (`npm test`, `npm run test:e2e`) |
| **Konsistensi** | Seluruh primary key memakai UUID |
| **Tampilan data** | Response transaksi (`/loans`, `/fines`) me-join identitas anggota dari `MEMBER` — identitas tidak pernah diduplikasi antar tabel |

## 9. Referensi

- **ERD / Struktur database:** [`docs/erd.md`](./erd.md)

**Daftar endpoint ringkas:**

```
/auth        POST /register, POST /login, GET /me
/books       GET, POST, GET/:id, PATCH/:id, DELETE/:id
/members     GET, POST, GET/:id, PATCH/:id, DELETE/:id
/loans       GET, POST, GET/:id, PATCH/:id, DELETE/:id
/loans       POST /:id/return, POST /:id/lost
/fines       GET, GET/:id, PATCH /:id/pay
```
