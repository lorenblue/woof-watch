import { json, error } from '@sveltejs/kit';
import { requireActor } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';
import { parsePushSubscriptionPayload } from '$lib/server/push';
import type { PushSubscriptionResponse } from '$lib/shared/types';

export async function POST({ request, cookies }) {
	const actor = await requireActor(cookies);
	const body = await request.json().catch(() => null);
	const subscription = parsePushSubscriptionPayload(body);
	const now = new Date();

	await prisma.pushSubscription.upsert({
		where: { endpoint: subscription.endpoint },
		create: {
			actorId: actor.id,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			active: true,
			lastSeenAt: now
		},
		update: {
			actorId: actor.id,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			active: true,
			lastSeenAt: now
		}
	});

	const payload: PushSubscriptionResponse = { ok: true };
	return json(payload);
}

export async function DELETE({ request, cookies }) {
	const actor = await requireActor(cookies);
	const body = await request.json().catch(() => null);

	if (!body || typeof body !== 'object') {
		throw error(400, 'Invalid push subscription');
	}

	const endpoint = (body as { endpoint?: unknown }).endpoint;
	if (typeof endpoint !== 'string' || endpoint.trim() === '') {
		throw error(400, 'Missing push endpoint');
	}

	await prisma.pushSubscription.updateMany({
		where: {
			actorId: actor.id,
			endpoint
		},
		data: {
			active: false,
			lastSeenAt: new Date()
		}
	});

	const payload: PushSubscriptionResponse = { ok: true };
	return json(payload);
}
