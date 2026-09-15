import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

const SEED_JOBS: Prisma.JobCreateManyInput[] = [
  {
    title: 'Send welcome email',
    type: 'EMAIL',
    status: 'PENDING',
    createdAt: minutesAgo(4),
  },
  {
    title: 'Generate onboarding checklist',
    type: 'REPORT',
    status: 'PENDING',
    createdAt: minutesAgo(12),
  },
  {
    title: 'Import contacts from CSV',
    type: 'SYNC',
    status: 'PENDING',
    createdAt: minutesAgo(25),
  },
  {
    title: 'Backup database to S3',
    type: 'EXPORT',
    status: 'PENDING',
    createdAt: minutesAgo(40),
  },
  {
    title: 'Sync user data to CRM',
    type: 'SYNC',
    status: 'RUNNING',
    createdAt: minutesAgo(3),
  },
  {
    title: 'Generate monthly KPI report',
    type: 'REPORT',
    status: 'RUNNING',
    createdAt: minutesAgo(9),
  },
  {
    title: 'Send password reset email',
    type: 'EMAIL',
    status: 'COMPLETED',
    createdAt: minutesAgo(60),
  },
  {
    title: 'Export invoices to CSV',
    type: 'EXPORT',
    status: 'COMPLETED',
    createdAt: minutesAgo(95),
  },
  {
    title: 'Compress old log files',
    type: 'SYNC',
    status: 'COMPLETED',
    createdAt: minutesAgo(150),
  },
  {
    title: 'Generate weekly revenue report',
    type: 'REPORT',
    status: 'COMPLETED',
    createdAt: minutesAgo(220),
  },
  {
    title: 'Send trial-expired email',
    type: 'EMAIL',
    status: 'FAILED',
    createdAt: minutesAgo(30),
  },
  {
    title: 'Migrate legacy users',
    type: 'SYNC',
    status: 'FAILED',
    createdAt: minutesAgo(75),
  },
];

async function main() {
  await prisma.job.deleteMany();

  const count = await prisma.job.createMany({
    data: SEED_JOBS,
  });

  console.log(`Seeded ${count.count} jobs`);
  const byStatus = await prisma.job.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  for (const group of byStatus) {
    console.log(`  ${group.status}: ${group._count._all}`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());