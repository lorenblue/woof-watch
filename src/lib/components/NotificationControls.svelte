<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		isPushSupported,
		registerPushNotifications,
		unregisterPushNotifications
	} from '$lib/push';

	type Message = {
		text: string;
		className: string;
	} | null;

	let isSupported = $state(false);
	let permission = $state<NotificationPermission>('default');
	let isRegistered = $state(false);
	let isBusy = $state(false);
	let message = $state<Message>(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressClickTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressNextClick = false;

	const DISABLE_LONG_PRESS_MS = 900;
	const SUPPRESS_CLICK_MS = 700;

	function showMessage(text: string, className: string) {
		message = { text, className };
	}

	function clearLongPressTimer() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function suppressUpcomingClick() {
		if (suppressClickTimer) {
			clearTimeout(suppressClickTimer);
		}

		suppressNextClick = true;
		suppressClickTimer = setTimeout(() => {
			suppressNextClick = false;
			suppressClickTimer = null;
		}, SUPPRESS_CLICK_MS);
	}

	async function refreshState() {
		isSupported = isPushSupported();
		if (!isSupported) {
			return;
		}

		permission = Notification.permission;
		const registration = await navigator.serviceWorker.ready;
		isRegistered = Boolean(await registration.pushManager.getSubscription());
	}

	async function toggleNotifications() {
		if (suppressNextClick) {
			suppressNextClick = false;
			return;
		}

		if (isBusy || !isSupported || permission === 'denied') {
			return;
		}

		if (isRegistered) {
			return;
		}

		isBusy = true;
		message = null;

		try {
			const result = await registerPushNotifications();
			if (!result.ok) {
				permission = Notification.permission;
				showMessage(result.reason, 'text-amber-300');
				return;
			}

			permission = Notification.permission;
			isRegistered = true;
		} catch (err) {
			console.error(err);
			showMessage('Failed', 'text-red-400');
		} finally {
			isBusy = false;
		}
	}

	async function disableNotifications() {
		if (isBusy || !isSupported || permission === 'denied' || !isRegistered) {
			return;
		}

		isBusy = true;
		message = null;

		try {
			await unregisterPushNotifications();
			isRegistered = false;
		} catch (err) {
			console.error(err);
			showMessage('Failed', 'text-red-400');
		} finally {
			isBusy = false;
		}
	}

	function startDisablePress() {
		if (!isRegistered || isBusy || permission === 'denied') {
			return;
		}

		clearLongPressTimer();
		longPressTimer = setTimeout(() => {
			suppressUpcomingClick();
			void disableNotifications();
		}, DISABLE_LONG_PRESS_MS);
	}

	onMount(() => {
		void refreshState();
	});

	onDestroy(() => {
		if (suppressClickTimer) {
			clearTimeout(suppressClickTimer);
		}
		clearLongPressTimer();
	});
</script>

{#if isSupported}
	<div class="flex items-center gap-2">
		<button
			type="button"
			class={`no-touch-callout relative flex h-8 w-8 items-center justify-center rounded-full border text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
				isRegistered
					? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
					: 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
			}`}
			disabled={!isSupported || permission === 'denied' || isBusy}
			aria-label={isRegistered ? 'Hold to disable notifications' : 'Enable notifications'}
			title={isRegistered ? 'Hold to disable notifications' : 'Enable notifications'}
			onpointerdown={startDisablePress}
			onpointerup={clearLongPressTimer}
			onpointerleave={clearLongPressTimer}
			onpointercancel={clearLongPressTimer}
			oncontextmenu={(event) => event.preventDefault()}
			onclick={toggleNotifications}
		>
			🔔
		</button>

		{#if message}
			<p class={`text-xs font-medium ${message.className}`}>
				{message.text}
			</p>
		{/if}
	</div>
{/if}
