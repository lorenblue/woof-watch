// @ts-expect-error virtual module provided by vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';
import { measureStartup, startupError, startupLog } from '$lib/debug/startup-log';

startupLog('pwa', 'hooks.client evaluated');

const swMeasure = measureStartup('pwa', 'registerSW', { immediate: true });

function watchWorker(label: string, worker: ServiceWorker | null | undefined) {
	if (!worker) return;

	startupLog('pwa', `${label} worker detected`, { state: worker.state });
	worker.addEventListener('statechange', () => {
		startupLog('pwa', `${label} worker state changed`, { state: worker.state });
	});
}

registerSW({
	immediate: true,
	onRegisteredSW(swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) {
		swMeasure.end({
			swScriptUrl,
			scope: registration?.scope ?? null
		});

		startupLog('pwa', 'service worker registered', {
			swScriptUrl,
			scope: registration?.scope ?? null
		});

		watchWorker('installing', registration?.installing);
		watchWorker('waiting', registration?.waiting);
		watchWorker('active', registration?.active);
	},
	onOfflineReady() {
		startupLog('pwa', 'service worker offline ready');
	},
	onNeedRefresh() {
		startupLog('pwa', 'service worker requested refresh');
	},
	onRegisterError(error: unknown) {
		swMeasure.fail(error);
		startupError('pwa', 'service worker registration failed', error);
	}
});
