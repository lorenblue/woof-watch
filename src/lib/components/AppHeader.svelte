<script lang="ts">
	type NavLink = {
		href: string;
		label: string;
	};

	type Props = {
		actorName: string | null;
		navLink?: NavLink;
	};

	let { actorName, navLink }: Props = $props();
</script>

<header class="px-5 pt-6 pb-3">
	<div class="flex items-baseline justify-between gap-3">
		<h1 class="text-2xl font-bold tracking-tight">Woof Watch</h1>

		<div class="flex items-center gap-3">
			{#if actorName}
				<span class="text-xs font-medium text-emerald-400">Linked as {actorName}</span>
			{/if}

			{#if navLink}
				<a
					href={navLink.href}
					class="rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
				>
					{navLink.label}
				</a>
			{/if}
		</div>
	</div>
</header>
