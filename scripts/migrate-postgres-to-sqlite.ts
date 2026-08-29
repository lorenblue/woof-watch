import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../prisma/generated/client';

type ActorRow = {
	id: string;
	name: string;
	code: string | null;
	codeUsedAt: string | null;
	createdAt: string;
};

type DogRow = {
	id: string;
	name: string;
};

type ActionTypeRow = {
	key: string;
};

type DogEventRow = {
	id: string;
	dogId: string;
	actionTypeId: string;
	occurredAt: string;
	actorId: string;
};

type SessionRow = {
	id: string;
	actorId: string;
	createdAt: string;
	expiresAt: string;
	userAgent: string | null;
	ipAddress: string | null;
};

type PushSubscriptionRow = {
	id: string;
	actorId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	active: boolean;
	createdAt: string;
	lastSeenAt: string;
};

type ReminderDeliveryRow = {
	id: string;
	dogId: string;
	actionTypeId: string;
	ruleKey: string;
	localDate: string;
	sentAt: string;
};

const sourceUrl = process.env.POSTGRES_DATABASE_URL ?? process.env.SOURCE_DATABASE_URL;
const targetUrl =
	process.env.SQLITE_DATABASE_URL ?? process.env.DATABASE_URL ?? 'file:./data/woof-watch.db';
const force = process.argv.includes('--force');

if (!sourceUrl) {
	console.error('Set POSTGRES_DATABASE_URL to the source Postgres database URL.');
	process.exit(1);
}

if (!targetUrl.startsWith('file:')) {
	console.error('Set SQLITE_DATABASE_URL or DATABASE_URL to a file: SQLite URL.');
	process.exit(1);
}

function ensureSqliteDirectory(url: string) {
	const filePath = url.replace(/^file:/, '');
	if (filePath === ':memory:') return;

	const directory = path.dirname(filePath);
	if (directory !== '.') {
		mkdirSync(directory, { recursive: true });
	}
}

ensureSqliteDirectory(targetUrl);

const source = new pg.Client({
	connectionString: sourceUrl
});

const adapter = new PrismaBetterSqlite3(
	{ url: targetUrl },
	{
		timestampFormat: 'iso8601'
	}
);
const target = new PrismaClient({ adapter });

async function readSource<T extends object>(query: string) {
	const result = await source.query<T>(query);
	return result.rows;
}

