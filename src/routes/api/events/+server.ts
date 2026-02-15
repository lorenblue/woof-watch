import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { requireActor } from '$lib/server/requireActor';
import { ActionType } from '@prisma/client';

export async function POST({ request, cookies }) {
    const actor = await requireActor(cookies.get('actorId') ?? undefined);

    const body = await request.json().catch(() => null);
    const dogId = body?.dogId?.trim();
    const actionType = body?.actionType as ActionType | undefined;

    if (!dogId) throw error(400, 'dogId required');
    if (!actionType || !['pee', 'poo', 'eat'].includes(actionType)) throw error(400, 'bad actionType');

    const evt = await prisma.dogEvent.create({
        data: { dogId, actionType, actorId: actor.id }
    });

    return json({ ok: true, eventId: evt.id });
}