// @ts-ignore
import pg from 'pg';
// @ts-ignore
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_NAME = process.env.ADMIN_NAME;

async function createActorIfMissing(name: string) {
	const existing = await prisma.actor.findUnique({
		where: { name }
	});

	if (!existing) {
		await prisma.actor.create({
			data: {
				name,
				code: null,
				codeUsedAt: null,
				role: name === ADMIN_NAME ? 'ADMIN' : 'USER'
			}
		});
	}
}

async function main() {
	console.log('🌱 Seeding...');

	const names = (process.env.DEFAULT_ACTORS ?? '')
		.split(',')
		.map((n) => n.trim())
		.filter(Boolean);

	if (names.length === 0) {
		console.log('No DEFAULT_ACTORS provided. Skipping actor creation.');
	} else {
		for (const name of names) {
			await createActorIfMissing(name);
		}
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
