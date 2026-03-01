import 'dotenv/config';
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

function generateCode() {
	return crypto.randomBytes(16).toString('base64url');
}

async function main() {
	const name = process.argv[2];

	if (!name) {
		console.error('Usage: npm run generate-code -- <name>');
		process.exit(1);
	}

	const existing = await prisma.actor.findUnique({
		where: { name }
	});

	if (!existing) {
		console.error('Actor not found');
		process.exit(1);
	}

	const newCode = generateCode();

	await prisma.actor.update({
		where: { name },
		data: {
			code: newCode,
			codeUsedAt: null
		}
	});

	const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173';

	console.log(`🔐 Link for ${name}:`);
	console.log(`${baseUrl}/link?code=${newCode}`);

	await prisma.$disconnect();
}

main().catch(async (e) => {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
});