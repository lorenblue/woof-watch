import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { runReminderChecks } from '$lib/server/reminders';

function requireReminderAccess(request: Request, url: URL) {
	const secret = env.REMINDER_RUN_SECRET?.trim();

	if (!secret) {
		if (dev) return;
		throw error(503, 'Reminder runner is not configured');
	}

	const auth = request.headers.get('authorization') ?? '';
	const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null;
	const querySecret = url.searchParams.get('secret')?.trim();

	if (bearer !== secret && querySecret !== secret) {
		throw error(401, 'Unauthorized');
	}
}

async function run({ request, url }: { request: Request; url: URL }) {
	requireReminderAccess(request, url);

	const nowParam = url.searchParams.get('now');
	const now = nowParam ? new Date(nowParam) : undefined;
	if (nowParam && Number.isNaN(now?.getTime())) {
		throw error(400, 'Invalid now');
	}

	const dryRun = url.searchParams.get('dryRun') === 'true';
	const result = await runReminderChecks({ now, dryRun });
	return json(result);
}

export const GET = run;
export const POST = run;
