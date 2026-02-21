<script lang="ts">
  import { onDestroy } from 'svelte';
  import { successSound, failureSound } from '$lib/sounds';
  import type { ActionType, LastEvt } from '$lib/shared/types';

  type Result =
    | { ok: true }
    | { ok: false; message: string };
  type Message = { text: string; className: string } | null;
  type Props = {
    dogId: string;
    actionType: ActionType;
    label: string;
    icon: string;
    toneClass: string;
    lastEvent: LastEvt;
    formatEvent: (evt: LastEvt) => string;
    onLog: (dogId: string, actionType: ActionType) => Promise<Result>;
    onUndo: (eventId: string) => Promise<Result>;
  };

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
  }: Props = $props();

  let message = $state<Message>(null);
  let messageTimer: ReturnType<typeof setTimeout> | null = null;
  let isLoading = $state(false);
  let isUndoActive = $state(false);
  let undoTimer: ReturnType<typeof setTimeout> | null = null;

  function exitUndoState () {
    isUndoActive = false;

    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
  }

  function enterUndoState (durationMs: number = 5000) {
    exitUndoState();
    isUndoActive = true;

    undoTimer = setTimeout(() => {
      exitUndoState();
    }, durationMs);
  }

  function showMessage (text: string, className: string, ttlMs: number) {
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

  async function handleClick () {
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
    }

    try {
      const result = await onLog(dogId, actionType);
      if (result.ok) {
        successSound.play();
        showMessage('Logged', 'text-emerald-400', 1500);
        enterUndoState();
        return;
      }
      failureSound.play();
      showMessage(result.message, 'text-red-400', 2500);
    } finally {
      isLoading = false;
    }
  }

  onDestroy(() => {
    if (messageTimer) {
      clearTimeout(messageTimer);
    }
    if (undoTimer) {
      clearTimeout(undoTimer);
    }
  });
</script>

<div class="flex flex-col gap-1">
	<button
			class={`w-full rounded-2xl py-3 text-base font-semibold active:scale-95 ${toneClass}`}
			onclick={handleClick}
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
