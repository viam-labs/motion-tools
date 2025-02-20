<script lang="ts">
	import { T } from '@threlte/core'
	import { Billboard, Portal, PortalTarget } from '@threlte/extras'
	import { Root, Text } from 'threlte-uikit'
	import type { Frame } from '$lib/hooks/useFrames.svelte'
	import type { Snippet } from 'svelte'
	import { OrientationVector } from '@viamrobotics/three'
	import { Mesh } from 'three'

	interface Props {
		frame: Frame
		children?: Snippet
	}

	let { frame, children }: Props = $props()

	let hovering = $state(false)

	const mesh = new Mesh()

	const ov = new OrientationVector()
	$effect.pre(() => {
		ov.set(frame.pose.oX, frame.pose.oY, frame.pose.oZ, frame.pose.theta)
		ov.toQuaternion(mesh.quaternion)
	})
</script>

<Portal id={frame.parent}>
	<T
		is={mesh}
		position.x={frame.pose.x * 0.001}
		position.y={frame.pose.y * 0.001}
		position.z={frame.pose.z * 0.001}
		onpointerenter={() => (hovering = true)}
		onpointerleave={() => (hovering = false)}
	>
		{#if frame.physicalObject.geometryType.case === 'box'}
			{@const dimsMm = frame.physicalObject.geometryType.value.dimsMm ?? { x: 0, y: 0, z: 0 }}
			<T.BoxGeometry args={[dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001]} />
		{:else if frame.physicalObject.geometryType.case === 'sphere'}
			{@const radiusMm = frame.physicalObject.geometryType.value.radiusMm ?? 0}
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
						text={frame.name}
					/>
				</Root>
			</Billboard>
		{/if}

		<PortalTarget id={frame.name} />

		{@render children?.()}
	</T>
</Portal>
