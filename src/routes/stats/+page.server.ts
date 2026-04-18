import type { PageServerLoad } from './$types';
import { requireActor } from '$lib/server/auth';
import { getActorStats, parseStatsActionType, parseStatsPeriod } from '$lib/server/stats';

export const load: PageServerLoad = async ({ url, cookies }) => {
	await requireActor(cookies);

	const period = parseStatsPeriod(url);
	const actionType = parseStatsActionType(url);
	const stats = await getActorStats(period, actionType);

	return { stats };
};
