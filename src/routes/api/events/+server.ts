import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { requireActor } from '$lib/server/requireActor';
import { isActionType } from '$lib/shared/types';
import type { CreateEventRequest, CreateEventResponse, ActionType } from '$lib/shared/types';

export async function POST({ request, cookies }) {
	  const actor = await requireActor(cookies.get('sessionId') ?? undefined);
	  const body = (await request.json().catch(() => null)) as Partial<CreateEventRequest> | null;
	  const dogId = body?.dogId?.trim();
	  const actionType = body?.actionType as ActionType | undefined;
		
    if (!dogId) throw error(400, 'dogId required');
    if (!actionType || !isActionType(actionType)) throw error(400, 'bad actionType');

		const mostRecentEvt = await prisma.dogEvent.findFirst({
			where: {
				dogId,
				actionType
			},
			orderBy: {
				occurredAt: 'desc'
			}
		});

		const MIN_EVENT_INTERVAL_MS = 5 * 60 * 1000;

		if (mostRecentEvt) {
			const lastOccurredAt = new Date(mostRecentEvt.occurredAt).getTime();
			const now = Date.now();

			if (now - lastOccurredAt < MIN_EVENT_INTERVAL_MS) {
				throw error(429, 'Event posted too recently');
			}
		}
		
    const evt = await prisma.dogEvent.create({
        data: { dogId, actionType, actorId: actor.id }
    });

    const payload: CreateEventResponse = { ok: true, eventId: evt.id };
    return json(payload);
}