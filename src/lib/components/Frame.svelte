<script lang="ts">
	import { T } from '@threlte/core'
	import type { Snippet } from 'svelte'
	import { Edges } from '@threlte/extras'
	import { Mesh, Quaternion, Vector3, type ColorRepresentation } from 'three'
	import type { Geometry, Pose } from '@viamrobotics/sdk'
	import { CapsuleGeometry } from '$lib/three/CapsuleGeometry'

	import { poseToQuaternion, poseToVector3 } from '$lib/transform'
	import { darkenColor } from '$lib/color'
	import Clickable from './Clickable.svelte'
	import AxesHelper from './AxesHelper.svelte'

	interface Props {
		name: string
		geometry: Geometry
		pose: Pose
		color?: ColorRepresentation
		children?: Snippet<[{ ref: Mesh }]>
	}

	let { name, pose, geometry, color = 'red', children }: Props = $props()

	const mesh = new Mesh()
	const vec3 = new Vector3()
	const quat = new Quaternion()

	$effect.pre(() => {
		poseToQuaternion(pose, mesh.quaternion)

		// if (geometry.center) {
		// 	poseToQuaternion(geometry.center, quat)
		// 	mesh.quaternion.multiply(quat)
		// }
	})

	$effect.pre(() => {
		poseToVector3(pose, mesh.position)

		// if (geometry.center) {
		// 	poseToVector3(geometry.center, vec3)
		// 	mesh.position.add(vec3)
		// }
	})
</script>

<Clickable
	{name}
	object={mesh}
>
	{#if geometry.geometryType.case === 'box'}
		{@const dimsMm = geometry.geometryType.value.dimsMm ?? { x: 0, y: 0, z: 0 }}
		<T.BoxGeometry args={[dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001]} />
	{:else if geometry.geometryType.case === 'sphere'}
		{@const radiusMm = geometry.geometryType.value.radiusMm ?? 0}
		<T.SphereGeometry args={[radiusMm * 0.001]} />
	{:else if geometry.geometryType.case === 'capsule'}
		{@const { lengthMm, radiusMm } = geometry.geometryType.value}
		<T
			is={CapsuleGeometry}
			args={[radiusMm * 0.001, lengthMm * 0.001]}
		/>
	{:else}
		<AxesHelper
			width={5}
			length={0.1}
		/>
	{/if}

	{#if geometry.geometryType.case}
		<Edges
			raycast={() => null}
			color={darkenColor(color, 10)}
			renderOrder={-1}
		/>
	{/if}

	<T.MeshToonMaterial
		{color}
		transparent
		opacity={0.7}
	/>

	{@render children?.({ ref: mesh })}
</Clickable>
