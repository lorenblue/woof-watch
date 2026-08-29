import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { LastEvt, StatusResponse } from '$lib/shared/types';
import { Prisma } from '../../../../prisma/generated/client';

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

	const dogIds = dogs.map((dog) => dog.id);
	const rows = await prisma.$queryRaw<LatestRow[]>`
		WITH ranked AS (
			SELECT
				e."id" AS "eventId",
				e."dogId" AS "dogId",
				e."actionTypeId" AS "actionType",
				e."occurredAt" AS "occurredAt",
				a."name" AS "actorName",
				ROW_NUMBER() OVER (
					PARTITION BY e."dogId", e."actionTypeId"
					ORDER BY e."occurredAt" DESC, e."id" DESC
				) AS "rank"
			FROM dog_event e
			JOIN actor a ON a."id" = e."actorId"
			WHERE e."dogId" IN (${Prisma.join(dogIds)})
				AND e."actionTypeId" IN ('pee', 'poo', 'eat')
		)
		SELECT
			"eventId",
			"dogId",
			"actionType",
			"occurredAt",
			"actorName"
		FROM ranked
		WHERE "rank" = 1
	`;

	const byKey = new Map<string, LatestRow>();
	for (const row of rows) {
		byKey.set(`${row.dogId}:${row.actionType}`, row);
	}

	const result = dogs.map((dog) => ({
		dogId: dog.id,
		name: dog.name,
		lastPee: toLastEvt(byKey.get(`${dog.id}:pee`)),
		lastPoo: toLastEvt(byKey.get(`${dog.id}:poo`)),
		lastEat: toLastEvt(byKey.get(`${dog.id}:eat`))
	}));

	const payload: StatusResponse = { dogs: result };
	return json(payload);
}
