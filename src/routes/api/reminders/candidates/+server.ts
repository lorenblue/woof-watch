import { json } from '@sveltejs/kit';
import { requireReminderDebugActor } from '$lib/server/auth';
import { findStatisticallyOverdueActions, type ReminderScore } from '$lib/server/reminders';
import { parseReminderOptions } from '$lib/server/reminder-options';

type ReminderCandidateResponse = {
	now: string;
	timezone: string;
	percentile: number;
	minSamples: number;
	candidates: ReminderScore[];
};

export async function GET({ cookies, url }) {
	await requireReminderDebugActor(cookies);

	const options = parseReminderOptions(url);
	const candidates = await findStatisticallyOverdueActions(options);

	const payload: ReminderCandidateResponse = {
		now: options.now.toISOString(),
		timezone: options.timezone,
		percentile: options.percentile,
		minSamples: options.minSamples,
		candidates
	};

	return json(payload);
}
