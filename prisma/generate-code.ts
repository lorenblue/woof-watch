import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from './generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import crypto from 'crypto';

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

function generateCode() {
	return crypto.randomBytes(16).toString('base64url');
}

function getBaseUrl() {
	const configuredBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, '');
	if (configuredBaseUrl) return configuredBaseUrl;

	if (process.env.NODE_ENV === 'production') {
		if (!process.env.APP_DOMAIN) {
			throw new Error('APP_DOMAIN is not set in production');
		}

		return `https://${process.env.APP_DOMAIN}`;
	}

	return 'http://localhost:3000';
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

	const baseUrl = getBaseUrl();

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
