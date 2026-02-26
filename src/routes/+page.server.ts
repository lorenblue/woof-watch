import type { PageServerLoad } from './$types';
import type { StatusResponse } from '$lib/shared/types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/status');

	if (!res.ok) {
		return { dogs: [] };
	}

	const status = (await res.json()) as StatusResponse;

	return { dogs: status.dogs };
};
