import { Role } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import argon2 from 'argon2';

async function main() {
  const password = 'loadtest_password';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const users = Array.from({ length: 500 }, (_, i) => ({
    email: `loadtest${i}@rushly.local`,
    passwordHash,
    name: `Load Test User ${i}`,
    role: Role.CUSTOMER,
  }));

  await prisma.user.createMany({ data: users, skipDuplicates: true });
  console.log('Seeded 500 load test users');
}

main().catch(console.error).finally(() => prisma.$disconnect());