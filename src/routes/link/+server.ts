import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export async function GET({ url, cookies, request, getClientAddress }) {
	const code = url.searchParams.get('code')?.trim();
	if (!code) throw redirect(302, '/?err=missingcode');

	const now = new Date();

	const actor = await prisma.actor.findUnique({ where: { code } });
	if (!actor) throw redirect(302, '/?err=badcode');

	if (actor.codeUsedAt) {
		throw redirect(302, '/?err=codealreadyused');
	}

	await prisma.actor.update({
		where: { id: actor.id },
		data: { codeUsedAt: now }
	});

	const userAgent = request.headers.get('user-agent') ?? 'unknown';
	const ipAddress = getClientAddress();

	const session = await prisma.session.create({
		data: {
			actorId: actor.id,
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			userAgent,
			ipAddress
		}
	});

	cookies.set('sessionId', session.id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false, // true in prod
		maxAge: 60 * 60 * 24 * 365
	});

	throw redirect(302, '/');
}