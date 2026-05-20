import type {
	StatusResponse,
	ActionType,
	CreateEventResponse,
	EventHistoryResponse
} from '$lib/shared/types';

async function handleError(res: Response): Promise<void> {
	if (res.ok) return;

	let message = 'Request failed';
	try {
		const body = await res.json();
		if (body?.message) message = body.message;
	} catch {
		if (res.status === 401) message = 'Authentication required';
		if (res.status === 404) message = 'Not found';
	}

	throw new Error(message);
}

export async function getStatus(): Promise<StatusResponse> {
	const res = await fetch('/api/status');

	await handleError(res);
	return res.json();
}

export async function logEvent(
	dogId: string,
	actionType: ActionType,
	occurredAt?: string
): Promise<CreateEventResponse> {
	const res = await fetch('/api/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ dogId, actionType, occurredAt })
	});

	await handleError(res);
	return res.json();
}

export async function undoEvent(eventId: string) {
	const res = await fetch('/api/events/undo', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ eventId })
	});

	await handleError(res);
}

export async function getEventHistory(
	dogId: string,
	actionType: ActionType
): Promise<EventHistoryResponse> {
	const params = new URLSearchParams({ dogId, actionType });
	const res = await fetch(`/api/events?${params.toString()}`);

	await handleError(res);
	return res.json();
}
