<script lang="ts">
	import { T } from '@threlte/core'
	import type { Snippet } from 'svelte'
	import { Edges, useCursor } from '@threlte/extras'
	import { Mesh, type ColorRepresentation } from 'three'
	import type { Geometry, Pose } from '@viamrobotics/sdk'
	import { CapsuleGeometry } from '$lib/CapsuleGeometry'
	import { useFocus, useSelection } from '$lib/hooks/useSelection.svelte'
	import AxesHelper from './AxesHelper.svelte'
	import { poseToQuaternion, poseToVector3 } from '$lib/transform'
	import { darkenColor } from '$lib/color'
	import { useVisibility } from '$lib/hooks/useVisibility.svelte'

	interface Props {
		name: string
		geometry: Geometry
		pose: Pose
		color?: ColorRepresentation
		children?: Snippet<[{ ref: Mesh }]>
	}

	let { name, pose, geometry, color = 'red', children }: Props = $props()

	const { onPointerEnter, onPointerLeave } = useCursor()
	const selection = useSelection()
	const focus = useFocus()
	const visibility = useVisibility()

	let hovering = $state(false)

	const mesh = new Mesh()

	$effect.pre(() => {
		poseToQuaternion(pose, mesh.quaternion)
	})

	$effect.pre(() => {
		poseToVector3(pose, mesh.position)
	})
</script>

<T
	is={mesh}
	{name}
	visible={visibility.current.get(name)}
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
		focus.set(mesh.name)
	}}
	onclick={(event) => {
		event.stopPropagation()
		selection.set(mesh.name)
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
		/>
	{:else}
		<AxesHelper
			width={5}
			length={0.1}
		/>
	{/if}

	{#if geometry.geometryType.case && name !== selection.current}
		<Edges
			raycast={() => null}
			color={darkenColor(color, 10)}
		/>
	{/if}

	<T.MeshToonMaterial
		{color}
		transparent
		opacity={0.7}
	/>

	{@render children?.({ ref: mesh })}
</T>
