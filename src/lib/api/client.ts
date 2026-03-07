import type { StatusResponse, ActionType } from '$lib/shared/types';
import { startupError, startupLog } from '$lib/debug/startup-log';

function roundMs(value: number) {
	return Math.round(value * 10) / 10;
}

async function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
	const startedAt = typeof performance !== 'undefined' ? performance.now() : 0;
	const request = input instanceof Request ? input : null;
	const method = init?.method ?? request?.method ?? 'GET';
	const url =
		typeof input === 'string'
			? input
			: input instanceof URL
				? input.toString()
				: (request?.url ?? 'unknown');

	startupLog('api', 'fetch start', { method, url });

	try {
		const response = await fetch(input, init);
		startupLog('api', 'fetch end', {
			method,
			url,
			ok: response.ok,
			status: response.status,
			durationMs: roundMs((typeof performance !== 'undefined' ? performance.now() : 0) - startedAt)
		});

		return response;
	} catch (error) {
		startupError('api', 'fetch failed', error, {
			method,
			url,
			durationMs: roundMs((typeof performance !== 'undefined' ? performance.now() : 0) - startedAt)
		});
		throw error;
	}
}

async function handleError(res: Response): Promise<void> {
	if (res.ok) return;

	let message = res.statusText || 'Failed';
	try {
		const body = await res.json();
		if (body?.message) message = body.message;
	} catch {
		// Fall back to the response status text when the body is not JSON.
	}

	throw new Error(message);
}

export async function getStatus(): Promise<StatusResponse> {
	const res = await timedFetch('/api/status');

	await handleError(res);
	return res.json();
}

export async function logEvent(dogId: string, actionType: ActionType) {
	const res = await timedFetch('/api/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ dogId, actionType })
	});

	await handleError(res);
}

export async function undoEvent(eventId: string) {
	const res = await timedFetch('/api/events/undo', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ eventId })
	});

	await handleError(res);
}