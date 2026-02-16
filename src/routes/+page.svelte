<script lang="ts">
    import { onMount } from 'svelte';
    import type { StatusResponse, DogStatus, LastEvt, ActionType } from '$lib/shared/types';
    import humanizeDuration from "humanize-duration";
    
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
    let toast = '';

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

    async function log(dogId: string, actionType: ActionType) {
        toast = 'Logged ✅';
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dogId, actionType })
        });
        if (!res.ok) toast = `Error`;
        await refresh();
        setTimeout(() => (toast = ''), 1800);
    }

    onMount(refresh);
</script>

<main class="h-screen bg-black text-zinc-100 flex flex-col">

    <!-- Header -->
    <header class="px-5 pt-8 pb-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold tracking-tight">Woof Watch</h1>
            <button
                class="text-sm font-medium text-zinc-400 active:opacity-50"
                on:click={refresh}
            >
                Refresh
            </button>
        </div>

        {#if data.actorName}
            <p class="mt-2 text-xs text-emerald-400">Linked as {data.actorName}</p>
        {/if}

        {#if toast}
            <div class="mt-3 rounded-xl bg-emerald-500/15 py-2 text-center text-sm text-emerald-300">
                {toast}
            </div>
        {/if}
    </header>

    <!-- Dogs Area -->
    <section class="flex flex-1 flex-col gap-4 px-5 pb-6">
        {#each dogs.slice(0,2) as d}
            <div class="flex flex-1 flex-col rounded-3xl bg-zinc-900 p-5">
                <h2 class="mb-4 text-lg font-semibold">{d.name}</h2>

                <div class="flex flex-1 flex-col justify-between">

                    <!-- Pee -->
                    <div class="space-y-1">
                        <button
                            class="w-full rounded-2xl bg-sky-500/20 py-4 text-lg font-semibold active:scale-95"
                            on:click={() => log(d.dogId, 'pee')}
                        >
                            💦 Pee
                        </button>
                        <p class="text-center text-sm text-zinc-500">
                            {fmt(d.lastPee)}
                        </p>
                    </div>

                    <!-- Poo -->
                    <div class="space-y-1">
                        <button
                            class="w-full rounded-2xl bg-amber-500/20 py-4 text-lg font-semibold active:scale-95"
                            on:click={() => log(d.dogId, 'poo')}
                        >
                            💩 Poo
                        </button>
                        <p class="text-center text-sm text-zinc-500">
                            {fmt(d.lastPoo)}
                        </p>
                    </div>

                    <!-- Eat -->
                    <div class="space-y-1">
                        <button
                            class="w-full rounded-2xl bg-emerald-500/20 py-4 text-lg font-semibold active:scale-95"
                            on:click={() => log(d.dogId, 'eat')}
                        >
                            🥣 Eat
                        </button>
                        <p class="text-center text-sm text-zinc-500">
                            {fmt(d.lastEat)}
                        </p>
                    </div>

                </div>
            </div>
        {/each}
    </section>

</main>