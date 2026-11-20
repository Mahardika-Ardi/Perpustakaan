# Panduan Testing

> Dokumen ini menjelaskan bagaimana testing dijalankan, ditulis, dan dipertahankan
> di project ini. Laporan hasil terakhir: [`docs/test-report.md`](./test-report.md).

## Stack

| Tool | Peran |
|---|---|
| **[Vitest](https://vitest.dev/)** | Test runner + assertion (menggantikan Jest — lebih cepat, config di `vitest.config.ts`) |
| **@vitest/coverage-v8** | Coverage report (`npm run test:cov`) |
| **Supertest** | HTTP client untuk e2e (menjalankan app sungguhan tanpa port) |
| **@nestjs/testing** | Membuat `TestingModule` — membangun slice module NestJS untuk test |

## Peta File

```
src/
├── books/
│   ├── books.service.ts              ← kode
│   ├── books.service.spec.ts         ← unit test menempel di sebelah kodenya
│   ├── books.controller.spec.ts
│   └── dto/
│       ├── create-book.dto.ts
│       └── book.dto.spec.ts          ← boleh gabung 1 spec untuk beberapa DTO
test/
└── app.e2e-spec.ts                   ← e2e: menguji alur HTTP utuh via supertest
```

**Aturan konvensi:**

1. Unit test **menempel** di folder yang sama dengan kode (`*.spec.ts`), e2e di `test/`.
2. Nama spec = nama file yang diuji (`books.service.spec.ts` menguji `books.service.ts`).
3. `vitest.config.ts` memakai `globals: true` — `describe`/`it`/`expect`/`vi` tidak perlu di-import.
4. Coverage `include: ['src/**/*.ts']` — semua kode ikut dihitung; file yang tidak
   disentuh test akan tampil **0%** (jujur), kecuali `src/generated/` dan file spec.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm test` | Jalankan semua unit test sekali |
| `npm run test:watch` | Mode watch (test jalan ulang saat file berubah) |
| `npm run test:cov` | Test + coverage report (dipakai untuk laporan) |
| `npm run test:e2e` | E2E test (`vitest.config.e2e.ts`) — butuh DB menyala |
| `npm run test:debug` | Debug test via inspector |

> **Windows:** `npx`/`npm` versi PowerShell diblokir execution policy — pakai
> `npx.cmd` / `npm.cmd` bila menjalankan perintah manual.

## Pola Test yang Dipakai

### 1. Mock dependency service — `useValue`

Service hanya diuji logikanya; database di-mock. **Tidak ada koneksi DB di unit test.**

```ts
const prismaMock = { book: { findMany: vi.fn(), /* ... */ } };

const module = await Test.createTestingModule({
  providers: [
    BooksService,
    { provide: PrismaService, useValue: prismaMock },
  ],
}).compile();
```

Setiap `beforeEach` panggil `vi.resetAllMocks()` supaya tidak ada state bocor
antar test.

### 2. Mock library eksternal — `vi.mock`

```ts
vi.mock('argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));
// lalu di test:
vi.mocked(hash).mockResolvedValue('$argon2id$mocked');
```

Dipakai untuk hal yang mahal/nondeterministik (hashing, waktu, jaringan).

### 3. Controller: sediakan service mock + JwtService

`@UseGuards(JwtAuthGuard)` membuat Nest menginstansiasi guard — `JwtService`
**harus** disediakan walau tidak dipakai, kalau tidak testing module gagal dibuat:

```ts
providers: [
  { provide: BooksService, useValue: serviceMock },
  { provide: JwtService, useValue: { verify: vi.fn(), signAsync: vi.fn() } },
]
```

### 4. Guard: mock `ExecutionContext`

```ts
const context = {
  switchToHttp: () => ({ getRequest: () => request }),
} as unknown as ExecutionContext;

expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
```

### 5. DTO: `plainToInstance` + `validateSync`

```ts
const errors = validateSync(plainToInstance(CreateBookDto, { year: 'duaribu' }));
expect(errors.some((e) => e.property === 'year')).toBe(true);
```

Pakai `plainToInstance` — validasi butuh instance kelasnya, bukan objek biasa.

### 6. Metadata decorator: `Reflector`

```ts
const reflector = new Reflector();
expect(reflector.get(ROLES_KEY, BooksController.prototype.create))
  .toEqual(['PETUGAS']);
```

Dipakai untuk memastikan aturan akses (`@Roles`) tidak hilang saat refactor.

## Resep: Menambah Test untuk Fitur Baru

1. Buat `<fitur>.service.spec.ts` di folder yang sama — mock `PrismaService`,
   uji happy path + minimal **1 kasus gagal** (404/409/401).
2. Buat `<fitur>.controller.spec.ts` — mock service-nya, uji delegasi id/DTO,
   plus metadata `@Roles` bila ada aturan role.
3. Untuk DTO baru: uji minimal 1 valid + tiap aturan penting (1 test per constraint).
4. Jalankan `npm test` — pastikan hijau, lalu `npm run format`.
5. Perbarui [`docs/test-report.md`](./test-report.md) dengan angka terbaru.

## Aturan yang Dipakai

- **Happy path + minimal satu kasus gagal** per endpoint/service.
- **Assert perilaku, bukan implementasi** — uji *hasil* (`ConflictException`),
  bukan jumlah baris pemanggilan database yang spesifik (kecuali penting, seperti
  `deletedAt` terisi saat soft delete).
- **Satu test satu tujuan** — kalau test butuh komentar "dan juga", pecah.
- **Test tidak boleh butuh DB/jaringan** — unit test harus bisa jalan kapan saja
  (`npm test` hijau tanpa PostgreSQL nyala).
- Fikirkan kasus boundary: kosong, negatif, duplikat, tidak ditemukan, role salah.

## Unit vs E2E

| | Unit (`*.spec.ts` di `src/`) | E2E (`test/*.e2e-spec.ts`) |
|---|---|---|
| Cakupan | 1 kelas/logika + mock | Alur HTTP utuh, module nyata |
| Butuh DB? | ❌ tidak | ✅ ya (PostgreSQL menyala) |
| Kecepatan | milidetik | detik |

**Status:** ✅ e2e penuh **sudah dijalankan** — 36 test lulus (versi `/api/v1` →
register → login → buku → pinjam → kembalikan → hilang → denda → lunas →
restore buku/anggota + cascade akun). Detail & prasyarat di `docs/test-report.md` §3.
