<script lang="ts">
	import { onMount } from 'svelte';
	import { successSound, failureSound } from '$lib/sounds';
	import type { ActionType, EventHistoryItem, LastEvt } from '$lib/shared/types';

	type Result = { ok: true; isLatest?: boolean } | { ok: false; message: string };
	type Message = { text: string; className: string } | null;
	type QuickBackdate = {
		label: string;
		ms: number;
	};
	type Props = {
		dogId: string;
		actionType: ActionType;
		label: string;
		icon: string;
		formatEvent: (evt: LastEvt) => string;
		onClose: () => void;
		onLog: (dogId: string, actionType: ActionType, occurredAt?: string) => Promise<Result>;
		onUndo: (eventId: string) => Promise<Result>;
		onGetHistory: (
			dogId: string,
			actionType: ActionType
		) => Promise<{ events: EventHistoryItem[] }>;
		onFeedback: (text: string, className: string) => void;
	};

	const MAX_BACKDATE_MS = 12 * 60 * 60 * 1000;
	const quickBackdates: QuickBackdate[] = [
		{ label: '15m ago', ms: 15 * 60 * 1000 },
		{ label: '30m ago', ms: 30 * 60 * 1000 },
		{ label: '1h ago', ms: 60 * 60 * 1000 },
		{ label: '2h ago', ms: 2 * 60 * 60 * 1000 }
	];

	let {
		dogId,
		actionType,
		label,
		icon,
		formatEvent,
		onClose,
		onLog,
		onUndo,
		onGetHistory,
		onFeedback
	}: Props = $props();

	let history = $state<EventHistoryItem[]>([]);
	let message = $state<Message>(null);
	let isHistoryLoading = $state(false);
	let hasLoadedHistory = $state(false);
	let isActionLoading = $state(false);
	let customOccurredAt = $state(localDatetimeValue(new Date()));

	const absoluteFormatter = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit'
	});

	function getErrorMessage(err: unknown) {
		return err instanceof Error ? err.message : 'Failed';
	}

	function localDatetimeValue(date: Date) {
		const pad = (value: number) => value.toString().padStart(2, '0');

		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
			date.getHours()
		)}:${pad(date.getMinutes())}`;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function reportResult(result: Result) {
		if (result.ok) {
			successSound.play();
			const text = result.isLatest === false ? 'Added earlier' : 'Logged';
			onFeedback(text, 'text-emerald-400');
			message = { text, className: 'text-emerald-400' };
			return true;
		}

		failureSound.play();
		onFeedback(result.message, 'text-red-400');
		message = { text: result.message, className: 'text-red-400' };
		return false;
	}

	async function loadHistory() {
		isHistoryLoading = true;
		message = null;

		try {
			const result = await onGetHistory(dogId, actionType);
			history = result.events;
			hasLoadedHistory = true;
		} catch (err: unknown) {
			message = { text: getErrorMessage(err), className: 'text-red-400' };
			hasLoadedHistory = true;
		} finally {
			isHistoryLoading = false;
		}
	}

	async function logEarlier(occurredAt: Date) {
		if (isActionLoading) {
			return;
		}

		if (Number.isNaN(occurredAt.getTime())) {
			message = { text: 'Choose a valid time', className: 'text-red-400' };
			return;
		}

		isActionLoading = true;
		message = null;

		try {
			const result = await onLog(dogId, actionType, occurredAt.toISOString());
			if (reportResult(result)) {
				await loadHistory();
			}
		} finally {
			isActionLoading = false;
		}
	}

	async function logQuickBackdate(ms: number) {
		await logEarlier(new Date(Date.now() - ms));
	}

	async function logCustomTime() {
		if (!customOccurredAt) {
			message = { text: 'Choose a time', className: 'text-red-400' };
			return;
		}

		await logEarlier(new Date(customOccurredAt));
	}

	async function undoHistoryItem(eventId: string) {
		if (isActionLoading) {
			return;
		}

		isActionLoading = true;
		message = null;

		try {
			const result = await onUndo(eventId);
			if (result.ok) {
				successSound.play();
				onFeedback('Undone', 'text-emerald-400');
				message = { text: 'Undone', className: 'text-emerald-400' };
				await loadHistory();
				return;
			}

			failureSound.play();
			onFeedback(result.message, 'text-red-400');
			message = { text: result.message, className: 'text-red-400' };
		} finally {
			isActionLoading = false;
		}
	}

	onMount(() => {
		void loadHistory();
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-end bg-black/70 px-3 pb-3"
	role="presentation"
	onclick={handleBackdropClick}
>
	<div
		class="no-touch-callout flex h-[82dvh] max-h-[88dvh] w-full flex-col rounded-t-3xl bg-zinc-950 p-5 text-zinc-100 shadow-2xl ring-1 ring-zinc-800"
		role="dialog"
		aria-modal="true"
		aria-label={`${label} options`}
		tabindex="-1"
	>
		<div class="mb-4 flex items-center justify-between gap-3">
			<div>
				<h3 class="text-lg font-semibold">{icon} {label}</h3>
				<p class="mt-1 text-xs text-zinc-500">Add a log</p>
			</div>

			<button
				class="rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300"
				onclick={onClose}
			>
				Close
			</button>
		</div>

		<div class="grid grid-cols-2 gap-2">
			{#each quickBackdates as option (option.label)}
				<button
					class="rounded-2xl bg-zinc-900 px-3 py-3 text-sm font-semibold text-zinc-100 transition active:scale-95"
					onclick={() => logQuickBackdate(option.ms)}
					disabled={isActionLoading}
				>
					{option.label}
				</button>
			{/each}
		</div>

		<div class="mt-4 rounded-2xl bg-zinc-900 p-3">
			<label class="text-xs font-medium text-zinc-400" for={`${dogId}-${actionType}-time`}>
				Custom time
			</label>
			<div class="mt-2 flex gap-2">
				<input
					id={`${dogId}-${actionType}-time`}
					class="min-w-0 flex-1 rounded-xl bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none"
					type="datetime-local"
					bind:value={customOccurredAt}
					min={localDatetimeValue(new Date(Date.now() - MAX_BACKDATE_MS))}
					max={localDatetimeValue(new Date())}
				/>
				<button
					class="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-black"
					onclick={logCustomTime}
					disabled={isActionLoading}
				>
					Add
				</button>
			</div>
		</div>

		{#if message}
			<p class={`mt-3 text-center text-xs font-medium ${message.className}`}>
				{message.text}
			</p>
		{/if}

		<div class="mt-5 flex min-h-0 flex-1 flex-col">
			<h4 class="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">Recent</h4>

			{#if isHistoryLoading && !hasLoadedHistory}
				<p class="mt-3 text-sm text-zinc-500">Loading...</p>
			{:else if history.length === 0}
				<p class="mt-3 text-sm text-zinc-500">No recent logs.</p>
			{:else}
				<div class="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
					{#each history as event (event.id)}
						<div class="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900 p-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-zinc-100">
									{formatEvent({ at: event.occurredAt, by: event.actorName, id: event.id })}
								</p>
								<p class="mt-1 text-xs text-zinc-500">
									{absoluteFormatter.format(new Date(event.occurredAt))}
								</p>
							</div>

							{#if event.canUndo}
								<button
									class="shrink-0 rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300"
									onclick={() => undoHistoryItem(event.id)}
									disabled={isActionLoading}
								>
									Undo
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
