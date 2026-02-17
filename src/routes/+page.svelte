<script lang="ts">
    import { onMount } from 'svelte';
    import type { StatusResponse, DogStatus, LastEvt, ActionType } from '$lib/shared/types';
    import humanizeDuration from "humanize-duration";
    import "ios-vibrator-pro-max";
    import ActionButton from '$lib/components/ActionButton.svelte';
    
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
	    largest: 1,
        delimiter: " "
    });

    let dogs: DogStatus[] = [];

    async function refresh() {
        const res = await fetch('/api/status');
        const data: StatusResponse = await res.json();
        dogs = data.dogs;
    }

    function fmt(evt: LastEvt) {
        if (!evt) return '—';

        const at = new Date(evt.at);
        const diffMs = Date.now() - at.getTime();

        return diffMs < 60 * 1000 
	        ? `Just now • ${evt.by}` 
	        : `${humanizer(diffMs)} ago • ${evt.by}`;
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

                return { ok: false as const, message };
            }

            haptics[actionType]();

            void refresh();
            return { ok: true as const };
        } catch {
            haptics.error();
            return { ok: false as const, message: 'Network error' };
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

<main class="h-dvh bg-black text-zinc-100 flex flex-col">

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

                    <ActionButton
                        dogId={d.dogId}
                        actionType="pee"
                        label="Pee"
                        icon="💦"
                        toneClass="bg-sky-500/20"
                        lastEvent={d.lastPee}
                        formatEvent={fmt}
                        onLog={log}
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
                    />

                </div>
            </div>
        {/each}
    </section>

</main>