<script lang="ts">
	import { T } from '@threlte/core'
	import Portal from './Portal/Portal.svelte'
	import PortalTarget from './Portal/PortalTarget.svelte'
	import { useShapes } from '$lib/hooks/useShapes.svelte'
	import Pointcloud from './Pointcloud.svelte'
	import { Edges } from '@threlte/extras'
	import { darkenColor } from '$lib/color'
	import Clickable from './Clickable.svelte'

	const shapes = useShapes()
</script>

{#each shapes.current as mesh (mesh.uuid)}
	<Portal id={mesh.userData.parent}>
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

			<PortalTarget id={mesh.name} />
		</Clickable>
	</Portal>
{/each}

{#each shapes.points as points (points.uuid)}
	<Pointcloud {points} />
{/each}

{#each shapes.meshes as mesh (mesh.uuid)}
	<Portal id={mesh.userData.parent}>
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

			<PortalTarget id={mesh.name} />
		</Clickable>
	</Portal>
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

{#each shapes.models as model (model.uuid)}
	<Clickable
		name={model.name}
		object={model}
	>
		<PortalTarget id={model.name} />
	</Clickable>
{/each}
