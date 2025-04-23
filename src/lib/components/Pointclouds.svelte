<script lang="ts">
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const pointclouds = usePointClouds()
</script>

{#each pointclouds.current as points (points.uuid)}
	<Pointcloud {points} />
{/each}
