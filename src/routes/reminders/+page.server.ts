import type { PageServerLoad } from './$types';
import { requireReminderDebugActor } from '$lib/server/auth';
import { getReminderFormState, parseReminderOptions } from '$lib/server/reminder-options';
import { getReminderScores } from '$lib/server/reminders';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const actor = await requireReminderDebugActor(cookies);
	const options = parseReminderOptions(url);
	const scores = await getReminderScores(options);

	return {
		actorName: actor.name,
		form: getReminderFormState(options),
		scores
	};
};
