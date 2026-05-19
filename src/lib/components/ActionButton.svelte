<script lang="ts">
	import { onDestroy } from 'svelte';
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
		toneClass: string;
		lastEvent: LastEvt;
		formatEvent: (evt: LastEvt) => string;
		onLog: (dogId: string, actionType: ActionType, occurredAt?: string) => Promise<Result>;
		onUndo: (eventId: string) => Promise<Result>;
		onGetHistory: (
			dogId: string,
			actionType: ActionType
		) => Promise<{ events: EventHistoryItem[] }>;
	};

	const LONG_PRESS_MS = 550;
	const MAX_BACKDATE_MS = 24 * 60 * 60 * 1000;
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
		toneClass,
		lastEvent,
		formatEvent,
		onLog,
		onUndo,
		onGetHistory
	}: Props = $props();

	let message = $state<Message>(null);
	let messageTimer: ReturnType<typeof setTimeout> | null = null;
	let isLoading = $state(false);
	let isUndoActive = $state(false);
	let undoTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressNextClick = false;
	let isSheetOpen = $state(false);
	let history = $state<EventHistoryItem[]>([]);
	let historyMessage = $state<Message>(null);
	let isHistoryLoading = $state(false);
	let isSheetActionLoading = $state(false);
	let customOccurredAt = $state('');

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

	function exitUndoState() {
		isUndoActive = false;

		if (undoTimer) {
			clearTimeout(undoTimer);
			undoTimer = null;
		}
	}

	function enterUndoState(durationMs: number = 5000) {
		exitUndoState();
		isUndoActive = true;

		undoTimer = setTimeout(() => {
			exitUndoState();
		}, durationMs);
	}

	function clearLongPressTimer() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	async function loadHistory() {
		isHistoryLoading = true;
		historyMessage = null;

		try {
			const result = await onGetHistory(dogId, actionType);
			history = result.events;
		} catch (err: unknown) {
			historyMessage = { text: getErrorMessage(err), className: 'text-red-400' };
		} finally {
			isHistoryLoading = false;
		}
	}

	function openSheet() {
		customOccurredAt = localDatetimeValue(new Date());
		isSheetOpen = true;
		void loadHistory();
	}

	function closeSheet() {
		isSheetOpen = false;
		historyMessage = null;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeSheet();
		}
	}

	function handlePointerDown() {
		clearLongPressTimer();

		longPressTimer = setTimeout(() => {
			suppressNextClick = true;
			openSheet();
		}, LONG_PRESS_MS);
	}

	function handlePointerEnd() {
		clearLongPressTimer();
	}

	function showMessage(text: string, className: string, ttlMs: number) {
		if (messageTimer) {
			clearTimeout(messageTimer);
			messageTimer = null;
		}

		message = { text, className };
		messageTimer = setTimeout(() => {
			message = null;
			messageTimer = null;
		}, ttlMs);
	}

	function showResult(result: Result) {
		if (result.ok) {
			successSound.play();
			showMessage(result.isLatest === false ? 'Added earlier' : 'Logged', 'text-emerald-400', 1500);
			return true;
		}

		failureSound.play();
		showMessage(result.message, 'text-red-400', 2500);
		return false;
	}

	async function handleClick() {
		if (suppressNextClick) {
			suppressNextClick = false;
			return;
		}

		if (isLoading) {
			return;
		}
		isLoading = true;

		if (isUndoActive) {
			try {
				const result = await onUndo(lastEvent?.id ?? '');
				if (result.ok) {
					successSound.play();
					showMessage('Undone', 'text-emerald-400', 1500);
					return;
				}
				failureSound.play();
				showMessage(result.message, 'text-red-400', 2500);
			} finally {
				exitUndoState();
				isLoading = false;
			}

			return;
		}

		try {
			const result = await onLog(dogId, actionType);
			if (showResult(result)) {
				enterUndoState();
				return;
			}
		} finally {
			isLoading = false;
		}
	}

	async function logEarlier(occurredAt: Date) {
		if (isSheetActionLoading) {
			return;
		}

		if (Number.isNaN(occurredAt.getTime())) {
			historyMessage = { text: 'Choose a valid time', className: 'text-red-400' };
			return;
		}

		isSheetActionLoading = true;
		historyMessage = null;

		try {
			const result = await onLog(dogId, actionType, occurredAt.toISOString());
			if (result.ok) {
				showResult(result);
				historyMessage = {
					text: result.isLatest === false ? 'Added earlier' : 'Logged',
					className: 'text-emerald-400'
				};
				await loadHistory();
			} else {
				showResult(result);
				historyMessage = { text: result.message, className: 'text-red-400' };
			}
		} finally {
			isSheetActionLoading = false;
		}
	}

	async function logQuickBackdate(ms: number) {
		await logEarlier(new Date(Date.now() - ms));
	}

	async function logCustomTime() {
		if (!customOccurredAt) {
			historyMessage = { text: 'Choose a time', className: 'text-red-400' };
			return;
		}

		await logEarlier(new Date(customOccurredAt));
	}

	async function undoHistoryItem(eventId: string) {
		if (isSheetActionLoading) {
			return;
		}

		isSheetActionLoading = true;
		historyMessage = null;

		try {
			const result = await onUndo(eventId);
			if (result.ok) {
				successSound.play();
				showMessage('Undone', 'text-emerald-400', 1500);
				historyMessage = { text: 'Undone', className: 'text-emerald-400' };
				await loadHistory();
				return;
			}

			failureSound.play();
			showMessage(result.message, 'text-red-400', 2500);
			historyMessage = { text: result.message, className: 'text-red-400' };
		} finally {
			isSheetActionLoading = false;
		}
	}

	onDestroy(() => {
		if (messageTimer) {
			clearTimeout(messageTimer);
		}
		if (undoTimer) {
			clearTimeout(undoTimer);
		}
		clearLongPressTimer();
	});
