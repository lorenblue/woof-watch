import { prisma } from '$lib/server/prisma';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const actorId = cookies.get('actorId');
	if (!actorId) return { actorName: null };

	const actor = await prisma.actor.findUnique({ where: { id: actorId } });
	return { actorName: actor?.name ?? null };
};