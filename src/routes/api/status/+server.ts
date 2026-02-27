import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { DogStatus, LastEvt, StatusResponse } from '$lib/shared/types';

type LatestRow = {
	eventId: string;
	dogId: string;
	actionType: string;
	occurredAt: string | Date;
	actorName: string;
};

function toLastEvt(row?: LatestRow): LastEvt {
	if (!row) return null;
	return {
		at: new Date(row.occurredAt).toISOString(),
		by: row.actorName,
		id: row.eventId
	};
}

export async function GET() {
	// Always include both dogs in the response.
	const dogs = await prisma.dog.findMany({ orderBy: { name: 'asc' } });
	// If no dogs, return empty payload.
	if (dogs.length === 0) {
		const payload: StatusResponse = { dogs: [] };
		return json(payload);
	}

	const rows = await prisma.$queryRaw<LatestRow[]>`
		WITH latest AS (
				SELECT
					e."dogId" AS "dogId",
					e."actionTypeId" AS "actionTypeId",
					MAX(e."occurredAt") AS "occurredAt"
				FROM "DogEvent" e
				WHERE e."undoneAt" IS NULL
				GROUP BY e."dogId", e."actionTypeId"
			)
		SELECT
			e."id" AS "eventId",
			l."dogId" AS "dogId",
			t."key" AS "actionType",
			e."occurredAt" AS "occurredAt",
			a."name" AS "actorName"
		FROM latest l
		JOIN "DogEvent" e
			ON e."dogId" = l."dogId"
			AND e."actionTypeId" = l."actionTypeId"
			AND e."occurredAt" = l."occurredAt"
			AND e."undoneAt" IS NULL
		JOIN "Actor" a ON a."id" = e."actorId"
		JOIN "ActionType" t ON t."id" = e."actionTypeId";
	`;

	const byKey = new Map<string, LatestRow>();
	for (const r of rows) byKey.set(`${r.dogId}:${r.actionType}`, r);

	const result: DogStatus[] = dogs.map((dog) => ({
		dogId: dog.id,
		name: dog.name,
		lastPee: toLastEvt(byKey.get(`${dog.id}:pee`)),
		lastPoo: toLastEvt(byKey.get(`${dog.id}:poo`)),
		lastEat: toLastEvt(byKey.get(`${dog.id}:eat`))
	}));

	const payload: StatusResponse = { dogs: result };
	return json(payload);
}