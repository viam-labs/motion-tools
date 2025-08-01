<script lang="ts">
	import { Portal } from './portal'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import { useDrawAPI } from '$lib/hooks/useDrawAPI.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const points = usePointClouds()
	const drawAPI = useDrawAPI()
</script>

{#each points.current as object (object.uuid)}
	<Portal id={object.referenceFrame}>
		<Pointcloud {object} />
	</Portal>
{/each}

{#each drawAPI.points as object (object.uuid)}
	<Portal id={object.referenceFrame}>
		<Pointcloud {object} />
	</Portal>
{/each}
