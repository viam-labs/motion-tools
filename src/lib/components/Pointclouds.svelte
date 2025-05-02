<script lang="ts">
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import { useShapes } from '$lib/hooks/useShapes.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const queries = usePointClouds()
	const shapes = useShapes()
</script>

{#each queries.current as query}
	{#if query.data}
		<Pointcloud object={query.data} />
	{/if}
{/each}

{#each shapes.points as object}
	<Pointcloud {object} />
{/each}
