declare module 'web-push' {
	import type { PushSubscriptionPayload } from '$lib/shared/types';

	type VapidDetails = {
		subject: string;
		publicKey: string;
		privateKey: string;
	};

	type SendNotificationOptions = {
		vapidDetails?: VapidDetails;
		TTL?: number;
		urgency?: 'very-low' | 'low' | 'normal' | 'high';
		topic?: string;
	};

	type SendNotification = (
		subscription: PushSubscriptionPayload,
		payload?: string | Buffer,
		options?: SendNotificationOptions
	) => Promise<void>;

	const webPush: {
		sendNotification: SendNotification;
	};

	export default webPush;
}
