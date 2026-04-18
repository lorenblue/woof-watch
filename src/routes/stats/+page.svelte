<script lang="ts">
	import type { StatsActionFilter, StatsPeriod } from '$lib/shared/types';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import type { PageData } from './$types';

	type FilterOption<T extends string> = {
		value: T;
		label: string;
	};

	const periodOptions: FilterOption<StatsPeriod>[] = [
		{ value: '7d', label: '7d' },
		{ value: '30d', label: '30d' },
		{ value: 'all', label: 'All' }
	];

	const actionOptions: FilterOption<StatsActionFilter>[] = [
		{ value: 'all', label: 'All' },
		{ value: 'pee', label: 'Pee' },
		{ value: 'poo', label: 'Poo' },
		{ value: 'eat', label: 'Eat' }
	];

	const countLabels: Record<StatsActionFilter, string> = {
		all: 'logs',
		pee: 'pees',
		poo: 'poos',
		eat: 'meals'
	};

	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		maximumFractionDigits: 0
	});

	let { data }: { data: PageData } = $props();

	function buildHref(next: { period?: StatsPeriod; actionType?: StatsActionFilter }) {
		const params = new URLSearchParams({
			period: next.period ?? data.stats.period,
			actionType: next.actionType ?? data.stats.actionType
		});

		return `/stats?${params.toString()}`;
	}

	function shareLabel(shareOfTotal: number) {
		return percentFormatter.format(shareOfTotal);
	}
</script>

<main class="flex h-dvh flex-col bg-black text-zinc-100">
	<AppHeader navLink={{ href: '/', label: 'Back to Home' }} />

	<section class="flex flex-col gap-4 px-5 pb-6">
		<div class="rounded-3xl bg-zinc-900 p-4">
			<div class="grid grid-cols-3 gap-2">
				{#each periodOptions as option}
					<a
						href={buildHref({ period: option.value })}
						aria-current={option.value === data.stats.period ? 'page' : undefined}
						class={`rounded-2xl px-3 py-2 text-center text-sm font-semibold transition ${
							option.value === data.stats.period
								? 'bg-zinc-100 text-black'
								: 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
						}`}
					>
						{option.label}
					</a>
				{/each}
			</div>

			<div class="mt-4 grid grid-cols-4 gap-2">
				{#each actionOptions as option}
					<a
						href={buildHref({ actionType: option.value })}
						aria-current={option.value === data.stats.actionType ? 'page' : undefined}
						class={`rounded-2xl px-3 py-2 text-center text-sm font-semibold transition ${
							option.value === data.stats.actionType
								? 'bg-zinc-100 text-black'
								: 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
						}`}
					>
						{option.label}
					</a>
				{/each}
			</div>
		</div>

		{#if data.stats.totalEvents === 0}
			<div class="rounded-3xl bg-zinc-900 p-4 text-center">
				<p class="text-base font-semibold text-zinc-100">No logs yet.</p>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				{#each data.stats.actors as actor, index}
					<div
						class={`rounded-3xl px-4 py-4 ${
							index === 0 ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'bg-zinc-900'
						}`}
					>
						<div class="flex items-start gap-4">
							<div class="w-6 pt-1 text-sm font-semibold text-zinc-500 tabular-nums">
								{index + 1}
							</div>

							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<h2 class="truncate text-base font-semibold text-zinc-100">{actor.name}</h2>
									{#if data.actorName === actor.name}
										<span
											class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-emerald-300 uppercase"
										>
											You
										</span>
									{/if}
								</div>

								<p class="mt-1 text-sm text-zinc-400">
									{shareLabel(actor.shareOfTotal)}
								</p>
							</div>

							<div class="text-right">
								<p class="text-3xl font-semibold text-zinc-100 tabular-nums">{actor.total}</p>
								<p class="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
									{countLabels[data.stats.actionType]}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</main>
