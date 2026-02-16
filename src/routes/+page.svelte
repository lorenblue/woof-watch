<script lang="ts">
    import { onMount } from 'svelte';
    import type { StatusResponse, DogStatus, LastEvt, ActionType } from '$lib/shared/types';
    import humanizeDuration from "humanize-duration";
    import "ios-vibrator-pro-max";
    
    export let data: { actorName: string | null };

    const humanizer = humanizeDuration.humanizer({
        round: true,
        spacer: "",
        language: "short",
        languages: {
            short: {
                h: () => "h",
                m: () => "m",
            },
        },
        units: ["h", "m"],
        delimiter: " "
    });

    let dogs: DogStatus[] = [];
    let success: { dogId: string; type: ActionType } | null = null;
    let error: { dogId: string; type: ActionType; message: string } | null = null;

    async function refresh() {
        const res = await fetch('/api/status');
        const data: StatusResponse = await res.json();
        dogs = data.dogs;
    }

    function fmt(evt: LastEvt) {
        if (!evt) return '—';

        const at = new Date(evt.at);
        const ms = Date.now() - at.getTime();
        
        if (ms < 60 * 1000) {
            return `Just now • ${evt.by}`;
        }
        
        const rel = humanizer(ms, {
            largest: ms < 5 * 60 * 60 * 1000 ? 2 : 1
        });

        return `${rel} ago • ${evt.by}`;
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
        success = null;
        error = null;

        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dogId, actionType })
            });

            if (!res.ok) {
                haptics.error();

                let message = 'Failed';
                try {
                    const body = await res.json();
                    if (body?.message) message = body.message;
                } catch {}

                error = { dogId, type: actionType, message };
                setTimeout(() => error = null, 2500);
                return;
            }

            success = { dogId, type: actionType };

            haptics[actionType]();

            await refresh();
            setTimeout(() => success = null, 1500);
        } catch {
            haptics.error();

            error = { dogId, type: actionType, message: 'Network error' };
            setTimeout(() => error = null, 2500);
        }
    }

    onMount(() => {
        refresh();

        const handler = () => {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        };

        document.addEventListener('visibilitychange', handler);

        return () => {
            document.removeEventListener('visibilitychange', handler);
        };
    });
</script>

<main class="h-dvh bg-black text-zinc-100 flex flex-col overflow-hidden">

    <!-- Header -->
    <header class="px-5 pt-6 pb-3">
        <div class="flex items-baseline justify-between">
            <h1 class="text-2xl font-bold tracking-tight">Woof Watch</h1>

            {#if data.actorName}
                <span class="text-xs text-emerald-400 font-medium">
                    Linked as {data.actorName}
                </span>
            {/if}
        </div>
    </header>

    <!-- Dogs Area -->
    <section class="flex flex-col gap-4 px-5 pb-6">
        {#each dogs.slice(0,2) as d}
            <div class="flex flex-col rounded-3xl bg-zinc-900 p-4">
                <h2 class="mb-2 text-base font-semibold">{d.name}</h2>

                <div class="flex flex-col gap-4">

                    <!-- Pee -->
                    <div class="flex flex-col gap-1">
                        <button
                            class="w-full rounded-2xl bg-sky-500/20 py-3 text-base font-semibold active:scale-95"
                            on:click={() => log(d.dogId, 'pee')}
                        >
                            💦 Pee
                        </button>
                        {#if success && success.dogId === d.dogId && success.type === 'pee'}
                            <p class="text-center text-xs text-emerald-400 font-medium">
                                Logged ✓
                            </p>
                        {:else if error && error.dogId === d.dogId && error.type === 'pee'}
                            <p class="text-center text-xs text-red-400 font-medium">
                                {error.message}
                            </p>
                        {:else}
                            <p class="text-center text-xs text-zinc-500">
                                {fmt(d.lastPee)}
                            </p>
                        {/if}
                    </div>

                    <!-- Poo -->
                    <div class="flex flex-col gap-1">
                        <button
                            class="w-full rounded-2xl bg-amber-500/20 py-3 text-base font-semibold active:scale-95"
                            on:click={() => log(d.dogId, 'poo')}
                        >
                            💩 Poo
                        </button>
                        {#if success && success.dogId === d.dogId && success.type === 'poo'}
                            <p class="text-center text-xs text-emerald-400 font-medium">
                                Logged ✓
                            </p>
                        {:else if error && error.dogId === d.dogId && error.type === 'poo'}
                            <p class="text-center text-xs text-red-400 font-medium">
                                {error.message}
                            </p>
                        {:else}
                            <p class="text-center text-xs text-zinc-500">
                                {fmt(d.lastPoo)}
                            </p>
                        {/if}
                    </div>

                    <!-- Eat -->
                    <div class="flex flex-col gap-1">
                        <button
                            class="w-full rounded-2xl bg-emerald-500/20 py-3 text-base font-semibold active:scale-95"
                            on:click={() => log(d.dogId, 'eat')}
                        >
                            🥣 Eat
                        </button>
                        {#if success && success.dogId === d.dogId && success.type === 'eat'}
                            <p class="text-center text-xs text-emerald-400 font-medium">
                                Logged ✓
                            </p>
                        {:else if error && error.dogId === d.dogId && error.type === 'eat'}
                            <p class="text-center text-xs text-red-400 font-medium">
                                {error.message}
                            </p>
                        {:else}
                            <p class="text-center text-xs text-zinc-500">
                                {fmt(d.lastEat)}
                            </p>
                        {/if}
                    </div>

                </div>
            </div>
        {/each}
    </section>

</main>