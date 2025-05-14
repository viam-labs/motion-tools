<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
	import { useShapes } from '$lib/hooks/useShapes.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const points = usePointClouds()
	const shapes = useShapes()
</script>

{#each points.current as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Pointcloud {object} />
	</Portal>
{/each}

{#each shapes.points as object (object.name)}
	<Portal id={object.referenceFrame}>
		<Pointcloud {object} />
	</Portal>
{/each}
