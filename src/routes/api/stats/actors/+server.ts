import { json } from '@sveltejs/kit';
import { requireActor } from '$lib/server/auth';
import { getActorStats, parseStatsActionType, parseStatsPeriod } from '$lib/server/stats';

export async function GET({ url, cookies }) {
	await requireActor(cookies);

	const period = parseStatsPeriod(url);
	const actionType = parseStatsActionType(url);
	const payload = await getActorStats(period, actionType);

	return json(payload);
}
