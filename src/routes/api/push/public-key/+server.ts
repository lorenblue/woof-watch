import { json } from '@sveltejs/kit';
import { requireActor } from '$lib/server/auth';
import { requireVapidPublicKey } from '$lib/server/push';
import type { PushPublicKeyResponse } from '$lib/shared/types';

export async function GET({ cookies }) {
	await requireActor(cookies);

	const payload: PushPublicKeyResponse = {
		publicKey: requireVapidPublicKey()
	};

	return json(payload);
}
