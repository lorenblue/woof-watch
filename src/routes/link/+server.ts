import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export async function GET({ url, cookies }) {
    const code = url.searchParams.get('code')?.trim();
    if (!code) throw redirect(302, '/?err=missingcode');

    const now = new Date();

    // One-time link: only allow the first successful use of a code
    const updated = await prisma.actor.updateMany({
        where: { code, codeUsedAt: null },
        data: { codeUsedAt: now }
    });

    if (updated.count === 0) {
        // Distinguish between "bad code" and "already used"
        const existing = await prisma.actor.findUnique({ where: { code } });
        if (!existing) throw redirect(302, '/?err=badcode');
        throw redirect(302, '/?err=codeused');
    }

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