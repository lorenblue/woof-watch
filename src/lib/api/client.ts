import type { StatusResponse, ActionType } from '$lib/shared/types';

export async function getStatus(): Promise<StatusResponse> {
	const res = await fetch('/api/status');

	if (!res.ok) {
		throw new Error('Failed to fetch status');
	}

	return res.json();
}

export async function logEvent(dogId: string, actionType: ActionType) {
	const res = await fetch('/api/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ dogId, actionType })
	});

	if (!res.ok) {
		let message = 'Failed';
		try {
			const body = await res.json();
			if (body?.message) message = body.message;
		} catch {}
		throw new Error(message);
	}
}

export async function undoEvent(eventId: string){
	const res = await fetch('/api/events/undo', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ eventId })
	});

	if (!res.ok) {
		let message = 'Failed';
		try {
			const body = await res.json();
			if (body?.message) message = body.message;
		} catch {}
		throw new Error(message);
	}
}