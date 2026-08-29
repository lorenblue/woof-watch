import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { env } from '$env/dynamic/private';
import { PrismaClient } from '../../../prisma/generated/client';

const databaseUrl = env.DATABASE_URL ?? 'file:./data/woof-watch.db';

function ensureSqliteDirectory(url: string) {
	if (!url.startsWith('file:')) {
		throw new Error(
			`DATABASE_URL must be a SQLite file: URL for this branch. Received ${url}`
		);
	}

	const filePath = url.replace(/^file:/, '');
	if (filePath === ':memory:') return;

	const directory = path.dirname(filePath);
	if (directory !== '.') {
		mkdirSync(directory, { recursive: true });
	}
}

ensureSqliteDirectory(databaseUrl);

const adapter = new PrismaBetterSqlite3(
	{ url: databaseUrl },
	{
		timestampFormat: 'iso8601'
	}
);

export const prisma = new PrismaClient({ adapter });
