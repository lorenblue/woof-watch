<script lang="ts">
  import { onMount } from 'svelte';
  import type { DogStatus, ActionType, LastEvt } from '$lib/shared/types';
  import { getStatus, logEvent, undoEvent } from '$lib/api/client';
  import humanizeDuration from 'humanize-duration';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import AppHeader from '$lib/components/AppHeader.svelte';

  type Props = {
    data: { actorName: string | null; dogs: DogStatus[] };
  };

  let { data }: Props = $props();

  let dogs = $state<DogStatus[]>([]);
  let isRefreshing = false;

  $effect(() => {
    dogs = data.dogs;
  });

  const humanizer = humanizeDuration.humanizer({
    round: true,
    spacer: '',
    language: 'short',
    languages: {
      short: {
        h: () => 'h',
        m: () => 'm',
      },
    },
    units: ['h', 'm'],
    largest: 1,
    delimiter: ' ',
  });

  async function refresh () {
    if (isRefreshing) {
      return;
    }
    isRefreshing = true;

    try {
      const result = await getStatus();
      dogs = result.dogs;
    } catch (err) {
      console.error(err);
    } finally {
      isRefreshing = false;
    }
  }

  function fmt (evt: LastEvt) {
    if (!evt) {
      return '—';
    }

    const at = new Date(evt.at);
    const diffMs = Date.now() - at.getTime();

    return diffMs < 60 * 1000 ? `Just now • ${evt.by}` : `${humanizer(diffMs)} ago • ${evt.by}`;
  }

  const haptics = {
    pee () {
      navigator.vibrate?.([20]);
    },
    poo () {
      navigator.vibrate?.([20, 200, 20]);
    },
    eat () {
      navigator.vibrate?.([20, 200, 20, 200, 20]);
    },
    error () {
      navigator.vibrate?.([300]);
    },
  };

  async function log (dogId: string, actionType: ActionType) {
    try {
      await logEvent(dogId, actionType);

      haptics[actionType]();

      void refresh();

      return { ok: true as const };
    } catch (err: any) {
      haptics.error();
      return { ok: false as const, message: err.message };
    }
  }

  async function undo (eventId: string) {
    try {
      await undoEvent(eventId);
      void refresh();
      return { ok: true as const };
    } catch (err: any) {
      return { ok: false as const, message: err.message };
    }
  }

  onMount(() => {
    void import('ios-vibrator-pro-max');
    const handler = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    window.addEventListener('pageshow', handler);

    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
      window.removeEventListener('pageshow', handler);
    };
  });
</script>

<main class="flex h-dvh flex-col bg-black text-zinc-100">
	<AppHeader
			navLink={data.actorName ? { href: '/stats', label: 'View Stats' } : undefined}
			statusBadge={data.actorName ? undefined : { label: '! Not linked', tone: 'warning' }}
	/>
	
	<!-- Dogs Area -->
	<section class="flex flex-col gap-4 px-5 pb-6">
		{#each dogs.slice(0, 2) as d}
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
							onUndo={undo}
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
							onUndo={undo}
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
							onUndo={undo}
					/>
				</div>
			</div>
		{/each}
	</section>
</main>
