import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { requireActor } from '$lib/server/auth';

const MAX_UNDO_AGE_MS = 12 * 60 * 60 * 1000;

export async function POST({ request, cookies }) {
	const actor = await requireActor(cookies);
	const body = await request.json();
	const eventId = body?.eventId?.trim();

	if (!eventId) throw error(400, 'Missing event');

	const evt = await prisma.dogEvent.findUnique({
		where: { id: eventId }
	});

	if (!evt) throw error(404, 'Event not found');

	if (evt.actorId !== actor.id) {
		throw error(403, 'Not allowed to undo this event');
	}

	if (Date.now() - evt.occurredAt.getTime() > MAX_UNDO_AGE_MS) {
		throw error(403, 'Event is too old to undo');
	}

	await prisma.dogEvent.delete({ where: { id: eventId } });

	return json({ ok: true });
}
