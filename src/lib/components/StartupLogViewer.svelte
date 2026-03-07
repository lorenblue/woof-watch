<script lang="ts">
	import { onMount } from 'svelte';
	import {
		clearStartupLog,
		formatStartupLogDetails,
		formatStartupLogDump,
		getStartupLogEntries,
		getStartupLogMeta,
		startupError,
		startupLog,
		type StartupLogEntry,
		type StartupLogMeta,
		subscribeToStartupLog
	} from '$lib/debug/startup-log';

	let isOpen = $state(false);
	let isCopying = $state(false);
	let copyStatus = $state<'idle' | 'done' | 'failed'>('idle');
	let entries = $state<StartupLogEntry[]>([]);
	let meta = $state<StartupLogMeta>({ startedAtIso: null, entryCount: 0 });

	function sync(nextEntries: StartupLogEntry[], nextMeta: StartupLogMeta) {
		entries = nextEntries;
		meta = nextMeta;
	}

	function levelClass(level: StartupLogEntry['level']) {
		if (level === 'error') return 'border-red-500/40 bg-red-500/10 text-red-100';
		if (level === 'warn') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
		return 'border-emerald-500/20 bg-zinc-900/90 text-zinc-100';
	}

	async function copyLogs() {
		if (isCopying) return;
		isCopying = true;
		copyStatus = 'idle';

		try {
			await navigator.clipboard.writeText(formatStartupLogDump(entries, meta));
			copyStatus = 'done';
			startupLog('debug-ui', 'startup log copied', { entryCount: entries.length });
		} catch (error) {
			copyStatus = 'failed';
			startupError('debug-ui', 'failed to copy startup log', error);
		} finally {
			isCopying = false;
		}
	}

	function clearLogs() {
		clearStartupLog();
		startupLog('debug-ui', 'startup log cleared');
	}

	onMount(() => {
		startupLog('debug-ui', 'startup log viewer mounted');
		sync(getStartupLogEntries(), getStartupLogMeta());
		return subscribeToStartupLog(sync);
	});
</script>

<button
	class="fixed right-4 bottom-4 z-40 rounded-full border border-emerald-400/40 bg-black/85 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-emerald-300 shadow-lg shadow-black/40 backdrop-blur"
	onclick={() => {
		isOpen = !isOpen;
		startupLog('debug-ui', isOpen ? 'startup log viewer opened' : 'startup log viewer closed');
	}}
	type="button"
>
	Logs {meta.entryCount}
</button>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/85 p-3 text-zinc-100 backdrop-blur-sm">
		<div
			class="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-zinc-700 bg-zinc-950/95 shadow-2xl shadow-black/60"
		>
			<div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4">
				<div>
					<p class="text-sm font-semibold tracking-[0.2em] text-emerald-300">Startup Trace</p>
					<p class="text-xs text-zinc-400">
						Start {meta.startedAtIso ?? 'unknown'} • {meta.entryCount} entries
					</p>
				</div>

				<div class="flex items-center gap-2 text-xs font-semibold">
					<button
						class="rounded-full border border-zinc-700 px-3 py-2 text-zinc-300"
						onclick={copyLogs}
						type="button"
					>
						{#if copyStatus === 'done'}
							Copied
						{:else if copyStatus === 'failed'}
							Copy failed
						{:else if isCopying}
							Copying
						{:else}
							Copy
						{/if}
					</button>
					<button
						class="rounded-full border border-zinc-700 px-3 py-2 text-zinc-300"
						onclick={clearLogs}
						type="button"
					>
						Clear
					</button>
					<button
						class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-200"
						onclick={() => {
							isOpen = false;
							startupLog('debug-ui', 'startup log viewer closed');
						}}
						type="button"
					>
						Close
					</button>
				</div>
			</div>

			<div class="overflow-y-auto px-3 py-3">
				{#if entries.length === 0}
					<p
						class="rounded-3xl border border-zinc-800 bg-zinc-900/70 px-4 py-6 text-sm text-zinc-400"
					>
						No startup logs recorded yet.
					</p>
				{:else}
					<div class="flex flex-col gap-3">
						{#each entries as entry (entry.id)}
							<div class={`rounded-3xl border px-4 py-3 ${levelClass(entry.level)}`}>
								<div class="flex flex-wrap items-center justify-between gap-2">
									<p class="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase">
										{entry.source}
									</p>
									<p class="font-mono text-xs text-zinc-400">+{entry.sinceStartMs}ms</p>
								</div>
								<p class="mt-2 text-sm font-medium">{entry.message}</p>
								{#if entry.details !== undefined}
									<pre
										class="mt-3 overflow-x-auto rounded-2xl bg-black/30 p-3 text-xs leading-5 whitespace-pre-wrap text-zinc-300">{formatStartupLogDetails(
											entry.details
										)}</pre>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
