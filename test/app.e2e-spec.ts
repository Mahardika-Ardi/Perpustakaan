import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/setup-app.js';

//  E2E test alur lengkap perpustakaan:
//
//  0. GET / (info versi) & route tanpa prefix → 404
//  1. Register anggota baru
//  2. Login anggota & PETUGAS (via seeder)
//  3. PETUGAS menambah buku
//  4. PETUGAS meminjam buku ke anggota
//  5. Kembalikan buku (on-time → tanpa denda)
//  6. Pinjam lagi, tandai hilang → Fine HILANG dibuat
//  7. Pinjam lagi → DITOLAK 409 (fine belum lunas)
//  8. Lunaskan fine (khusus PETUGAS) → blokir terbuka
//
//  Catatan:
//  - Semua request memakai prefix versioning API (const API di bawah).
//  - Butuh DB lokal menyala (localhost:5432/perpustakaan) dan seeder PETUGAS
//    sudah dijalankan. Jalankan via `npm run test:e2e`.
//  - Data dibuat unik tiap run (`RUN_ID`) supaya bisa diulang tanpa 409.
//

const API = '/api/v1';
const RUN_ID = Date.now().toString(36).toUpperCase();
const EMAIL = `e2e${RUN_ID}@kampus.ac.id`;
const USERNAME = `e2e${RUN_ID}`;
const ISBN = `978-E2E-${RUN_ID}`;
const PASSWORD = 'rahasia123';

