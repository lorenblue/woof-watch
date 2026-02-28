// @ts-ignore
import pg from 'pg';
// @ts-ignore
import { PrismaClient } from './generated/client';

import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_NAME = process.env.ADMIN_NAME;

function generateCode() {
	return crypto.randomBytes(16).toString('base64url');
}

async function createActorIfMissing(name: string) {
	const existing = await prisma.actor.findUnique({
		where: { name }
	});

	if (!existing) {
		const code = generateCode();

		await prisma.actor.create({
			data: {
				name,
				code,
				codeUsedAt: null,
				role: name === ADMIN_NAME ? 'ADMIN' : 'USER'
			}
		});

		console.log(`${name} access code: ${code}`);
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
