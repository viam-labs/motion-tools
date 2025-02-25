<script lang="ts">
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'

	let stack = $state<string[]>([])

	const frames = useFrames()
	const pcds = usePointClouds()
	const geometries = useGeometries()

	const addToStack = (name: string, items: typeof frames | typeof pcds) => {
		const now = new Date()
		const time = Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		}).format(now)
		const ms = now.getMilliseconds().toString().padStart(3, '0')
		const timestamp = `${time}:${ms}`

		if (items.fetching) {
			stack.push(`${timestamp} - fetching ${name}...`)
		} else if (items.error) {
			stack.push(`${timestamp} - ${name} error: ${items.error.name}`)
		} else if (items.current.length > 0) {
			stack.push(`${timestamp} - loaded ${name}`)
		} else {
			stack.push(`${timestamp} - no ${name}`)
		}
	}

	$effect(() => addToStack('frames', frames))
	$effect(() => addToStack('geometries', geometries))
	$effect(() => addToStack('pointclouds', pcds))
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

	<ul class="text-xs">
		{#each stack as stackitem (stackitem)}
			<li>{stackitem}</li>
		{/each}
	</ul>
</div>
