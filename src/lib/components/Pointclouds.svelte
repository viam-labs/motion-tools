<script lang="ts">
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const queries = usePointClouds()
</script>

{#each queries.current as query}
	{#if query.data}
		<Pointcloud points={query.data} />
	{/if}
{/each}
