import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.POSTGRES_PRISMA_URL ? process.env.POSTGRES_PRISMA_URL.replace('sslmode=require', '') : '';
const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
