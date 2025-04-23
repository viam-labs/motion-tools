<script lang="ts">
	import { useFrames } from '$lib/hooks/useFrames.svelte'
	import { useGeometries } from '$lib/hooks/useGeometries.svelte'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'

	let stack = $state.raw<string[]>([])

	const frames = useFrames()
	const pcds = usePointClouds()
	const geometries = useGeometries()

	const createLog = (name: string, fetching: boolean, error: Error | undefined, current: any[]) => {
		const now = new Date()
		const time = Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		}).format(now)
		const ms = now.getMilliseconds().toString().padStart(3, '0')
		const timestamp = `${time}:${ms}`

		if (fetching) {
			return `${timestamp} - fetching ${name}...`
		} else if (error) {
			return `${timestamp} - ${name} error: ${error.name}`
		} else if (current.length > 0) {
			return `${timestamp} - loaded ${name}`
		} else {
			return `${timestamp} - no ${name}`
		}
	}

	// $effect(() => {
	// 	console.log('hi')
	// 	const log = createLog('frames', frames.fetching, frames.error, frames.current)
	// 	stack = [...stack, log]
	// })
	// $effect(() => {
	// 	geometries.current
	// 	geometries.error
	// 	geometries.fetching
	// 	addToStack('geometries', geometries)
	// })
	// $effect(() => {
	// 	pcds.current
	// 	pcds.error
	// 	pcds.fetching
	// 	addToStack('pointclouds', pcds)
	// })
</script>

<div class="fixed right-0 bottom-0 bg-gray-100 p-2">
	<ul class="text-xs">
		{#each stack as stackitem}
			<li>{stackitem}</li>
		{/each}
	</ul>
</div>
