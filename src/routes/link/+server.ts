import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export async function GET({ url, cookies }) {
    const code = url.searchParams.get('code')?.trim();
    if (!code) throw redirect(302, '/?err=missingcode');

    const actor = await prisma.actor.findUnique({ where: { code } });
    if (!actor) throw redirect(302, '/?err=badcode');

    cookies.set('actorId', actor.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // set true once you're on HTTPS in prod
        maxAge: 60 * 60 * 24 * 365
    });

    throw redirect(302, '/');
}