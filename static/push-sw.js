self.addEventListener('push', (event) => {
	let payload = {};

	try {
		payload = event.data?.json() ?? {};
	} catch {
		payload = {
			title: 'Woof Watch',
			body: event.data?.text()
		};
	}

	const title = payload.title || 'Woof Watch';
	const options = {
		body: payload.body,
		icon: payload.icon || '/images/pwa-192.png',
		badge: payload.badge || '/images/pwa-192.png',
		tag: payload.tag,
		data: {
			url: payload.url || '/',
			...(payload.data || {})
		}
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const targetUrl = event.notification.data?.url || '/';
	const url = new URL(targetUrl, self.location.origin).href;

	event.waitUntil(
		self.clients
			.matchAll({
				type: 'window',
				includeUncontrolled: true
			})
			.then((clients) => {
				const existingClient = clients.find((client) => client.url === url);
				if (existingClient) {
					return existingClient.focus();
				}

				return self.clients.openWindow(url);
			})
	);
});
