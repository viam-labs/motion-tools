<script lang="ts">
	import { T } from '@threlte/core'
	import { Fullscreen, Text } from 'threlte-uikit'
	import type { Snippet } from 'svelte'
	import { Billboard, useCursor, useViewport } from '@threlte/extras'
	import { OrientationVector } from '@viamrobotics/three'
	import { MathUtils, Mesh } from 'three'
	import type { Geometry, Pose } from '@viamrobotics/sdk'
	import { CapsuleGeometry } from '$lib/CapsuleGeometry'
	import { useFocus, useSelection } from '$lib/hooks/useSelection.svelte'
	import Portal from './portal/Portal.svelte'
	import PortalTarget from './portal/PortalTarget.svelte'

	interface Props {
		name: string
		parent: string
		geometry: Geometry
		pose: Pose
		children?: Snippet
	}

	let { name, pose, geometry, parent, children }: Props = $props()

	const viewport = useViewport()
	const { onPointerEnter, onPointerLeave } = useCursor()
	const selection = useSelection()
	const focus = useFocus()

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
		{name}
		onpointerenter={(event) => {
			event.stopPropagation()
			hovering = true
			onPointerEnter()
		}}
		onpointerleave={(event) => {
			event.stopPropagation()
			hovering = false
			onPointerLeave()
		}}
		onpointermissed={() => {
			selection.set(undefined)
		}}
		ondblclick={(event) => {
			event.stopPropagation()
			focus.set(mesh)
		}}
		onclick={(event) => {
			event.stopPropagation()
			selection.set(mesh)
		}}
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
				oncreate={(ref) => void ref.rotateX(-Math.PI / 2)}
			/>
		{:else}
			<T.OctahedronGeometry args={[0.1]} />
		{/if}
		<T.MeshToonMaterial
			color="red"
			transparent
			opacity={0.7}
		/>

		{#if hovering}
			<Fullscreen>
				<Text
					fontSize={12}
					text={name}
				/>
			</Fullscreen>
			<Billboard position.z={0.2}></Billboard>
		{/if}

		<PortalTarget id={name} />

		{@render children?.()}
	</T>
</Portal>
