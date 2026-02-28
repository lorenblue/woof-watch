import { prisma } from '$lib/server/prisma';
import { requireActor } from '$lib/server/auth';
import { json, error } from '@sveltejs/kit';
import crypto from 'crypto';

function generateCode() {
	return crypto.randomBytes(16).toString('base64url');
}

export async function POST({ request, cookies }) {
	const sessionId = cookies.get('sessionId');
	const actor = await requireActor(sessionId, cookies);

	if (actor.role !== 'ADMIN') {
		throw error(403, 'Forbidden');
	}

	const { name } = await request.json();

	if (!name) {
		throw error(400, 'Name required');
	}

	const existing = await prisma.actor.findUnique({
		where: { name }
	});

	if (!existing) {
		throw error(404, 'Actor not found');
	}

	const newCode = generateCode();

	await prisma.actor.update({
		where: { name },
		data: {
			code: newCode,
			codeUsedAt: null
		}
	});

	return json({ name, code: newCode });
}