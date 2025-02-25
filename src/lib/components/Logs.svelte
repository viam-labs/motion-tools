<script lang="ts">
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'

	const frames = useFrames()
	const pcds = usePointClouds()
	const geometries = useGeometries()
</script>

<div class="fixed right-0 bottom-0 bg-gray-100 p-2">
	{#snippet state(name: string, item: typeof frames | typeof geometries | typeof pcds)}
		{#if item.fetching}
			fetching {name}
		{:else if item.error}
			error fetching {name}: {item.error.message}
		{:else}
			loaded {name}
		{/if}
	{/snippet}

	<ul>
		<li>{@render state('frames', frames)}</li>
		<li>{@render state('pcds', pcds)}</li>
		<li>{@render state('geometries', geometries)}</li>
	</ul>
</div>