function parsePostgresTimestamp(value: string | null) {
	if (value === null) return null;
	const isoValue = value.includes('T') ? value : value.replace(' ', 'T');
	const date = new Date(`${isoValue}Z`);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid Postgres timestamp: ${value}`);
	}
	return date;
}

async function assertTargetIsEmpty() {
	const [actors, dogs, actionTypes, events, sessions, pushSubscriptions, reminderDeliveries] =
		await Promise.all([
			target.actor.count(),
			target.dog.count(),
			target.actionType.count(),
			target.dogEvent.count(),
			target.session.count(),
			target.pushSubscription.count(),
			target.reminderDelivery.count()
		]);

	const total =
		actors + dogs + actionTypes + events + sessions + pushSubscriptions + reminderDeliveries;
	if (total === 0) return;

	if (!force) {
		throw new Error(
			'Target SQLite database is not empty. Re-run with --force to replace its data.'
		);
	}
}

async function countTarget() {
	const [actors, dogs, actionTypes, events, sessions, pushSubscriptions, reminderDeliveries] =
		await Promise.all([
			target.actor.count(),
			target.dog.count(),
			target.actionType.count(),
			target.dogEvent.count(),
			target.session.count(),
			target.pushSubscription.count(),
			target.reminderDelivery.count()
		]);

	return {
		actors,
		dogs,
		actionTypes,
		events,
		sessions,
		pushSubscriptions,
		reminderDeliveries
	};
}

async function main() {
	await assertTargetIsEmpty();

	await source.connect();
	await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

	const actors = await readSource<ActorRow>(
		'SELECT id, name, code, "codeUsedAt"::text AS "codeUsedAt", "createdAt"::text AS "createdAt" FROM actor ORDER BY "createdAt", id'
	);
	const dogs = await readSource<DogRow>('SELECT id, name FROM dog ORDER BY name');
	const actionTypes = await readSource<ActionTypeRow>('SELECT key FROM action_type ORDER BY key');
	const events = await readSource<DogEventRow>(
		'SELECT id, "dogId", "actionTypeId", "occurredAt"::text AS "occurredAt", "actorId" FROM dog_event ORDER BY "occurredAt", id'
	);
	const sessions = await readSource<SessionRow>(
		'SELECT id, "actorId", "createdAt"::text AS "createdAt", "expiresAt"::text AS "expiresAt", "userAgent", "ipAddress" FROM session ORDER BY "createdAt", id'
	);
	const pushSubscriptions = await readSource<PushSubscriptionRow>(
		'SELECT id, "actorId", endpoint, p256dh, auth, active, "createdAt"::text AS "createdAt", "lastSeenAt"::text AS "lastSeenAt" FROM push_subscription ORDER BY "createdAt", id'
	);
	const reminderDeliveries = await readSource<ReminderDeliveryRow>(
		'SELECT id, "dogId", "actionTypeId", "ruleKey", "localDate", "sentAt"::text AS "sentAt" FROM reminder_delivery ORDER BY "sentAt", id'
	);

	await source.query('COMMIT');

	await target.$transaction(
		async (tx) => {
			if (force) {
				await tx.reminderDelivery.deleteMany();
				await tx.pushSubscription.deleteMany();
				await tx.session.deleteMany();
				await tx.dogEvent.deleteMany();
				await tx.actionType.deleteMany();
				await tx.dog.deleteMany();
				await tx.actor.deleteMany();
			}

			if (actors.length > 0) {
				await tx.actor.createMany({
					data: actors.map((actor) => ({
						...actor,
						codeUsedAt: parsePostgresTimestamp(actor.codeUsedAt),
						createdAt: parsePostgresTimestamp(actor.createdAt)
					}))
				});
			}
			if (dogs.length > 0) await tx.dog.createMany({ data: dogs });
			if (actionTypes.length > 0) await tx.actionType.createMany({ data: actionTypes });
			if (sessions.length > 0) {
				await tx.session.createMany({
					data: sessions.map((session) => ({
						...session,
						createdAt: parsePostgresTimestamp(session.createdAt),
						expiresAt: parsePostgresTimestamp(session.expiresAt)
					}))
				});
			}
			if (pushSubscriptions.length > 0) {
				await tx.pushSubscription.createMany({
					data: pushSubscriptions.map((subscription) => ({
						...subscription,
						createdAt: parsePostgresTimestamp(subscription.createdAt),
						lastSeenAt: parsePostgresTimestamp(subscription.lastSeenAt)
					}))
				});
			}
			if (events.length > 0) {
				await tx.dogEvent.createMany({
					data: events.map((event) => ({
						...event,
						occurredAt: parsePostgresTimestamp(event.occurredAt)
					}))
				});
			}
			if (reminderDeliveries.length > 0) {
				await tx.reminderDelivery.createMany({
					data: reminderDeliveries.map((delivery) => ({
						...delivery,
						sentAt: parsePostgresTimestamp(delivery.sentAt)
					}))
				});
			}
		},
		{
			maxWait: 60_000,
			timeout: 120_000
		}
	);

	const expected = {
		actors: actors.length,
		dogs: dogs.length,
		actionTypes: actionTypes.length,
		events: events.length,
		sessions: sessions.length,
		pushSubscriptions: pushSubscriptions.length,
		reminderDeliveries: reminderDeliveries.length
	};
	const actual = await countTarget();

	console.log(JSON.stringify({ expected, actual }, null, 2));

	if (JSON.stringify(expected) !== JSON.stringify(actual)) {
		throw new Error('SQLite migration count mismatch.');
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await target.$disconnect();
		await source.end().catch(() => undefined);
	});
