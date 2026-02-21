import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { env } from '$env/dynamic/private';

const url = env.DATABASE_URL ?? 'file:./dev.db';

const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });

async function enableWAL() {
	const result = await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
	console.log('WAL result:', result);
}

await enableWAL();