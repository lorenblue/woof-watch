import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import webPush from 'web-push';
import type { Prisma, PushSubscription } from '../../../prisma/generated/client';
import type { PushNotificationPayload, PushSubscriptionPayload } from '$lib/shared/types';

type VapidConfig = {
	subject: string;
	publicKey: string;
	privateKey: string;
};

type WebPushError = Error & {
	statusCode?: number;
};

export type PushSendResult = {
	sent: number;
	failed: number;
	deactivated: number;
};

export function getVapidPublicKey() {
	return env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function requireVapidPublicKey() {
	const publicKey = getVapidPublicKey();
	if (!publicKey) throw error(503, 'Push notifications are not configured');
	return publicKey;
}

function requireVapidConfig(): VapidConfig {
	const publicKey = getVapidPublicKey();
	const privateKey = env.VAPID_PRIVATE_KEY?.trim();
	const subject = env.VAPID_SUBJECT?.trim();

	if (!publicKey || !privateKey || !subject) {
		throw error(503, 'Push notifications are not configured');
	}

	return {
		subject,
		publicKey,
		privateKey
	};
}

export function parsePushSubscriptionPayload(raw: unknown): PushSubscriptionPayload {
	if (!raw || typeof raw !== 'object') {
		throw error(400, 'Invalid push subscription');
	}

	const body = raw as Partial<PushSubscriptionPayload>;
	const keys = body.keys;

	if (!body.endpoint || typeof body.endpoint !== 'string') {
		throw error(400, 'Missing push endpoint');
	}

	if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
		throw error(400, 'Missing push keys');
	}

	return {
		endpoint: body.endpoint,
		expirationTime: body.expirationTime ?? null,
		keys: {
			p256dh: keys.p256dh,
			auth: keys.auth
		}
	};
}

function toWebPushSubscription(subscription: PushSubscription): PushSubscriptionPayload {
	return {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: subscription.p256dh,
			auth: subscription.auth
		}
	};
}

function normalizeNotificationPayload(payload: PushNotificationPayload): PushNotificationPayload {
	return {
		icon: '/images/pwa-192.png',
		badge: '/images/pwa-192.png',
		url: '/',
		...payload
	};
}

function shouldDeactivate(error: unknown) {
	const statusCode = (error as WebPushError).statusCode;
	return statusCode === 404 || statusCode === 410;
}

export async function sendPushNotificationToSubscriptions(
	subscriptions: PushSubscription[],
	payload: PushNotificationPayload
): Promise<PushSendResult> {
	const vapid = requireVapidConfig();
	const notification = JSON.stringify(normalizeNotificationPayload(payload));
	const result: PushSendResult = {
		sent: 0,
		failed: 0,
		deactivated: 0
	};

	await Promise.all(
		subscriptions.map(async (subscription) => {
			try {
				await webPush.sendNotification(toWebPushSubscription(subscription), notification, {
					vapidDetails: vapid
				});
				result.sent += 1;
			} catch (err) {
				result.failed += 1;

				if (shouldDeactivate(err)) {
					await prisma.pushSubscription.update({
						where: { id: subscription.id },
						data: {
							active: false,
							lastSeenAt: new Date()
						}
					});
					result.deactivated += 1;
				}
			}
		})
	);

	return result;
}

export async function sendPushNotifications(
	where: Prisma.PushSubscriptionWhereInput,
	payload: PushNotificationPayload
): Promise<PushSendResult> {
	const subscriptions = await prisma.pushSubscription.findMany({
		where: {
			active: true,
			...where
		}
	});

	return sendPushNotificationToSubscriptions(subscriptions, payload);
}

export async function sendPushNotificationToActor(
	actorId: string,
	payload: PushNotificationPayload
): Promise<PushSendResult> {
	return sendPushNotifications({ actorId }, payload);
}
