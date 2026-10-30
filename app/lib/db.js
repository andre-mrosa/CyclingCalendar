import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { databasePoolOptions } from './databaseConnection.js';

const globalForPrisma = globalThis;

const rawConn = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
const pool = globalForPrisma.pgPool || new Pool(databasePoolOptions(rawConn));

const adapter = globalForPrisma.prismaAdapter || new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.pgPool = pool;
globalForPrisma.prismaAdapter = adapter;
globalForPrisma.prisma = prisma;
