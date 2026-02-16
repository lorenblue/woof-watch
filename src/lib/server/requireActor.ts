import { error } from '@sveltejs/kit';
import { prisma } from './prisma';

export async function requireActor(sessionId?: string) {
	if (!sessionId) throw error(401, 'Not authenticated');

	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { actor: true }
	});

	if (!session) throw error(401, 'Invalid session');

	if (session.expiresAt < new Date()) {
		throw error(401, 'Session expired');
	}

	return session.actor;
}