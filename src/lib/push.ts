import { deletePushSubscription, getPushPublicKey, savePushSubscription } from '$lib/api/client';
import type { PushSubscriptionPayload } from '$lib/shared/types';

export type PushRegistrationResult =
	| { ok: true; subscription: PushSubscription }
	| { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' };

function urlBase64ToUint8Array(value: string) {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);

	for (let i = 0; i < raw.length; i += 1) {
		output[i] = raw.charCodeAt(i);
	}

	return output;
}

function toPayload(subscription: PushSubscription): PushSubscriptionPayload | null {
	const json = subscription.toJSON();
	const endpoint = json.endpoint;
	const keys = json.keys;

	if (!endpoint || !keys?.p256dh || !keys.auth) {
		return null;
	}

	return {
		endpoint,
		expirationTime: json.expirationTime,
		keys: {
			p256dh: keys.p256dh,
			auth: keys.auth
		}
	};
}

export function isPushSupported() {
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerPushNotifications(): Promise<PushRegistrationResult> {
	if (!isPushSupported()) {
		return { ok: false, reason: 'unsupported' };
	}

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') {
		return { ok: false, reason: 'denied' };
	}

	const [{ publicKey }, registration] = await Promise.all([
		getPushPublicKey(),
		navigator.serviceWorker.ready
	]);

	const existing = await registration.pushManager.getSubscription();
	const subscription =
		existing ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicKey)
		}));

	const payload = toPayload(subscription);
	if (!payload) {
		return { ok: false, reason: 'unavailable' };
	}

	await savePushSubscription(payload);

	return { ok: true, subscription };
}

export async function unregisterPushNotifications() {
	if (!isPushSupported()) {
		return;
	}

	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();
	if (!subscription) {
		return;
	}

	await deletePushSubscription(subscription.endpoint);
	await subscription.unsubscribe();
}
