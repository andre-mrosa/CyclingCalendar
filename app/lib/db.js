import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis;

const rawConn = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
const connectionString = rawConn.replace('sslmode=require', '').replace('sslmode=prefer', '');

const pool = globalForPrisma.pgPool || new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000
});

const adapter = globalForPrisma.prismaAdapter || new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.pgPool = pool;
globalForPrisma.prismaAdapter = adapter;
globalForPrisma.prisma = prisma;
