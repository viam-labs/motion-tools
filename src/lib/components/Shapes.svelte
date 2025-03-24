<script lang="ts">
	import { T } from '@threlte/core'
	import { useShapes } from '$lib/hooks/useWebsocketClient.svelte'
	import Frame from './Frame.svelte'
	import Pointcloud from './Pointcloud.svelte'
	import { Edges } from '@threlte/extras'
	import { darkenColor } from '$lib/color'
	import Clickable from './Clickable.svelte'

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

{#each shapes.meshes as mesh (mesh.uuid)}
	<Clickable
		name={mesh.name}
		object={mesh}
	>
		<Edges
			raycast={() => null}
			thresholdAngle={0}
			color={darkenColor(mesh.material.color, 10)}
			renderOrder={-1}
		/>
	</Clickable>
{/each}
