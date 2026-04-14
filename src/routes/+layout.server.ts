import type { LayoutServerLoad } from './$types';
import { getSessionActor } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const actor = await getSessionActor(cookies);
	return { actorName: actor?.name ?? null };
};