<script lang="ts">
    import { onMount } from 'svelte';
    
    type LastEvt = { at: string; by: string; type?: 'pee' | 'poo' } | null;
    type DogStatus = {
        dogId: string;
        name: string;
        lastOut: LastEvt;
        lastPee: LastEvt;
        lastPoo: LastEvt;
        lastEat: LastEvt;
    };

    let dogs: DogStatus[] = [];
    let toast = '';

    const actions = [
        { id: 'pee', label: 'Pee' },
        { id: 'poo', label: 'Poo' },
        { id: 'eat', label: 'Eat' }
    ] as const;

    async function refresh() {
        const res = await fetch('/api/status');
        dogs = (await res.json()).dogs;
    }

    function fmt(evt: LastEvt) {
        if (!evt) return '—';
        const at = new Date(evt.at);
        const mins = Math.floor((Date.now() - at.getTime()) / 60000);
        const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
        return `${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${ago}) • ${evt.by}`;
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
				<div class="flex justify-between gap-3 py-1 text-sm text-zinc-300">
					<strong class="font-semibold text-zinc-100">Last out</strong><span class="text-right">{fmt(d.lastOut)}</span>
				</div>
				<div class="flex justify-between gap-3 py-1 text-sm text-zinc-300">
					<strong class="font-semibold text-zinc-100">Last pee</strong><span class="text-right">{fmt(d.lastPee)}</span>
				</div>
				<div class="flex justify-between gap-3 py-1 text-sm text-zinc-300">
					<strong class="font-semibold text-zinc-100">Last poo</strong><span class="text-right">{fmt(d.lastPoo)}</span>
				</div>
				<div class="flex justify-between gap-3 py-1 text-sm text-zinc-300">
					<strong class="font-semibold text-zinc-100">Last eat</strong><span class="text-right">{fmt(d.lastEat)}</span>
				</div>
				
				<div class="mt-3 grid grid-cols-3 gap-2">
					{#each actions as a}
						<button class="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 font-semibold active:scale-[0.99]" on:click={() => log(d.dogId, a.id)}>{a.label}</button>
					{/each}
				</div>
			</div>
		{/each}
	</section>
	
	<p class="mt-4 text-xs text-zinc-400">
		Link this device by visiting <code class="rounded-lg bg-zinc-900 px-2 py-0.5">/link?code=ABC123</code> (use your actor code).
	</p>
</main>