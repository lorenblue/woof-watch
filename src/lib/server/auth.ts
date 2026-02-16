import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';

export async function getSessionActor(sessionId?: string) {
	if (!sessionId) return null;

	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { actor: true }
	});

	if (!session) return null;
	if (session.expiresAt < new Date()) return null;

	return session.actor;
}

export async function requireActor(sessionId?: string) {
	const actor = await getSessionActor(sessionId);
	if (!actor) throw error(401, 'Not authenticated');
	return actor;
}
