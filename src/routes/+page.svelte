<script lang="ts">
	import { onMount } from 'svelte';
	import type { DogStatus, ActionType, LastEvt } from '$lib/shared/types';
	import { getStatus, logEvent, undoEvent, getEventHistory } from '$lib/api/client';
	import humanizeDuration from 'humanize-duration';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';

	type Props = {
		data: { actorName: string | null; dogs: DogStatus[] };
	};

	let { data }: Props = $props();

	let dogs = $derived(data.dogs);
	let isRefreshing = false;

	const humanizer = humanizeDuration.humanizer({
		round: true,
		spacer: '',
		language: 'short',
		languages: {
			short: {
				h: () => 'h',
				m: () => 'm'
			}
		},
		units: ['h', 'm'],
		largest: 1,
		delimiter: ' '
	});

	function getErrorMessage(err: unknown) {
		return err instanceof Error ? err.message : 'Failed';
	}

	async function refresh() {
		if (isRefreshing) {
			return;
		}
		isRefreshing = true;

		try {
			const result = await getStatus();
			dogs = result.dogs;
		} catch (err) {
			console.error(err);
		} finally {
			isRefreshing = false;
		}
	}

	function fmt(evt: LastEvt) {
		if (!evt) {
			return '—';
		}

		const at = new Date(evt.at);
		const diffMs = Date.now() - at.getTime();

		return diffMs < 60 * 1000 ? `Just now • ${evt.by}` : `${humanizer(diffMs)} ago • ${evt.by}`;
	}

	const haptics = {
		pee() {
			navigator.vibrate?.([20]);
		},
		poo() {
			navigator.vibrate?.([20, 200, 20]);
		},
		eat() {
			navigator.vibrate?.([20, 200, 20, 200, 20]);
		},
		error() {
			navigator.vibrate?.([300]);
		}
	};

	async function log(dogId: string, actionType: ActionType, occurredAt?: string) {
		try {
			const result = await logEvent(dogId, actionType, occurredAt);
			if (!result.ok) {
				return { ok: false as const, message: result.error };
			}

			haptics[actionType]();

			void refresh();

			return { ok: true as const, isLatest: result.isLatest };
		} catch (err: unknown) {
			haptics.error();
			return { ok: false as const, message: getErrorMessage(err) };
		}
	}

	async function undo(eventId: string) {
		try {
			await undoEvent(eventId);
			void refresh();
			return { ok: true as const };
		} catch (err: unknown) {
			return { ok: false as const, message: getErrorMessage(err) };
		}
	}

	onMount(() => {
		void import('ios-vibrator-pro-max');
		const handler = () => {
			if (document.visibilityState === 'visible') {
				refresh();
			}
		};

		document.addEventListener('visibilitychange', handler);
		window.addEventListener('focus', handler);
		window.addEventListener('pageshow', handler);

		return () => {
			document.removeEventListener('visibilitychange', handler);
			window.removeEventListener('focus', handler);
			window.removeEventListener('pageshow', handler);
		};
	});
</script>

<main class="flex h-dvh flex-col bg-black text-zinc-100">
	<AppHeader
		navLink={data.actorName ? { href: '/stats', label: 'View Stats' } : undefined}
		statusBadge={data.actorName ? undefined : { label: '! Not linked', tone: 'warning' }}
		showNotificationControls={Boolean(data.actorName)}
	/>

	<!-- Dogs Area -->
	<section class="flex flex-col gap-4 px-5 pb-6">
		{#each dogs.slice(0, 2) as d (d.dogId)}
			<div class="flex flex-col rounded-3xl bg-zinc-900 p-4">
				<h2 class="mb-2 text-base font-semibold">{d.name}</h2>

				<div class="flex flex-col gap-4">
					<ActionButton
						dogId={d.dogId}
						actionType="pee"
						label="Pee"
						icon="💦"
						toneClass="bg-sky-500/20"
						lastEvent={d.lastPee}
						formatEvent={fmt}
						onLog={log}
						onUndo={undo}
						onGetHistory={getEventHistory}
					/>

					<ActionButton
						dogId={d.dogId}
						actionType="poo"
						label="Poo"
						icon="💩"
						toneClass="bg-amber-500/20"
						lastEvent={d.lastPoo}
						formatEvent={fmt}
						onLog={log}
						onUndo={undo}
						onGetHistory={getEventHistory}
					/>

					<ActionButton
						dogId={d.dogId}
						actionType="eat"
						label="Eat"
						icon="🥣"
						toneClass="bg-emerald-500/20"
						lastEvent={d.lastEat}
						formatEvent={fmt}
						onLog={log}
						onUndo={undo}
						onGetHistory={getEventHistory}
					/>
				</div>
			</div>
		{/each}
	</section>
</main>
