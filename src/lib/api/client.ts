import type { StatusResponse, ActionType } from '$lib/shared/types';

async function handleError(res: Response): Promise<void> {
	if (res.ok) return;

	let message = res.statusText || 'Failed';
	try {
		const body = await res.json();
		if (body?.message) message = body.message;
	} catch {}

	throw new Error(message);
}

export async function getStatus(): Promise<StatusResponse> {
	const res = await fetch('/api/status');

	await handleError(res);
	return res.json();
}

export async function logEvent(dogId: string, actionType: ActionType) {
	const res = await fetch('/api/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ dogId, actionType })
	});

	await handleError(res);
}

export async function undoEvent(eventId: string){
	const res = await fetch('/api/events/undo', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ eventId })
	});

	await handleError(res);
}