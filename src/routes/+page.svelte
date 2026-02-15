<script lang="ts">
    import { onMount } from 'svelte';
    
    type LastEvt = { at: string; by: string; type?: 'pee' | 'poo' } | null;
    type DogStatus = {
        dogId: string;
        name: string;
        lastPee: LastEvt;
        lastPoo: LastEvt;
        lastEat: LastEvt;
    };

    let dogs: DogStatus[] = [];
    let toast = '';

    async function refresh() {
        const res = await fetch('/api/status');
        dogs = (await res.json()).dogs;
    }

    function fmt(evt: LastEvt) {
        if (!evt) return '—';
        const at = new Date(evt.at);
        return `${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${evt.by}`;
    }

    async function log(dogId: string, actionType: 'pee' | 'poo' | 'eat') {
        toast = 'Logged ✅';
        const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dogId, actionType })
        });
        if (!res.ok) toast = `Error: ${await res.text()}`;
        await refresh();
        setTimeout(() => (toast = ''), 2000);
    }

    onMount(() => {
        refresh();
    });
</script>

<main class="min-h-screen bg-zinc-950 text-zinc-100 p-4">
	<header class="flex flex-wrap items-center gap-3">
		<h1 class="m-0 text-xl font-semibold">Woof Watch</h1>
		<button class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-semibold active:scale-[0.99]" on:click={refresh}>Refresh</button>
		<span class="min-h-[1em] text-sm text-emerald-200">{toast}</span>
	</header>
	
	<section class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each dogs as d}
			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
				<h2 class="mb-3 mt-0 text-base font-semibold">{d.name}</h2>
				
				<div class="mt-3 grid grid-cols-1 gap-3">
                    <div class="flex flex-col gap-1">
                        <button
                            class="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-semibold active:scale-[0.99]"
                            on:click={() => log(d.dogId, 'pee')}
                        >
                            💦 Pee
                        </button>
                        <div class="text-center text-xs text-zinc-400">{fmt(d.lastPee)}</div>
                    </div>

                    <div class="flex flex-col gap-1">
                        <button
                            class="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-semibold active:scale-[0.99]"
                            on:click={() => log(d.dogId, 'poo')}
                        >
                            💩 Poo
                        </button>
                        <div class="text-center text-xs text-zinc-400">{fmt(d.lastPoo)}</div>
                    </div>

                    <div class="flex flex-col gap-1">
                        <button
                            class="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-semibold active:scale-[0.99]"
                            on:click={() => log(d.dogId, 'eat')}
                        >
                            🥣 Eat
                        </button>
                        <div class="text-center text-xs text-zinc-400">{fmt(d.lastEat)}</div>
                    </div>
                </div>
			</div>
		{/each}
	</section>
	
	<p class="mt-4 text-xs text-zinc-400">
		Link this device by visiting <code class="rounded-lg bg-zinc-900 px-2 py-0.5">/link?code=ABC123</code> (use your actor code).
	</p>
</main>