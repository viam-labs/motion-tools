<script lang="ts">
	import { T } from '@threlte/core'
	import { Root, Text } from 'threlte-uikit'
	import type { Snippet } from 'svelte'
	import { Billboard, Portal, PortalTarget } from '@threlte/extras'
	import { OrientationVector } from '@viamrobotics/three'
	import { MathUtils, Mesh } from 'three'
	import type { Geometry, Pose } from '@viamrobotics/sdk'

	interface Props {
		name: string
		parent: string
		geometry: Geometry
		pose: Pose
		children?: Snippet
	}

	let { name, pose, geometry, parent, children }: Props = $props()

	let hovering = $state(false)

	const mesh = new Mesh()

	const ov = new OrientationVector()
	$effect.pre(() => {
		ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
		ov.toQuaternion(mesh.quaternion)
	})

	$effect.pre(() => {
		mesh.position.set(pose.x, pose.y, pose.z).multiplyScalar(0.001)
	})
</script>

<Portal id={parent}>
	<T
		is={mesh}
		onpointerenter={() => (hovering = true)}
		onpointerleave={() => (hovering = false)}
	>
		{#if geometry.geometryType.case === 'box'}
			{@const dimsMm = geometry.geometryType.value.dimsMm ?? { x: 0, y: 0, z: 0 }}
			<T.BoxGeometry args={[dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001]} />
		{:else if geometry.geometryType.case === 'sphere'}
			{@const radiusMm = geometry.geometryType.value.radiusMm ?? 0}
			<T.SphereGeometry args={[radiusMm]} />
		{:else}
			<T.OctahedronGeometry args={[0.1]} />
		{/if}
		<T.MeshToonMaterial
			color="red"
			transparent
			opacity={0.7}
		/>

		{#if hovering}
			<Billboard position.z={0.2}>
				<Root>
					<Text
						fontSize={10}
						text={name}
					/>
				</Root>
			</Billboard>
		{/if}

		<PortalTarget id={name} />

		{@render children?.()}
	</T>
</Portal>
