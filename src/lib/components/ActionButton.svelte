<script lang="ts">
    import { onDestroy } from 'svelte';
    import type { ActionType, LastEvt } from '$lib/shared/types';

    type ActionLogResult =
        | { ok: true }
        | { ok: false; message: string };
    type Message = { text: string; className: string } | null;

    export let dogId: string;
    export let actionType: ActionType;
    export let label: string;
    export let icon: string;
    export let toneClass: string;
    export let lastEvent: LastEvt;
    export let formatEvent: (evt: LastEvt) => string;
    export let onLog: (dogId: string, actionType: ActionType) => Promise<ActionLogResult>;

    let message: Message = null;
    let messageTimer: ReturnType<typeof setTimeout> | null = null;

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

    async function handleClick() {
        const result = await onLog(dogId, actionType);
        if (result.ok) {
            showMessage('Logged', 'text-emerald-400', 1500);
            return;
        }
        showMessage(result.message, 'text-red-400', 2500);
    }

    onDestroy(() => {
        if (messageTimer) clearTimeout(messageTimer);
    });
</script>

<div class="flex flex-col gap-1">
    <button
        class={`w-full rounded-2xl py-3 text-base font-semibold active:scale-95 ${toneClass}`}
        on:click={handleClick}
    >
        {icon} {label}
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
