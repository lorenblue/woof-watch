<script lang="ts">
	import { onMount } from 'svelte';
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

	function showMessage(text: string, className: string) {
		message = { text, className };
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
		if (isBusy || !isSupported || permission === 'denied') {
			return;
		}

		isBusy = true;
		message = null;

		try {
			if (isRegistered) {
				await unregisterPushNotifications();
				isRegistered = false;
				return;
			}

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

	onMount(() => {
		void refreshState();
	});
</script>

{#if isSupported}
	<div class="flex items-center gap-2">
		<button
			type="button"
			class={`relative flex h-8 w-8 items-center justify-center rounded-full border text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
				isRegistered
					? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
					: 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
			}`}
			disabled={!isSupported || permission === 'denied' || isBusy}
			aria-label={isRegistered ? 'Disable notifications' : 'Enable notifications'}
			title={isRegistered ? 'Disable notifications' : 'Enable notifications'}
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
