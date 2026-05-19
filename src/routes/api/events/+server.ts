import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { isActionType } from '$lib/shared/types';
import type {
	CreateEventRequest,
	CreateEventResponse,
	ActionType,
	EventHistoryResponse
} from '$lib/shared/types';
import { requireActor } from '$lib/server/auth';

const MIN_EVENT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_BACKDATE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60 * 1000;

function parseOccurredAt(raw: unknown) {
	if (typeof raw !== 'string' || raw.trim() === '') {
		return new Date();
	}

	const occurredAt = new Date(raw);
	if (Number.isNaN(occurredAt.getTime())) {
		throw error(400, 'bad occurredAt');
	}

	const now = Date.now();
	const occurredAtMs = occurredAt.getTime();
	if (occurredAtMs > now + MAX_FUTURE_SKEW_MS) {
		throw error(400, 'occurredAt cannot be in the future');
	}

	if (now - occurredAtMs > MAX_BACKDATE_MS) {
		throw error(400, 'occurredAt is too far in the past');
	}

	return occurredAt;
}

export async function GET({ url, cookies }) {
	const actor = await requireActor(cookies);
	const dogId = url.searchParams.get('dogId')?.trim();
	const actionType = url.searchParams.get('actionType')?.trim();

	if (!dogId) throw error(400, 'dogId required');
	if (!actionType || !isActionType(actionType)) throw error(400, 'bad actionType');

	const events = await prisma.dogEvent.findMany({
		where: {
			dogId,
			actionTypeId: actionType,
			undoneAt: null,
			occurredAt: {
				gte: new Date(Date.now() - MAX_BACKDATE_MS)
			}
		},
		include: {
			actor: true
		},
		orderBy: {
			occurredAt: 'desc'
		},
		take: 5
	});

	const payload: EventHistoryResponse = {
		events: events.map((evt) => ({
			id: evt.id,
			occurredAt: evt.occurredAt.toISOString(),
			actorName: evt.actor.name,
			canUndo: evt.actorId === actor.id
		}))
	};

	return json(payload);
}

export async function POST({ request, cookies }) {
	const actor = await requireActor(cookies);
	const body = (await request.json().catch(() => null)) as Partial<CreateEventRequest> | null;
	const dogId = body?.dogId?.trim();
	const actionType = body?.actionType as ActionType | undefined;

	if (!dogId) throw error(400, 'dogId required');
	if (!actionType || !isActionType(actionType)) throw error(400, 'bad actionType');

	const [dog, actionTypeRow] = await Promise.all([
		prisma.dog.findUnique({ where: { id: dogId } }),
		prisma.actionType.findUnique({ where: { key: actionType } })
	]);
	if (!dog) throw error(400, 'bad dogId');
	if (!actionTypeRow) throw error(400, 'bad actionType');

	const occurredAt = parseOccurredAt(body?.occurredAt);
	const duplicateWindowStart = new Date(occurredAt.getTime() - MIN_EVENT_INTERVAL_MS);
	const duplicateWindowEnd = new Date(occurredAt.getTime() + MIN_EVENT_INTERVAL_MS);

	const duplicateEvt = await prisma.dogEvent.findFirst({
		where: {
			dogId,
			actionTypeId: actionTypeRow.key,
			undoneAt: null,
			occurredAt: {
				gte: duplicateWindowStart,
				lte: duplicateWindowEnd
			}
		},
		select: { id: true }
	});

	if (duplicateEvt) {
		throw error(429, 'Event posted too recently');
	}

	const evt = await prisma.dogEvent.create({
		data: { dogId, actionTypeId: actionTypeRow.key, actorId: actor.id, occurredAt }
	});

	const newerEvt = await prisma.dogEvent.findFirst({
		where: {
			dogId,
			actionTypeId: actionTypeRow.key,
			undoneAt: null,
			occurredAt: {
				gt: occurredAt
			}
		},
		select: { id: true }
	});

	const payload: CreateEventResponse = {
		ok: true,
		eventId: evt.id,
		occurredAt: evt.occurredAt.toISOString(),
		isLatest: !newerEvt
	};
	return json(payload);
}
