<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { DogStatus, ActionType, LastEvt } from '$lib/shared/types';
	import { getStatus, logEvent, undoEvent } from '$lib/api/client';
	import humanizeDuration from 'humanize-duration';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import { measureStartup, startupError, startupLog } from '$lib/debug/startup-log';

	type Props = {
		data: { actorName: string | null; dogs: DogStatus[] };
	};

	let { data }: Props = $props();

	let dogs = $state<DogStatus[]>([]);
	let isRefreshing = false;
	let didLogInitialDogs = false;

	function getErrorMessage(error: unknown) {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown error';
	}

	$effect(() => {
		dogs = data.dogs;
		if (!didLogInitialDogs) {
			didLogInitialDogs = true;
			startupLog('page', 'initial dogs assigned to state', {
				dogCount: dogs.length,
				actorName: data.actorName
			});
		}
	});

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

	async function refresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		const refreshMeasure = measureStartup('page', 'refresh status');

		try {
			const result = await getStatus();
			dogs = result.dogs;
			refreshMeasure.end({ dogCount: result.dogs.length });
		} catch (err) {
			refreshMeasure.fail(err);
			startupError('page', 'refresh failed', err);
			console.error(err);
		} finally {
			isRefreshing = false;
		}
	}

	function fmt(evt: LastEvt) {
		if (!evt) return '—';

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

	async function log(dogId: string, actionType: ActionType) {
		const actionMeasure = measureStartup('page', 'log event', { dogId, actionType });

		try {
			await logEvent(dogId, actionType);
			actionMeasure.end();

			haptics[actionType]();

			void refresh();

			return { ok: true as const };
		} catch (err) {
			actionMeasure.fail(err);
			haptics.error();
			return { ok: false as const, message: getErrorMessage(err) };
		}
	}

	async function undo(eventId: string) {
		const undoMeasure = measureStartup('page', 'undo event', { eventId });

		try {
			await undoEvent(eventId);
			undoMeasure.end();
			void refresh();
			return { ok: true as const };
		} catch (err) {
			undoMeasure.fail(err);
			return { ok: false as const, message: getErrorMessage(err) };
		}
	}

	onMount(() => {
		startupLog('page', 'home page mounted', {
			dogCount: dogs.length
		});

		void tick().then(() => {
			startupLog('page', 'tick completed after mount');
		});

		requestAnimationFrame(() => {
			startupLog('page', 'first animation frame after mount');
			requestAnimationFrame(() => {
				startupLog('page', 'second animation frame after mount');
			});
		});

		const vibrationImport = measureStartup('page', 'import ios-vibrator-pro-max');
		void import('ios-vibrator-pro-max')
			.then(() => {
				vibrationImport.end();
			})
			.catch((error) => {
				vibrationImport.fail(error);
			});

		const handler = () => {
			if (document.visibilityState === 'visible') {
				startupLog('page', 'visibility/focus handler triggered', {
					visibilityState: document.visibilityState
				});
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
	<!-- Header -->
	<header class="px-5 pt-6 pb-3">
		<div class="flex items-baseline justify-between">
			<h1 class="text-2xl font-bold tracking-tight">Woof Watch</h1>

			{#if data.actorName}
				<span class="text-xs font-medium text-emerald-400">
					Linked as {data.actorName}
				</span>
			{/if}
		</div>
	</header>

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
					/>
				</div>
			</div>
		{/each}
	</section>
</main>
