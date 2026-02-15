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

<main class="wrap">
	<header class="head">
		<h1>Woof Watch</h1>
		<button class="btn" on:click={refresh}>Refresh</button>
		<span class="toast">{toast}</span>
	</header>
	
	<section class="grid">
		{#each dogs as d}
			<div class="card">
				<h2>{d.name}</h2>
				<div class="row"><strong>Last out</strong><span>{fmt(d.lastOut)}</span></div>
				<div class="row"><strong>Last pee</strong><span>{fmt(d.lastPee)}</span></div>
				<div class="row"><strong>Last poo</strong><span>{fmt(d.lastPoo)}</span></div>
				<div class="row"><strong>Last eat</strong><span>{fmt(d.lastEat)}</span></div>
				
				<div class="buttons">
					{#each actions as a}
						<button class="btn primary" on:click={() => log(d.dogId, a.id)}>{a.label}</button>
					{/each}
				</div>
			</div>
		{/each}
	</section>
	
	<p class="hint">
		Link this device by visiting <code>/link?code=ABC123</code> (use your actor code).
	</p>
</main>

<style>
    :global(body){ margin:0; font-family: system-ui,-apple-system,sans-serif; background:#0b0b0b; color:#f1f1f1; }
    .wrap{ padding:16px; }
    .head{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    h1{ margin:0; font-size:20px; }
    .toast{ color:#b9ffb9; min-height:1em; }
    .grid{ margin-top:16px; display:grid; gap:12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card{ background:#111; border:1px solid #222; border-radius:14px; padding:14px; }
    h2{ margin:0 0 12px; font-size:16px; }
    .row{ display:flex; justify-content:space-between; gap:12px; font-size:13px; padding:4px 0; color:#ddd; }
    strong{ color:#fff; font-weight:600; }
    .buttons{ margin-top:12px; display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }
    .btn{ border:1px solid #2a2a2a; background:#1c1c1c; color:#fff; padding:10px 12px; border-radius:12px; font-weight:600; }
    .btn.primary{ background:#2a2a2a; }
    .hint{ margin-top:16px; color:#aaa; font-size:12px; }
    code{ background:#151515; padding:2px 6px; border-radius:8px; }
</style>