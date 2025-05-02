<script lang="ts">
	import { T } from '@threlte/core'
	import type { Snippet } from 'svelte'
	import { Edges, meshBounds } from '@threlte/extras'
	import { BufferAttribute, DoubleSide, FrontSide, Mesh } from 'three'
	import { CapsuleGeometry } from '$lib/three/CapsuleGeometry'
	import { poseToQuaternion, poseToVector3 } from '$lib/transform'
	import { darkenColor } from '$lib/color'
	import Clickable from './Clickable.svelte'
	import AxesHelper from './AxesHelper.svelte'
	import type { WorldObject } from '$lib/WorldObject'
	import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
	import { Line2, LineMaterial } from 'three/examples/jsm/Addons.js'

	const plyLoader = new PLYLoader()

	interface Props {
		object: WorldObject
		children?: Snippet<[{ ref: Mesh }]>
	}

	let { object, children }: Props = $props()

	const mesh = object.geometry?.case === 'line' ? new Line2() : new Mesh()

	if (object.geometry?.case === 'mesh') {
		mesh.raycast = meshBounds
	}

	$effect.pre(() => {
		poseToQuaternion(object.pose, mesh.quaternion)
	})

	$effect.pre(() => {
		poseToVector3(object.pose, mesh.position)
	})
</script>

<Clickable
	name={object.name}
	object={mesh}
>
	{#if object.geometry?.case === 'mesh'}
		{@const geometry = plyLoader.parse(atob(object.geometry.value.mesh as unknown as string))}
		<T is={geometry} />
	{:else if object.geometry?.case === 'line'}
		<T.BufferGeometry>
			<T.BufferAttribute args={[object.geometry.value, 3]} />
		</T.BufferGeometry>
	{:else if object.geometry?.case === 'box'}
		{@const dimsMm = object.geometry.value.dimsMm ?? { x: 0, y: 0, z: 0 }}
		<T.BoxGeometry args={[dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001]} />
	{:else if object.geometry?.case === 'sphere'}
		{@const radiusMm = object.geometry.value.radiusMm ?? 0}
		<T.SphereGeometry args={[radiusMm * 0.001]} />
	{:else if object.geometry?.case === 'capsule'}
		{@const { lengthMm, radiusMm } = object.geometry.value}
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

	{#if object.geometry?.case === 'line'}
		<T
			is={LineMaterial}
			color={object.metadata.color ?? 'red'}
		/>
	{:else if object.geometry}
		<T.MeshToonMaterial
			color={object.metadata.color ?? 'red'}
			side={object.geometry.case === 'mesh' ? DoubleSide : FrontSide}
			transparent
			opacity={0.7}
		/>

		<Edges
			raycast={() => null}
			color={darkenColor(object.metadata.color ?? 'red', 10)}
			renderOrder={-1}
		/>
	{/if}

	{@render children?.({ ref: mesh })}
</Clickable>
