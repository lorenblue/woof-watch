// @ts-expect-error virtual module is provided by the PWA plugin
import { registerSW } from 'virtual:pwa-register';

registerSW({
	immediate: true
});
