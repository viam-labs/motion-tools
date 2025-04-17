<script lang="ts">
	import { T } from '@threlte/core'
	import { useShapes } from '$lib/hooks/useShapes.svelte'
	import Pointcloud from './Pointcloud.svelte'
	import { Edges } from '@threlte/extras'
	import { darkenColor } from '$lib/color'
	import Clickable from './Clickable.svelte'

	const shapes = useShapes()
</script>

{#each shapes.current as mesh}
	<Clickable
		name={mesh.name}
		object={mesh}
	>
		<Edges
			raycast={() => null}
			thresholdAngle={0}
			color={darkenColor(mesh.userData.color, 10)}
			renderOrder={-1}
		/>

		<T.MeshToonMaterial
			color={mesh.userData.color}
			transparent
			opacity={0.7}
		/>
	</Clickable>
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

{#each shapes.poses as pose (pose.uuid)}
	<T
		name={pose.name}
		is={pose}
	/>
{/each}

{#each shapes.nurbs as nurbs (nurbs.uuid)}
	<Clickable
		name={nurbs.name}
		object={nurbs}
	/>
{/each}