</script>

<div class="flex flex-col gap-1">
	<button
		class={`w-full rounded-2xl py-3 text-base font-semibold active:scale-95 ${toneClass}`}
		onclick={handleClick}
		onpointerdown={handlePointerDown}
		onpointerup={handlePointerEnd}
		onpointercancel={handlePointerEnd}
		onpointerleave={handlePointerEnd}
		oncontextmenu={(event) => event.preventDefault()}
		disabled={isLoading}
	>
		{#if isUndoActive}
			Undo {label}
		{:else}
			{icon} {label}
		{/if}
	</button>
	{#if message}
		<p class={`text-center text-xs font-medium ${message.className}`}>
			{message.text}
		</p>
	{:else}
		<p class="text-center text-xs text-zinc-500">
			{formatEvent(lastEvent)}
		</p>
	{/if}
</div>

{#if isSheetOpen}
	<div
		class="fixed inset-0 z-50 flex items-end bg-black/70 px-3 pb-3"
		role="presentation"
		onclick={handleBackdropClick}
	>
		<div
			class="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-zinc-950 p-5 text-zinc-100 shadow-2xl ring-1 ring-zinc-800"
			role="dialog"
			aria-modal="true"
			aria-label={`${label} options`}
			tabindex="-1"
		>
			<div class="mb-4 flex items-center justify-between gap-3">
				<div>
					<h3 class="text-lg font-semibold">{icon} {label}</h3>
					<p class="mt-1 text-xs text-zinc-500">Last 24 hours</p>
				</div>

				<button
					class="rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300"
					onclick={closeSheet}
				>
					Close
				</button>
			</div>

			<div class="grid grid-cols-2 gap-2">
				{#each quickBackdates as option (option.label)}
					<button
						class="rounded-2xl bg-zinc-900 px-3 py-3 text-sm font-semibold text-zinc-100 transition active:scale-95 disabled:opacity-50"
						onclick={() => logQuickBackdate(option.ms)}
						disabled={isSheetActionLoading}
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
						class="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
						onclick={logCustomTime}
						disabled={isSheetActionLoading}
					>
						Add
					</button>
				</div>
			</div>

			{#if historyMessage}
				<p class={`mt-3 text-center text-xs font-medium ${historyMessage.className}`}>
					{historyMessage.text}
				</p>
			{/if}

			<div class="mt-5">
				<h4 class="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">Recent</h4>

				{#if isHistoryLoading}
					<p class="mt-3 text-sm text-zinc-500">Loading...</p>
				{:else if history.length === 0}
					<p class="mt-3 text-sm text-zinc-500">No recent logs.</p>
				{:else}
					<div class="mt-3 flex flex-col gap-2">
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
										class="shrink-0 rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 disabled:opacity-50"
										onclick={() => undoHistoryItem(event.id)}
										disabled={isSheetActionLoading}
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
{/if}
