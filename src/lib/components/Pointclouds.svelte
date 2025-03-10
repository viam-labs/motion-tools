<script lang="ts">
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const pcds = usePointClouds()
</script>

{#each pcds.current as points (points?.uuid)}
	<Pointcloud {points} />
{/each}
