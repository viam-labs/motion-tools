<script lang="ts">
	import { T } from '@threlte/core'
	import { type Snippet } from 'svelte'
	import { Edges, meshBounds } from '@threlte/extras'
	import { BufferAttribute, DoubleSide, FrontSide, Mesh, Object3D } from 'three'
	import { CapsuleGeometry } from '$lib/three/CapsuleGeometry'
	import { poseToObject3d } from '$lib/transform'
	import { darkenColor } from '$lib/color'
	import AxesHelper from './AxesHelper.svelte'
	import type { WorldObject } from '$lib/WorldObject'
	import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
	import { Line2, LineMaterial } from 'three/examples/jsm/Addons.js'
	import { useObjectProps } from '$lib/hooks/useObjectProps.svelte'

	const plyLoader = new PLYLoader()

	interface Props {
		object: WorldObject
		children?: Snippet<[{ ref: Object3D }]>
	}

	let { object, children }: Props = $props()

	const type = $derived(object.geometry?.case)
	const mesh = $derived.by(() => {
		const object3d =
			type === undefined ? new Object3D() : type === 'line' ? new Line2() : new Mesh()

		if (type === 'mesh' || type === 'points' || type === 'line') {
			object3d.raycast = meshBounds
		}

		return object3d
	})

	const objectProps = useObjectProps(() => object.uuid)
	const pose = $derived(object.pose)

	$effect.pre(() => {
		poseToObject3d(pose, mesh)
	})
</script>

<T
	is={mesh}
	name={object.name}
	{...objectProps}
>
	{#if object.geometry?.case === 'mesh'}
		{@const geometry = plyLoader.parse(atob(object.geometry.value.mesh as unknown as string))}
		<T is={geometry} />
	{:else if object.geometry?.case === 'line'}
		{@const array = object.geometry.value}
		<T.BufferGeometry
			oncreate={(ref) => {
				ref.setAttribute('position', new BufferAttribute(array, 3))
			}}
		/>
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
</T>
