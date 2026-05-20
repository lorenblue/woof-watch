import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { requireActor } from '$lib/server/auth';

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

	await prisma.dogEvent.update({
		where: { id: eventId },
		data: { undoneAt: new Date(), undoneById: actor.id }
	});

	return json({ ok: true });
}
