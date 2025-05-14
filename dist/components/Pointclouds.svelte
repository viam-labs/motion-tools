<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { usePointClouds } from '../hooks/usePointclouds.svelte'
	import { useShapes } from '../hooks/useShapes.svelte'
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
