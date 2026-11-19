import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { hash } from 'argon2';

// Muat variabel dari .env (sama pola dengan main.ts)
config();

/**
 * Seeder akun PETUGAS (petugas perpustakaan).
 *
 * Jalankan: npx tsx prisma/seed.ts
 *
 * Akun dibuat hanya jika belum ada user dengan role PETUGAS,
 * sehingga skrip ini aman dijalankan berulang kali (idempoten).
 *
 * Variabel lingkungan (opsional, nilai default ditunjukkan):
 *   PETUGAS_EMAIL    email login petugas      (default: petugas@kampus.ac.id)
 *   PETUGAS_PASSWORD password login petugas   (default: petugas123)
 *
 * Password di-hash argon2id — sama dengan alur register di AuthService.
 */

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const PETUGAS_EMAIL = process.env.PETUGAS_EMAIL ?? 'petugas@kampus.ac.id';
const PETUGAS_PASSWORD = process.env.PETUGAS_PASSWORD ?? 'petugas123';

async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: Role.PETUGAS },
    select: { id: true, email: true, role: true },
  });

  if (existing) {
    console.log('PETUGAS sudah terdaftar — seeder dilewati.');
    console.log(`  email : ${existing.email}`);
    console.log(`  role  : ${existing.role}`);
    console.log(`  id    : ${existing.id}`);
    return;
  }

  const passwordHash = await hash(PETUGAS_PASSWORD);

  const user = await prisma.user.create({
    data: {
      email: PETUGAS_EMAIL,
      username: 'petugas',
      password: passwordHash,
      role: Role.PETUGAS,
    },
    select: { id: true, email: true, username: true, role: true },
  });

  console.log('Akun PETUGAS berhasil dibuat:');
  console.log(`  email : ${user.email}`);
  console.log(`  username: ${user.username}`);
  console.log(`  role  : ${user.role}`);
  console.log(`  id    : ${user.id}`);
  console.log('');
  console.log('Sebaiknya ganti password default setelah login pertama kali.');
}

await main().finally(() => prisma.$disconnect());
