<script lang="ts">
	import { resolve } from '$app/paths';
	import NotificationControls from '$lib/components/NotificationControls.svelte';

	type NavLink = {
		href: '/' | '/stats' | '/reminders';
		label: string;
	};

	type StatusBadge = {
		label: string;
		tone?: 'warning';
	};

	type Props = {
		navLink?: NavLink;
		navLinks?: NavLink[];
		statusBadge?: StatusBadge;
		showNotificationControls?: boolean;
	};

	let { navLink, navLinks, statusBadge, showNotificationControls = false }: Props = $props();
	let links = $derived(navLinks ?? (navLink ? [navLink] : []));
</script>

<header class="px-5 pt-6 pb-3">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-2xl font-bold tracking-tight">Woof Watch</h1>

		<div class="flex items-center gap-3">
			{#if showNotificationControls}
				<NotificationControls />
			{/if}

			{#if statusBadge}
				<span
					class={`rounded-full px-3 py-1 text-xs font-medium ${
						statusBadge.tone === 'warning'
							? 'bg-amber-500/15 text-amber-300'
							: 'bg-zinc-800 text-zinc-300'
					}`}
				>
					{statusBadge.label}
				</span>
			{/if}

			{#each links as link (link.href)}
				<a
					href={resolve(link.href)}
					class="rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
				>
					{link.label}
				</a>
			{/each}
		</div>
	</div>
</header>
