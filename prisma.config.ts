import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
    directUrl: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
  }
});
