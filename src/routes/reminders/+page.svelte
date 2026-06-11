<script lang="ts">
	import { resolve } from '$app/paths';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import type { ActionType } from '$lib/shared/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const actionLabels: Record<ActionType, string> = {
		pee: 'Pee',
		poo: 'Poo',
		eat: 'Eat'
	};

	const percentOptions = [
		{ value: 0.75, label: 'P75' },
		{ value: 0.8, label: 'P80' },
		{ value: 0.9, label: 'P90' },
		{ value: 0.95, label: 'P95' }
	];

	function minutesLabel(minutes: number) {
		const abs = Math.abs(minutes);
		const hours = Math.floor(abs / 60);
		const mins = abs % 60;

		if (hours === 0) return `${mins}m`;
		if (mins === 0) return `${hours}h`;
		return `${hours}h ${mins}m`;
	}

	function ratioLabel(ratio: number) {
		return `${Math.round(ratio * 100)}%`;
	}

	function latestLabel(value: string) {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: data.form.timezone,
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(value));
	}

	function sampleLabel(score: PageData['scores'][number]) {
		if (score.ignoredSampleCount === 0) return `${score.sampleCount}`;
		return `${score.sampleCount}/${score.rawSampleCount}`;
	}
</script>

<main class="flex min-h-dvh flex-col bg-black text-zinc-100">
	<AppHeader navLink={{ href: '/', label: 'Back to Home' }} />

	<section class="flex flex-col gap-4 px-5 pb-6">
		<div class="rounded-3xl bg-zinc-900 p-4">
			<form method="GET" action={resolve('/reminders')} class="grid gap-3">
				<label class="grid gap-1">
					<span class="text-xs font-medium text-zinc-500 uppercase">As of</span>
					<input
						type="datetime-local"
						name="nowLocal"
						value={data.form.nowLocal}
						class="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
					/>
				</label>

				<input type="hidden" name="timezone" value={data.form.timezone} />

				<div class="grid grid-cols-[1fr_auto] gap-3">
					<div class="grid grid-cols-4 gap-2">
						{#each percentOptions as option (option.value)}
							<label
								class={`rounded-2xl px-3 py-2 text-center text-sm font-semibold transition ${
									option.value === data.form.percentile
										? 'bg-zinc-100 text-black'
										: 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
								}`}
							>
								<input
									type="radio"
									name="percentile"
									value={option.value}
									checked={option.value === data.form.percentile}
									class="sr-only"
								/>
								{option.label}
							</label>
						{/each}
					</div>

					<label class="grid w-20 gap-1">
						<span class="text-[10px] font-medium text-zinc-500 uppercase">Min n</span>
						<input
							type="number"
							name="minSamples"
							min="1"
							max="100"
							value={data.form.minSamples}
							class="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
						/>
					</label>
				</div>

				<button
					type="submit"
					class="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-white"
				>
					Check
				</button>
			</form>
		</div>

		<div class="flex flex-col gap-3">
			{#each data.scores as score (score.dogId + score.actionType)}
				<div
					class={`rounded-3xl p-4 ${
						score.isOverdue ? 'bg-amber-500/10 ring-1 ring-amber-400/30' : 'bg-zinc-900'
					}`}
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<h2 class="text-base font-semibold">
								{score.dogName}
								{actionLabels[score.actionType]}
							</h2>
							<p class="mt-1 text-xs text-zinc-500">Last {latestLabel(score.latestAt)}</p>
						</div>

						<span
							class={`rounded-full px-2.5 py-1 text-xs font-semibold ${
								score.isOverdue
									? 'bg-amber-400/15 text-amber-200'
									: score.hasEnoughSamples
										? 'bg-zinc-800 text-zinc-300'
										: 'bg-zinc-950 text-zinc-500'
							}`}
						>
							{score.isOverdue ? `+${minutesLabel(score.overByMinutes)}` : ratioLabel(score.ratio)}
						</span>
					</div>

					<div class="mt-4 grid grid-cols-3 gap-2 text-sm">
						<div class="rounded-2xl bg-black/30 p-3">
							<p class="text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">Now</p>
							<p class="mt-1 font-semibold tabular-nums">{minutesLabel(score.elapsedMinutes)}</p>
						</div>

						<div class="rounded-2xl bg-black/30 p-3">
							<p class="text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
								P{Math.round(data.form.percentile * 100)}
							</p>
							<p class="mt-1 font-semibold tabular-nums">{minutesLabel(score.usualAgeMinutes)}</p>
						</div>

						<div class="rounded-2xl bg-black/30 p-3">
							<p class="text-[10px] font-medium tracking-[0.16em] text-zinc-500 uppercase">n</p>
							<p class="mt-1 font-semibold tabular-nums">{sampleLabel(score)}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</main>
