import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { getSessionExpiryDate, setSessionCookie } from '$lib/server/auth';

export async function GET({ url }) {
	const code = url.searchParams.get('code')?.trim();
	if (!code) throw redirect(302, '/?err=missingcode');

	const actor = await prisma.actor.findUnique({ where: { code } });
	if (!actor) throw redirect(302, '/?err=badcode');

	if (actor.codeUsedAt) {
		throw redirect(302, '/?err=codealreadyused');
	}

	return new Response(
		`<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>WoofWatch Invitation</title>

	</head>
	<body>
		<form id="f" method="POST" action="/link">
			<input type="hidden" name="code" value="${code}" />
		</form>
		<script>
			document.getElementById('f').submit();
		</script>
	</body>
</html>`,
		{
			headers: { 'content-type': 'text/html' }
		}
	);
}

export async function POST({ request, cookies, getClientAddress }) {
	const formData = await request.formData();
	const code = formData.get('code')?.toString().trim();
	if (!code) throw redirect(302, '/?err=missingcode');

	const now = new Date();

	const actor = await prisma.actor.findUnique({ where: { code } });
	if (!actor) throw redirect(302, '/?err=badcode');

	if (actor.codeUsedAt) {
		throw redirect(302, '/?err=codealreadyused');
	}

	await prisma.actor.update({
		where: { id: actor.id },
		data: { codeUsedAt: now }
	});

	const userAgent = request.headers.get('user-agent') ?? 'unknown';
	const ipAddress = getClientAddress();

	const session = await prisma.session.create({
		data: {
			actorId: actor.id,
			expiresAt: getSessionExpiryDate(),
			userAgent,
			ipAddress
		}
	});

	setSessionCookie(cookies, session.id);
	throw redirect(302, '/');
}