describe('E2E — alur perpustakaan (register → login → books → loans → fines)', () => {
  let app: INestApplication;
  let accessTokenAnggota: string;
  let accessTokenPetugas: string;
  let memberId: string;
  let bookId: string;
  let loan1Id: string;
  let loan2Id: string;
  let fineId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app); // sama persis dengan bootstrap() main.ts (prefix /api/v1, versioning)
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root & versioning', () => {
    it('GET / — info server + versi app & API (tanpa prefix / versi)', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);

      expect(res.body).toMatchObject({ apiVersion: 'v1', status: 'ok' });
      expect(res.body.name).toBe('perpustakaan');
      expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('route tanpa prefix /api/v1 → 404', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(404);
    });
  });

  describe('Auth', () => {
    it('POST /auth/register — mendaftarkan anggota baru', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/register`)
        .send({
          email: EMAIL,
          username: USERNAME,
          password: PASSWORD,
          name: 'E2E User',
          phone: '081234567890',
          nim: `2026${RUN_ID}`,
          address: 'Jalan E2E 1',
        })
        .expect(201);

      expect(res.body.user.email).toBe(EMAIL);
      expect(res.body.user.role).toBe('ANGGOTA');
      expect(res.body.member.code).toMatch(/^AGT-\d{4}$/);
      expect(res.body).not.toHaveProperty('password');
    });

    it('POST /auth/login — anggota berhasil login', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      accessTokenAnggota = res.body.accessToken;
      expect(accessTokenAnggota).toBeDefined();
      expect(res.body.user.email).toBe(EMAIL);
    });

    it('POST /auth/login — PETUGAS berhasil login (via seeder)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: 'petugas@kampus.ac.id', password: 'petugas123' })
        .expect(200);

      accessTokenPetugas = res.body.accessToken;
      expect(accessTokenPetugas).toBeDefined();
      expect(res.body.user.role).toBe('PETUGAS');
    });

    it('GET /auth/me — profil berisi data anggota terkait', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${accessTokenAnggota}`)
        .expect(200);

      memberId = res.body.member.id;
      expect(memberId).toBeDefined();
      expect(res.body.member.code).toMatch(/^AGT-\d{4}$/);
    });

    it('GET /auth/me — ditolak tanpa token (401)', async () => {
      await request(app.getHttpServer()).get(`${API}/auth/me`).expect(401);
    });
  });

  describe('Books (PETUGAS)', () => {
    it('POST /books — PETUGAS menambah buku', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/books`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({
          title: `Buku E2E ${RUN_ID}`,
          author: 'Penulis E2E',
          isbn: ISBN,
          publisher: 'Penerbit E2E',
          year: 2026,
          value: 100000,
          stock: 2,
        })
        .expect(201);

      bookId = res.body.id;
      expect(res.body.title).toBe(`Buku E2E ${RUN_ID}`);
      expect(res.body.stock).toBe(2);
    });

    it('POST /books — ditolak bila bukan PETUGAS (403)', async () => {
      await request(app.getHttpServer())
        .post(`${API}/books`)
        .set('Authorization', `Bearer ${accessTokenAnggota}`)
        .send({
          title: 'Buku Gagal',
          author: 'X',
          isbn: `978-DENIED-${RUN_ID}`,
          year: 2026,
          value: 1000,
          stock: 1,
        })
        .expect(403);
    });

    it('GET /books — daftar buku berisi buku baru', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/books`)
        .set('Authorization', `Bearer ${accessTokenAnggota}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((b: any) => b.id === bookId)).toBe(true);
    });
  });

  describe('Loans (PETUGAS)', () => {
    it('POST /loans — PETUGAS meminjam buku ke anggota', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/loans`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({ memberId, bookId })
        .expect(201);

      loan1Id = res.body.id;
      expect(res.body.status).toBe('DIPINJAM');
      expect(res.body.memberId).toBe(memberId);
      expect(res.body.bookId).toBe(bookId);
      expect(res.body.dueAt).toBeDefined();
    });

    it('POST /loans — ditolak bila bukan PETUGAS (403)', async () => {
      await request(app.getHttpServer())
        .post(`${API}/loans`)
        .set('Authorization', `Bearer ${accessTokenAnggota}`)
        .send({ memberId, bookId })
        .expect(403);
    });

    it('PATCH /loans/:id/return — kembalikan buku tepat waktu (tanpa denda)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${API}/loans/${loan1Id}/return`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({ loanId: loan1Id })
        .expect(200);

      expect(res.body.status).toBe('DIKEMBALIKAN');
      expect(res.body.returnedAt).toBeDefined();
      expect(res.body.daysOverdue).toBe(0);
      expect(res.body.fineAmount).toBe(0);
    });

    it('POST /loans — pinjam kedua kali (stok kembali terisi)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/loans`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({ memberId, bookId })
        .expect(201);

      loan2Id = res.body.id;
      expect(res.body.status).toBe('DIPINJAM');
    });

    it('PATCH /loans/:id/lost — tandai hilang, Fine HILANG dibuat', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${API}/loans/${loan2Id}/lost`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .expect(200);

      expect(res.body.status).toBe('HILANG');
    });
  });

  describe('Fines', () => {
    it('POST /loans — DITOLAK 409 selama ada fine belum lunas', async () => {
      await request(app.getHttpServer())
        .post(`${API}/loans`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({ memberId, bookId })
        .expect(409);
    });

    it('GET /fines — berisi fine HILANG dari peminjaman yang hilang', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/fines`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      const fine = res.body.find((f: any) => f.loanId === loan2Id);
      expect(fine).toBeDefined();
      expect(fine.status).toBe('BELUM_LUNAS');
      expect(fine.reason).toBe('HILANG');
      expect(fine.amount).toBe(100000);

      fineId = fine.id;
    });

    it('PATCH /fines/:id/pay — ditolak bila bukan PETUGAS (403)', async () => {
      await request(app.getHttpServer())
        .patch(`${API}/fines/${fineId}/pay`)
        .set('Authorization', `Bearer ${accessTokenAnggota}`)
        .expect(403);
    });

    it('PATCH /fines/:id/pay — PETUGAS lunaskan fine (status LUNAS)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${API}/fines/${fineId}/pay`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .expect(200);

      expect(res.body.status).toBe('LUNAS');
      expect(res.body.paidAt).toBeDefined();
    });

    it('POST /loans — blokir terbuka setelah fine lunas', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/loans`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({ memberId, bookId })
        .expect(201);

      // kembalikan lagi supaya stok bersih
      await request(app.getHttpServer())
        .patch(`${API}/loans/${res.body.id}/return`)
        .set('Authorization', `Bearer ${accessTokenPetugas}`)
        .send({ loanId: res.body.id })
        .expect(200);
    });
  });
});
