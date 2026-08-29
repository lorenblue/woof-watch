import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from './generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const databaseUrl = process.env.DATABASE_URL ?? 'file:./data/woof-watch.db';

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
const prisma = new PrismaClient({ adapter });

async function createActorIfMissing(name: string) {
	const existing = await prisma.actor.findUnique({
		where: { name }
	});

	if (!existing) {
		await prisma.actor.create({
			data: {
				name,
				code: null,
				codeUsedAt: null
			}
		});
	}
}

async function main() {
	console.log('🌱 Seeding...');

	const actorNames = (process.env.DEFAULT_ACTORS ?? '')
		.split(',')
		.map((n) => n.trim())
		.filter(Boolean);
	const dogNames = (process.env.DEFAULT_DOGS ?? '')
		.split(',')
		.map((n) => n.trim())
		.filter(Boolean);

	if (actorNames.length === 0) {
		console.log('No DEFAULT_ACTORS provided. Skipping actor creation.');
	} else {
		for (const name of actorNames) {
			await createActorIfMissing(name);
		}
	}

	if (dogNames.length === 0) {
		console.log('No DEFAULT_DOGS provided. Skipping dog creation.');
	} else {
		for (const dogName of dogNames) {
			await prisma.dog.upsert({
				where: { name: dogName },
				update: {},
				create: { name: dogName }
			});
		}
	}

	for (const key of ['pee', 'poo', 'eat']) {
		await prisma.actionType.upsert({
			where: { key },
			update: {},
			create: { key }
		});
	}

	console.log('✅ Seed complete');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
