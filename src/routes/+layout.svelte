<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import StartupLogViewer from '$lib/components/StartupLogViewer.svelte';
	import { startupLog } from '$lib/debug/startup-log';

	let { children } = $props();

	startupLog('layout', 'root layout evaluated');

	onMount(() => {
		startupLog('layout', 'root layout mounted');
		requestAnimationFrame(() => {
			startupLog('layout', 'first animation frame after layout mount');
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
<StartupLogViewer />
