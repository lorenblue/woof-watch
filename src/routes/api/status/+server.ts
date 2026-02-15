import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { Prisma } from '@prisma/client';
import type { ActionType, DogStatus, LastEvt, StatusResponse } from '$lib/shared/types';

// Latest row per (dogId, actionType) via SQL window function.
// SQLite supports ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...).

type LatestRow = {
	dogId: string;
	actionType: ActionType;
	occurredAt: string; // SQLite returns text; we normalize to ISO
	actorName: string;
};

function toLastEvt(row?: LatestRow): LastEvt {
	if (!row) return null;
	return { at: new Date(row.occurredAt).toISOString(), by: row.actorName };
}

export async function GET() {
	// Always include both dogs in the response.
	const dogs = await prisma.dog.findMany({ orderBy: { name: 'asc' } });
	const dogIds = dogs.map((d) => d.id);

	// If no dogs, return empty payload.
	if (dogIds.length === 0) {
		const payload: StatusResponse = { dogs: [] };
		return json(payload);
	}

	const rows = await prisma.$queryRaw<LatestRow[]>(Prisma.sql`
		WITH ranked AS (
			SELECT
				e.dogId AS dogId,
				e.actionType AS actionType,
				e.occurredAt AS occurredAt,
				a.name AS actorName,
				ROW_NUMBER() OVER (
					PARTITION BY e.dogId, e.actionType
					ORDER BY e.occurredAt DESC
				) AS rn
			FROM DogEvent e
			JOIN Actor a ON a.id = e.actorId
			WHERE e.undoneAt IS NULL
			  AND e.dogId IN (${Prisma.join(dogIds)})
			  AND e.actionType IN ('pee','poo','eat')
		)
		SELECT dogId, actionType, occurredAt, actorName
		FROM ranked
		WHERE rn = 1;
	`);

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