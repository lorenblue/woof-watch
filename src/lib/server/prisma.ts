import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '$env/dynamic/private';
import { PrismaClient } from '../../../generated/prisma/client';

const connectionString =
	env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/woof_watch?schema=public';

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
