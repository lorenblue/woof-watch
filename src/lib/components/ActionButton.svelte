<script lang="ts">
	import { onDestroy } from 'svelte';
	import { successSound, failureSound } from '$lib/sounds';
	import type { ActionType, EventHistoryItem, LastEvt } from '$lib/shared/types';
	import ActionHistorySheet from '$lib/components/ActionHistorySheet.svelte';

	type Result = { ok: true; isLatest?: boolean } | { ok: false; message: string };
	type Message = { text: string; className: string } | null;
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
	const SUPPRESS_CLICK_MS = 700;

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
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressClickTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressNextClick = false;
	let isSheetOpen = $state(false);

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

	function openSheet() {
		isSheetOpen = true;
	}

	function closeSheet() {
		isSheetOpen = false;
	}

	function handlePointerDown() {
		clearLongPressTimer();

		longPressTimer = setTimeout(() => {
			suppressUpcomingClick();
			openSheet();
		}, LONG_PRESS_MS);
	}

	function handlePointerEnd() {
		clearLongPressTimer();
	}

	function showMessage(text: string, className: string, ttlMs: number = 1500) {
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
			showMessage(result.isLatest === false ? 'Added earlier' : 'Logged', 'text-emerald-400');
			return;
		}

		failureSound.play();
		showMessage(result.message, 'text-red-400', 2500);
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

		try {
			showResult(await onLog(dogId, actionType));
		} finally {
			isLoading = false;
		}
	}

	onDestroy(() => {
		if (messageTimer) {
			clearTimeout(messageTimer);
		}
		if (suppressClickTimer) {
			clearTimeout(suppressClickTimer);
		}
		clearLongPressTimer();
	});
</script>

<div class="flex flex-col gap-1">
	<button
		class={`no-touch-callout w-full rounded-2xl py-3 text-base font-semibold active:scale-95 ${toneClass}`}
		onclick={handleClick}
		onpointerdown={handlePointerDown}
		onpointerup={handlePointerEnd}
		onpointercancel={handlePointerEnd}
		onpointerleave={handlePointerEnd}
		oncontextmenu={(event) => event.preventDefault()}
		disabled={isLoading}
	>
		{icon}
		{label}
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
	<ActionHistorySheet
		{dogId}
		{actionType}
		{label}
		{icon}
		{formatEvent}
		onClose={closeSheet}
		{onLog}
		{onUndo}
		{onGetHistory}
		onFeedback={showMessage}
	/>
{/if}
