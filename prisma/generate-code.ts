import 'dotenv/config';
import pg from 'pg';
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
	const args = process.argv.slice(2);
	const revokeSessions = args.includes('--revoke-sessions');
	const name = args.filter((arg) => arg !== '--revoke-sessions').join(' ');

	if (!name) {
		console.error('Usage: npm run generate-code -- <name> [--revoke-sessions]');
		process.exit(1);
	}

	const existing = await prisma.actor.findUnique({
		where: { name }
	});

	if (!existing) {
		console.error('Actor not found');
		process.exit(1);
	}

	if (revokeSessions) {
		await prisma.session.deleteMany({
			where: { actorId: existing.id }
		});
	}

	const newCode = generateCode();

	await prisma.actor.update({
		where: { name },
		data: {
			code: newCode,
			codeUsedAt: null
		}
	});

	let baseUrl: string;

	if (process.env.NODE_ENV === 'production') {
		if (!process.env.APP_DOMAIN) {
			throw new Error('APP_DOMAIN is not set in production');
		}
		baseUrl = `https://${process.env.APP_DOMAIN}`;
	} else {
		baseUrl = 'http://localhost:5173';
	}

	console.log(`🔐 Link for ${name}:`);
	console.log(`${baseUrl}/link?code=${newCode}`);
	if (revokeSessions) {
		console.log('Existing sessions revoked.');
	}

	await prisma.$disconnect();
}

main().catch(async (e) => {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
});
