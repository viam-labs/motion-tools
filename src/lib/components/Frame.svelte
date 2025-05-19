<script lang="ts">
	import { T } from '@threlte/core'
	import { type Snippet } from 'svelte'
	import { Edges, meshBounds, MeshLineGeometry, MeshLineMaterial } from '@threlte/extras'
	import { DoubleSide, FrontSide, Mesh, Object3D } from 'three'
	import { CapsuleGeometry } from '$lib/three/CapsuleGeometry'
	import { poseToObject3d } from '$lib/transform'
	import { darkenColor } from '$lib/color'
	import AxesHelper from './AxesHelper.svelte'
	import type { WorldObject } from '$lib/WorldObject'
	import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
	import { useObjectEvents } from '$lib/hooks/useObjectEvents.svelte'

	const plyLoader = new PLYLoader()

	interface Props {
		uuid: string
		name: string
		geometry?: WorldObject['geometry']
		pose: WorldObject['pose']
		metadata: WorldObject['metadata']
		children?: Snippet<[{ ref: Object3D }]>
	}

	let { uuid, name, geometry, metadata, pose, children }: Props = $props()

	const type = $derived(geometry?.case)
	const mesh = $derived.by(() => {
		const object3d = type === undefined ? new Object3D() : new Mesh()

		if (type === 'mesh' || type === 'points' || type === 'line') {
			object3d.raycast = meshBounds
		}

		return object3d
	})

	$effect.pre(() => {
		poseToObject3d(pose, mesh)
	})

	const events = useObjectEvents(() => uuid)
</script>

<T
	is={mesh}
	{name}
	{uuid}
	{...events}
>
	{#if geometry?.case === 'mesh'}
		{@const meshGeometry = plyLoader.parse(atob(geometry.value.mesh as unknown as string))}
		<T is={meshGeometry} />
	{:else if geometry?.case === 'line' && metadata.points}
		<MeshLineGeometry points={metadata.points} />
	{:else if geometry?.case === 'box'}
		{@const dimsMm = geometry.value.dimsMm ?? { x: 0, y: 0, z: 0 }}
		<T.BoxGeometry args={[dimsMm.x * 0.001, dimsMm.y * 0.001, dimsMm.z * 0.001]} />
	{:else if geometry?.case === 'sphere'}
		{@const radiusMm = geometry.value.radiusMm ?? 0}
		<T.SphereGeometry args={[radiusMm * 0.001]} />
	{:else if geometry?.case === 'capsule'}
		{@const { lengthMm, radiusMm } = geometry.value}
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

	{#if geometry?.case === 'line'}
		<MeshLineMaterial
			color={metadata.color ?? 'red'}
			width={0.005}
		/>
	{:else if geometry}
		<T.MeshToonMaterial
			color={metadata.color ?? 'red'}
			side={geometry.case === 'mesh' ? DoubleSide : FrontSide}
			transparent
			opacity={0.7}
		/>

		<Edges
			raycast={() => null}
			color={darkenColor(metadata.color ?? 'red', 10)}
			renderOrder={-1}
		/>
	{/if}

	{@render children?.({ ref: mesh })}
</T>
