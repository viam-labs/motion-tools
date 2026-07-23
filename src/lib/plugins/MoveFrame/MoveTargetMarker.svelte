<script lang="ts">
	import { T } from '@threlte/core'
	import { MeshLineGeometry, MeshLineMaterial } from '@threlte/extras'
	import { Vector3 } from 'three'

	interface Props {
		point: Vector3
		worldNormal?: Vector3
		standoff: number
	}

	const { point, worldNormal, standoff }: Props = $props()

	const MARKER_COLOR = '#37a06f'
	const worldUp = new Vector3(0, 0, 1)

	const goal = $derived(
		point.clone().addScaledVector((worldNormal ?? worldUp).clone().normalize(), standoff / 1000)
	)
</script>

<!-- The clicked surface point. -->
<T.Mesh
	position={point.toArray()}
	raycast={() => null}
	bvh={{ enabled: false }}
	renderOrder={1}
>
	<T.SphereGeometry args={[0.006]} />
	<T.MeshBasicMaterial
		color={MARKER_COLOR}
		depthTest={false}
		transparent
		opacity={0.4}
	/>
</T.Mesh>

{#if standoff > 0}
	<!-- The standoff, from the surface up along the normal to the goal. -->
	<T.Mesh
		raycast={() => null}
		bvh={{ enabled: false }}
		renderOrder={1}
	>
		<MeshLineGeometry points={[point, goal]} />
		<MeshLineMaterial
			width={2}
			color={MARKER_COLOR}
			depthTest={false}
			attenuate={false}
			transparent
			opacity={0.6}
		/>
	</T.Mesh>
{/if}

<!-- The goal the tool will move to. -->
<T.Mesh
	position={goal.toArray()}
	raycast={() => null}
	bvh={{ enabled: false }}
	renderOrder={1}
>
	<T.SphereGeometry args={[0.01]} />
	<T.MeshBasicMaterial
		color={MARKER_COLOR}
		depthTest={false}
		transparent
		opacity={0.9}
	/>
</T.Mesh>
