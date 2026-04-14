import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function getSessionExpiryDate() {
	return new Date(Date.now() + SESSION_DURATION_MS);
}

export function setSessionCookie(cookies: Cookies, sessionId: string) {
	cookies.set('sessionId', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_MAX_AGE_SECONDS
	});
}

export async function getSessionActor(
	cookies: Cookies
) {
	const sessionId = cookies.get('sessionId');
	if (!sessionId) return null;

	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { actor: true }
	});

	if (!session) return null;
	
	if (session.expiresAt < new Date()) {
		await prisma.session.delete({ where: { id: session.id } });
		return null;
	}

	const now = Date.now();
	const expiresAtMs = session.expiresAt.getTime();
	const timeRemaining = expiresAtMs - now;

	if (timeRemaining < SESSION_DURATION_MS / 2) {
		await prisma.session.update({
			where: { id: session.id },
			data: {
				expiresAt: getSessionExpiryDate()
			}
		});

		setSessionCookie(cookies, session.id);
	}

	return session.actor;
}

export async function requireActor(
	cookies: Cookies
) {
	const actor = await getSessionActor(cookies);
	if (!actor) throw error(401, 'Not authenticated');
	return actor;
}
