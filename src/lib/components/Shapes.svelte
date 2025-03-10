<script lang="ts">
	import { T } from '@threlte/core'
	import { useShapes } from '$lib/hooks/useWebsocketClient.svelte'
	import Frame from './Frame.svelte'
	import Pointcloud from './Pointcloud.svelte'

	const shapes = useShapes()
</script>

{#each shapes.current as shape}
	<Frame
		name={shape.name}
		geometry={shape.geometry}
		pose={shape.pose}
		color="purple"
	/>
{/each}

{#each shapes.points as points (points.uuid)}
	<Pointcloud {points} />
{/each}
