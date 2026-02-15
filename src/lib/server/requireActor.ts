import { error } from '@sveltejs/kit';
import { prisma } from './prisma';

export async function requireActor(actorId: string | undefined) {
    if (!actorId) throw error(401, 'Not linked. Visit /link?code=...');
    const actor = await prisma.actor.findUnique({ where: { id: actorId } });
    if (!actor) throw error(401, 'Invalid actor');
    return actor;
}